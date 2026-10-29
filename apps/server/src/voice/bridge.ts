import { CALL } from "@rengas/shared";
import { callSession, END_CALL_TOOL, type Wire } from "./realtime.ts";

export interface BridgeEvents {
  transcript(speaker: "sisu" | "them", text: string): void;
  /** Sisu called `end_call` and its goodbye has finished playing. */
  endCall(): void;
  /** OpenAI reported a problem; the call carries on unless its socket closes. */
  openaiError(message: string): void;
}

/** Twilio sends this mark back once the audio before it has played. */
const GOODBYE_MARK = "goodbye";

type Message = Record<string, unknown> & { type?: string; event?: string };

const parse = (text: string): Message | null => {
  try {
    const message: unknown = JSON.parse(text);
    return typeof message === "object" && message !== null
      ? (message as Message)
      : null;
  } catch {
    return null;
  }
};

/**
 * Links one Twilio Media Stream to one OpenAI Realtime session. Both carry
 * 8 kHz μ-law audio as base64, so audio passes through unchanged:
 * - the caller's audio goes to OpenAI, and Sisu's audio goes back to Twilio;
 * - when the person starts talking, Twilio drops the audio it still has queued,
 *   so Sisu stops mid-sentence (OpenAI cancels its own response);
 * - finished transcripts of both sides go to `events.transcript`.
 */
export class CallBridge {
  readonly #twilio: Wire;
  readonly #events: BridgeEvents;
  #openai: Wire | null = null;
  #streamSid: string | null = null;
  #greeted = false;

  constructor(twilio: Wire, events: BridgeEvents) {
    this.#twilio = twilio;
    this.#events = events;
  }

  /** The OpenAI socket is open: set up the session. */
  start(openai: Wire, instructions: string): void {
    this.#openai = openai;
    openai.send(JSON.stringify(callSession(instructions)));
    this.#greet();
  }

  /** Tells Sisu time is nearly up, so it says the closing line. */
  nudge(): void {
    this.#openai?.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "system",
          content: [{ type: "input_text", text: CALL.timeNearlyUp }],
        },
      }),
    );
    this.#openai?.send(JSON.stringify({ type: "response.create" }));
  }

  /** A text frame from Twilio's media stream. */
  fromTwilio(text: string): void {
    const message = parse(text);
    switch (message?.event) {
      case "start": {
        const start = message.start as { streamSid?: string } | undefined;
        this.#streamSid = start?.streamSid ?? null;
        this.#greet();
        break;
      }
      case "media": {
        const media = message.media as { payload?: string } | undefined;
        if (media?.payload) {
          this.#openai?.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: media.payload,
            }),
          );
        }
        break;
      }
      case "mark": {
        const mark = message.mark as { name?: string } | undefined;
        if (mark?.name === GOODBYE_MARK) this.#events.endCall();
        break;
      }
    }
  }

  /** A text frame from OpenAI's Realtime session. */
  fromOpenAI(text: string): void {
    const message = parse(text);
    switch (message?.type) {
      case "response.output_audio.delta":
        this.#toTwilio({ event: "media", media: { payload: message.delta } });
        break;
      case "input_audio_buffer.speech_started":
        this.#toTwilio({ event: "clear" });
        break;
      case "response.output_audio_transcript.done":
        this.#transcript("sisu", message.transcript);
        break;
      case "conversation.item.input_audio_transcription.completed":
        this.#transcript("them", message.transcript);
        break;
      case "response.function_call_arguments.done":
        // Hang up once the goodbye before this call has played.
        if (message.name === END_CALL_TOOL.name) {
          this.#toTwilio({ event: "mark", mark: { name: GOODBYE_MARK } });
        }
        break;
      case "error": {
        const error = message.error as { message?: string } | undefined;
        this.#events.openaiError(error?.message ?? "unknown error");
        break;
      }
    }
  }

  /** Sisu says its opening line once both sides are ready, so none of it is lost. */
  #greet(): void {
    if (this.#greeted || !this.#openai || !this.#streamSid) return;
    this.#greeted = true;
    this.#openai.send(JSON.stringify({ type: "response.create" }));
  }

  #toTwilio(message: Record<string, unknown>): void {
    if (this.#streamSid) {
      this.#twilio.send(
        JSON.stringify({ ...message, streamSid: this.#streamSid }),
      );
    }
  }

  #transcript(speaker: "sisu" | "them", text: unknown): void {
    if (typeof text === "string" && text.trim()) {
      this.#events.transcript(speaker, text.trim());
    }
  }
}
