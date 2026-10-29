import { randomBytes } from "node:crypto";
import { CALL, CALL_INSTRUCTIONS, fillTemplate } from "@rengas/shared";
import { ApiProblem } from "../errors.ts";
import type { ProviderCredentials as Credentials } from "../key-checks.ts";
import type { KeyVault } from "../keys.ts";
import type { ChannelAdapter, RunContext, StepBody } from "../runs/adapters.ts";
import { CallBridge } from "./bridge.ts";
import type { ConnectRealtime, Wire } from "./realtime.ts";
import { isValidTwilioSignature, type TwilioCalls } from "./twilio.ts";

export interface CallTiming {
  /** How long Sisu may talk once the call is answered. */
  capMs: number;
  /** How long before the cap Sisu is told to say goodbye. */
  nudgeBeforeCapMs: number;
  /** When Twilio still hasn't reported the call's end, the run gives up. */
  giveUpMs: number;
}

const DEFAULT_TIMING: CallTiming = {
  capMs: CALL.maxSeconds * 1000,
  nudgeBeforeCapMs: 10_000,
  // 30 s of ringing, the cap, and a minute of slack.
  giveUpMs: (30 + CALL.maxSeconds + 60) * 1000,
};

/** Seconds Twilio's own time limit allows beyond the server's cap, in case our hangup fails. */
const TWILIO_LIMIT_SLACK_SECONDS = 15;

const ENDED = new Set(["completed", "busy", "no-answer", "canceled", "failed"]);

export interface VoiceCallsOptions {
  /** PUBLIC_BASE_URL: where Twilio reaches this server, through a tunnel in development. */
  publicBaseUrl: string;
  /** TWILIO_FROM_NUMBER: the Twilio number the call comes from. */
  fromNumber: string;
  keyVault: KeyVault;
  twilio: TwilioCalls;
  connectRealtime: ConnectRealtime;
  timing?: Partial<CallTiming>;
}

/** What the media-stream WebSocket hands to an attached call. */
export interface MediaHandlers {
  message(text: string): void;
  close(): void;
}

export type StatusResult = "ok" | "unknown-call" | "bad-signature";

/** "1 min 05 s" or "42 s". */
export const formatDuration = (seconds: number) =>
  seconds < 60
    ? `${seconds} s`
    : `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")} s`;

/**
 * The real AI robocall (register decision voice-call-approach), as the voice
 * channel's adapter. A run places a Twilio call to the confirmed phone. When it
 * is answered, Twilio opens our media-stream WebSocket and the bridge links it
 * to gpt-realtime. The server hangs up at the cap, when Sisu ends the call, or
 * on De-escalate. Each call has its own unguessable token in its webhook
 * addresses, and only lives as long as its run.
 */
export class VoiceCalls implements ChannelAdapter {
  readonly #calls = new Map<string, LiveCall>();
  readonly #options: VoiceCallsOptions;
  readonly #timing: CallTiming;
  readonly #base: string;

  constructor(options: VoiceCallsOptions) {
    this.#options = options;
    this.#timing = { ...DEFAULT_TIMING, ...options.timing };
    this.#base = options.publicBaseUrl.replace(/\/+$/, "");
  }

  statusUrl(token: string): string {
    return `${this.#base}/twilio/status/${token}`;
  }

  /** Whether the Twilio account is a trial, for the call preview's notice. */
  async isTrial(sessionId: string): Promise<boolean> {
    const twilio = this.#options.keyVault.credentials(sessionId, "twilio");
    return twilio ? this.#options.twilio.isTrial(twilio) : false;
  }

