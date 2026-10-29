import {
  RUNGS,
  runEventSchema,
  stateSchema,
  type AppState,
  type RunEvent,
  type RungId,
} from "@rengas/shared";
import { createApp, type AppOptions } from "./app.ts";
import { openDatabase } from "./db/client.ts";

/** `app.request` resolves paths against this origin. */
export const ORIGIN = "http://localhost";

export function testApp(options: Partial<AppOptions> = {}) {
  return createApp({
    db: openDatabase(":memory:"),
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
