import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { RunEvent } from "@rengas/shared";
import type { Services } from "../services.ts";
import type { SessionEnv } from "../session.ts";

const KEEP_ALIVE_MS = 15_000;

/**
 * `GET /api/events`: the session's log over SSE (register decision
 * runs-and-sse). It replays everything after Last-Event-ID (the whole log on
 * a first connect), then streams new events. It subscribes before replaying
 * and skips ids it has already sent, so no event is lost or sent twice.
 */
export function eventRoutes({ events }: Services) {
  return new Hono<SessionEnv>().get("/events", (c) => {
    const sessionId = c.get("sessionId");
    const header = c.req.header("last-event-id") ?? "";
    const from = /^\d+$/.test(header) ? Number(header) : 0;

    return streamSSE(c, async (stream) => {
      const queue: RunEvent[] = [];
      let wake = () => {};
      const unsubscribe = events.subscribe(sessionId, (event) => {
        queue.push(event);
        wake();
      });
      stream.onAbort(() => {
        unsubscribe();
        wake();
      });

      let lastSent = from;
      const send = async (event: RunEvent) => {
        if (event.id <= lastSent) return;
        lastSent = event.id;
        await stream.writeSSE({
          id: String(event.id),
          data: JSON.stringify(event),
        });
      };

      try {
        for (const event of events.after(sessionId, from)) await send(event);
        while (!stream.aborted) {
          while (queue.length > 0) await send(queue.shift()!);
          const timedOut = await new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => resolve(true), KEEP_ALIVE_MS);
            wake = () => {
              clearTimeout(timer);
              resolve(false);
            };
          });
          if (timedOut && !stream.aborted)
            await stream.write(": keep-alive\n\n");
        }
      } finally {
        unsubscribe();
      }
    });
  });
}
