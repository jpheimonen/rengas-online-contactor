import { vi } from "vitest";
import {
  RUNGS,
  recipientSchema,
  runEventSchema,
  sendPreviewSchema,
  stateSchema,
  type AppState,
  type RealKeySpec,
  type Recipient,
  type RunEvent,
  type RungId,
  type SendPreview,
} from "@rengas/shared";
import { createApp, type AppOptions } from "./app.ts";
import { openDatabase } from "./db/client.ts";
import type { ProviderCredentials as Credentials } from "./key-checks.ts";
import type { KeyVault } from "./keys.ts";
import type { CodeSender, PhoneCheck } from "./recipients/code-sender.ts";
import type { ConnectRealtime, Wire, WireHandlers } from "./voice/realtime.ts";
import type { PlaceCall, TwilioCalls } from "./voice/twilio.ts";

/** `app.request` resolves paths against this origin. */
export const ORIGIN = "http://localhost";

const refuse = (): never => {
  throw new Error("A test sent a verification code without a fake code sender");
};

/** Fails the test if a code is sent; tests that verify recipients pass a fake. */
export const noCodeSender: CodeSender = {
  sendEmailCode: refuse,
  startPhoneCode: refuse,
  checkPhoneCode: refuse,
};

/** A key vault that accepts any real key and holds fake credentials for every provider. */
export const fakeKeyVault: KeyVault = {
  checkAndStore: async (_sessionId, rung) => ({
    provider: rung.keys.find((k): k is RealKeySpec => k.kind === "real")!
      .provider,
    hint: "…5678",
  }),
  configured: () => null,
  forget: () => {},
  list: () => [],
  credentials: <P extends keyof Credentials>(_: string, provider: P) =>
    ({
      resend: { apiKey: "re_fake" },
      twilio: { accountSid: "ACfake", authToken: "fake" },
      openai: { apiKey: "sk-fake" },
    })[provider] as Credentials[P],
};

/** The code Twilio Verify "sent" in tests. */
export const PHONE_CODE = "246810";

/** A code sender that keeps the email codes it sends and accepts PHONE_CODE for phones. */
export function fakeCodeSender() {
  const emailCodes = new Map<string, string>();
  const sender = {
    emailCodes,
    sendEmailCode: vi.fn<CodeSender["sendEmailCode"]>(
      async (_credentials, to, code) => {
        emailCodes.set(to, code);
      },
    ),
    startPhoneCode: vi.fn<CodeSender["startPhoneCode"]>(async () => {}),
    checkPhoneCode: vi.fn<CodeSender["checkPhoneCode"]>(
      async (_credentials, _to, code): Promise<PhoneCheck> =>
        code === PHONE_CODE ? "approved" : "wrong",
    ),
  };
  return sender;
}

export type FakeCodeSender = ReturnType<typeof fakeCodeSender>;

export function testApp(options: Partial<AppOptions> = {}) {
  return createApp({
    db: openDatabase(":memory:"),
    appSecret: "test-secret-that-is-at-least-32-chars",
    codeSender: noCodeSender,
    stepDelayMs: 0,
    ...options,
  });
}

type App = ReturnType<typeof testApp>;

/** A browser tab: it keeps its session cookie and sends same-origin JSON requests. */
export class TestClient {
  cookie: string | undefined;

  constructor(readonly app: App) {}