  async run(ctx: RunContext): Promise<void> {
    const { action, send, sessionId, signal, values } = ctx;
    const { keyVault } = this.#options;
    const twilio = keyVault.credentials(sessionId, "twilio");
    const openai = keyVault.credentials(sessionId, "openai");
    if (action.mode !== "real-capable" || !send || !twilio || !openai) {
      throw new Error("A real call needs a confirmed preview and both keys.");
    }
    const [callingLine, endedLine] = action.realLines as [string, string];

    await ctx.pause();
    ctx.emit({
      type: "step",
      text: fillTemplate(callingLine, values),
      invented: false,
    });

    const token = randomBytes(24).toString("base64url");
    const call = new LiveCall({
      twilio,
      openaiKey: openai.apiKey,
      instructions: fillTemplate(CALL_INSTRUCTIONS, values),
      timing: this.#timing,
      calls: this.#options.twilio,
      connectRealtime: this.#options.connectRealtime,
      // De-escalate stops the run's events, and nothing late gets out.
      emit: (body) => {
        if (!signal.aborted) ctx.emit(body);
      },
    });
    this.#calls.set(token, call);
    const cancel = () => call.cancel(signal.reason);
    signal.addEventListener("abort", cancel, { once: true });
    try {
      const callSid = await this.#options.twilio
        .place(twilio, {
          to: send.recipient.address,
          from: this.#options.fromNumber,
          streamUrl: `${this.#base.replace(/^http/, "ws")}/twilio/media/${token}`,
          statusUrl: this.statusUrl(token),
          timeLimitSeconds: CALL.maxSeconds + TWILIO_LIMIT_SLACK_SECONDS,
        })
        .catch((error: unknown) => {
          // Show Twilio's reason, such as a trial account's unverified number.
          if (error instanceof ApiProblem && !signal.aborted) {
            ctx.emit({
              type: "provider-status",
              provider: "twilio",
              status: "refused",
              text: error.message,
            });
          }
          throw error;
        });
      send.markSent(callSid);
      call.placed(callSid);
      const { answered, seconds } = await call.ended;
      if (answered) {
        await ctx.pause();
        ctx.emit({
          type: "step",
          text: fillTemplate(endedLine, {
            ...values,
            duration: formatDuration(seconds),
          }),
          invented: false,
        });
      }
    } finally {
      signal.removeEventListener("abort", cancel);
      this.#calls.delete(token);
      call.close();
    }
  }

  /**
   * A status callback from Twilio. It must carry Twilio's signature for the
   * call's account, over exactly the address we gave Twilio.
   */
  status(
    token: string,
    params: Record<string, string>,
    signature: string | undefined,
  ): StatusResult {
    const call = this.#calls.get(token);
    if (!call) return "unknown-call";
    const valid = isValidTwilioSignature(
      call.authToken,
      this.statusUrl(token),
      params,
      signature,
    );
    if (!valid) return "bad-signature";
    call.status(params.CallStatus ?? "", Number(params.CallDuration));
    return "ok";
  }

  /** Whether a media stream may attach: the call exists and has no stream yet. */
  canAttach(token: string): boolean {
    return this.#calls.get(token)?.awaitingMedia ?? false;
  }

  /** Attaches Twilio's media stream to its call and starts the bridge. */
  attach(token: string, twilio: Wire): MediaHandlers | null {
    const call = this.#calls.get(token);
    return call?.awaitingMedia ? call.attach(twilio) : null;
  }
}

interface CallResult {
  answered: boolean;
  seconds: number;
}

interface LiveCallOptions {
  twilio: Credentials["twilio"];
  openaiKey: string;
  instructions: string;
  timing: CallTiming;
  calls: TwilioCalls;
  connectRealtime: ConnectRealtime;
  emit(body: StepBody): void;
}

/** One call from dialling to hangup. */
class LiveCall {
  readonly ended: Promise<CallResult>;
  readonly #options: LiveCallOptions;
  readonly #timers: NodeJS.Timeout[] = [];
  readonly #statuses = new Set<string>();
  #resolve!: (result: CallResult) => void;
  #reject!: (error: unknown) => void;
  #callSid: string | null = null;
  #answeredAt: number | null = null;
  #hungUp = false;
  #mediaClosed = false;
  /** The run's result is settled; nothing more is logged. */
  #over = false;
  #failure: Error | null = null;
  #twilioWire: Wire | null = null;
  #openai: Wire | null = null;
  #bridge: CallBridge | null = null;