  async request(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    const all: Record<string, string> = {
      origin: ORIGIN,
      "content-type": "application/json",
      ...(this.cookie && { cookie: this.cookie }),
      ...headers,
    };
    const response = await this.app.request(path, {
      method,
      // An empty value leaves the header out.
      headers: Object.fromEntries(Object.entries(all).filter(([, v]) => v)),
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    return response;
  }

  get = (path: string, headers?: Record<string, string>) =>
    this.request("GET", path, undefined, headers);
  post = (path: string, body: unknown = {}) => this.request("POST", path, body);
  put = (path: string, body: unknown) => this.request("PUT", path, body);

  async state(): Promise<AppState> {
    return stateSchema.parse(await (await this.get("/api/state")).json());
  }

  /** Adds the address and enters its code. Needs an app with `fakeCodeSender`. */
  async verifyRecipient(
    codes: FakeCodeSender,
    address: string,
  ): Promise<Recipient> {
    const channel = address.startsWith("+") ? "phone" : "email";
    const added = await this.post("/api/recipients", { channel, address });
    if (added.status !== 201) throw new Error(await added.text());
    const { id } = recipientSchema.parse(await added.json());
    const code =
      channel === "email" ? codes.emailCodes.get(address) : PHONE_CODE;
    const verified = await this.post(`/api/recipients/${id}/verify`, { code });
    if (verified.status !== 200) throw new Error(await verified.text());
    return recipientSchema.parse(await verified.json());
  }

  /** A send preview; fails unless the server returns one. */
  async preview(actionId: string, recipientId: string): Promise<SendPreview> {
    const response = await this.post("/api/sends/preview", {
      actionId,
      recipientId,
    });
    if (response.status !== 200) throw new Error(await response.text());
    return sendPreviewSchema.parse(await response.json());
  }

  /** Unlocks a rung with its first made-up keys. */
  async makeUpKeys(rungId: RungId): Promise<Response> {
    const rung = RUNGS.find((r) => r.id === rungId)!;
    const keys = Object.fromEntries(rung.keys.map((k) => [k.id, k.madeUp[0]!]));
    return this.post(`/api/rungs/${rungId}/unlock`, {
      mode: "pretend",
      keys,
      madeUp: true,
    });
  }

  /**
   * Reads `GET /api/events` until `until` holds for the events so far, then
   * disconnects. Each event's SSE id must equal its `id`.
   */
  async events(
    until: (events: RunEvent[]) => boolean,
    lastEventId?: number,
  ): Promise<RunEvent[]> {
    const response = await this.get(
      "/api/events",
      lastEventId === undefined ? {} : { "last-event-id": String(lastEventId) },
    );
    const reader = response
      .body!.pipeThrough(new TextDecoderStream())
      .getReader();
    const events: RunEvent[] = [];
    let buffer = "";
    try {
      while (!until(events)) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let end: number;
        while ((end = buffer.indexOf("\n\n")) >= 0) {
          const lines = buffer.slice(0, end).split("\n");
          buffer = buffer.slice(end + 2);
          const data = lines.find((l) => l.startsWith("data: "))?.slice(6);
          if (data === undefined) continue; // keep-alive comment
          const event = runEventSchema.parse(JSON.parse(data));
          if (!lines.includes(`id: ${event.id}`)) {
            throw new Error(`SSE id doesn't match event ${event.id}`);
          }
          events.push(event);
        }
      }
    } finally {
      await reader.cancel();
    }
    return events;
  }

  /** Every event of the session's log so far, read over SSE. */
  async log(): Promise<RunEvent[]> {
    const { lastEventId } = await this.state();
    return this.events((events) => events.at(-1)?.id === lastEventId);
  }
}

/** True once the run has its last event: after, failed or cancelled. */
export const runEnded = (runId: string) => (events: RunEvent[]) =>
  events.some(
    (e) =>
      "runId" in e &&
      e.runId === runId &&
      (e.type === "after" || e.type === "failed" || e.type === "cancelled"),
  );

type RunScopedEvent = Exclude<RunEvent, { type: "system" }>;

export const eventsOf = (events: RunEvent[], runId: string) =>
  events.filter(
    (e): e is RunScopedEvent => e.type !== "system" && e.runId === runId,
  );

/** A socket that keeps every frame sent to it, parsed. */
export function fakeWire() {
  const sent: Record<string, unknown>[] = [];
  const wire = {
    sent,
    closed: false,
    send: (text: string) => void sent.push(JSON.parse(text)),
    close: () => {
      wire.closed = true;
    },
  } satisfies Wire & Record<string, unknown>;
  return wire;
}

/** Twilio's call API, recording the calls placed and hung up. */
export function fakeTwilioCalls(options: { trial?: boolean } = {}) {
  const placed: PlaceCall[] = [];
  const hungUp: string[] = [];
  const calls = {
    placed,
    hungUp,
    place: vi.fn(async (_credentials, call: PlaceCall) => {
      placed.push(call);
      return `CA${placed.length}`;
    }),
    hangUp: vi.fn(async (_credentials, callSid: string) => {
      hungUp.push(callSid);
    }),
    isTrial: vi.fn(async () => options.trial ?? false),
  } satisfies TwilioCalls & Record<string, unknown>;
  return calls;
}

/** OpenAI Realtime connections: each one's socket and the handlers to drive it. */
export function fakeRealtime() {
  const connections: {
    apiKey: string;
    wire: ReturnType<typeof fakeWire>;
    handlers: WireHandlers;
  }[] = [];
  const connect: ConnectRealtime = (apiKey, handlers) => {
    const wire = fakeWire();
    connections.push({ apiKey, wire, handlers });
    return wire;
  };
  return { connections, connect };
}