  constructor(options: LiveCallOptions) {
    this.#options = options;
    this.ended = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
    // Unhandled until run() awaits it after placing the call.
    this.ended.catch(() => {});
    this.#later(options.timing.giveUpMs, () => {
      this.#hangUp();
      this.#fail(
        new Error(
          "Twilio never reported the end of the call. Check that PUBLIC_BASE_URL reaches this server.",
        ),
      );
    });
  }

  get authToken(): string {
    return this.#options.twilio.authToken;
  }

  get awaitingMedia(): boolean {
    return !this.#over && this.#twilioWire === null;
  }

  placed(callSid: string): void {
    this.#callSid = callSid;
    // De-escalate arrived while Twilio was placing the call.
    if (this.#over) this.#hangUp();
  }

  status(status: string, durationSeconds: number): void {
    if (this.#over || this.#statuses.has(status)) return;
    this.#statuses.add(status);
    this.#options.emit({
      type: "provider-status",
      provider: "twilio",
      status,
      text:
        CALL.statuses[status as keyof typeof CALL.statuses] ??
        `📞 Twilio: ${status}`,
    });
    if (status === "in-progress") this.#answered();
    if (!ENDED.has(status)) return;
    if (status === "failed") {
      this.#fail(new Error("Twilio could not place the call."));
    } else if (this.#failure) {
      this.#fail(this.#failure);
    } else {
      const answered = this.#answeredAt !== null;
      const seconds =
        durationSeconds > 0
          ? durationSeconds
          : answered
            ? Math.round((Date.now() - this.#answeredAt!) / 1000)
            : 0;
      this.#finish({ answered, seconds });
    }
  }

  attach(twilio: Wire): MediaHandlers {
    this.#twilioWire = twilio;
    this.#answered();
    const { emit } = this.#options;
    const bridge = new CallBridge(twilio, {
      transcript: (speaker, text) =>
        emit({ type: "transcript", speaker, text }),
      endCall: () => {
        emit({ type: "step", text: CALL.sisuHangsUp, invented: false });
        this.#hangUp();
      },
      openaiError: (message) =>
        emit({
          type: "provider-status",
          provider: "openai",
          status: "error",
          text: `OpenAI: ${message}`,
        }),
    });
    this.#bridge = bridge;
    const openai = this.#options.connectRealtime(this.#options.openaiKey, {
      open: () => bridge.start(openai, this.#options.instructions),
      message: (text) => bridge.fromOpenAI(text),
      close: () => {
        if (this.#over || this.#mediaClosed) return;
        this.#failure = new Error(
          "The OpenAI Realtime socket closed mid-call.",
        );
        emit({
          type: "provider-status",
          provider: "openai",
          status: "closed",
          text: CALL.voiceLost,
        });
        this.#hangUp();
      },
    });
    this.#openai = openai;
    return {
      message: (text) => bridge.fromTwilio(text),
      // The call is over on Twilio's side; the status callback ends the run.
      close: () => {
        this.#mediaClosed = true;
        openai.close();
      },
    };
  }

  /** De-escalate: hang up and stop the run. */
  cancel(reason: unknown): void {
    this.#hangUp();
    this.#fail(reason);
  }

  /** The run is over: stop the timers and close both sockets. */
  close(): void {
    this.#over = true;
    for (const timer of this.#timers) clearTimeout(timer);
    this.#openai?.close();
    this.#twilioWire?.close();
  }

  /** Starts the cap once, from whichever comes first: Twilio's answered status or the media stream. */
  #answered(): void {
    if (this.#answeredAt !== null) return;
    this.#answeredAt = Date.now();
    const { capMs, nudgeBeforeCapMs } = this.#options.timing;
    this.#later(capMs - nudgeBeforeCapMs, () => this.#bridge?.nudge());
    this.#later(capMs, () => {
      this.#options.emit({
        type: "step",
        text: CALL.capReached,
        invented: false,
      });
      this.#hangUp();
    });
  }

  #hangUp(): void {
    // Before Twilio returns the call SID, `placed` hangs up instead.
    if (this.#hungUp || this.#callSid === null) return;
    this.#hungUp = true;
    this.#options.calls
      .hangUp(this.#options.twilio, this.#callSid)
      .catch((error: unknown) => {
        // Twilio's own time limit still ends the call.
        console.error("Twilio hangup failed", error);
      });
  }

  #finish(result: CallResult): void {
    if (this.#over) return;
    this.#over = true;
    this.#resolve(result);
  }

  #fail(error: unknown): void {
    if (this.#over) return;
    this.#over = true;
    this.#reject(error);
  }

  #later(ms: number, task: () => void): void {
    this.#timers.push(setTimeout(task, ms));
  }
}
