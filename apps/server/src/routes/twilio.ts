import { Hono } from "hono";
import type { VoiceCalls } from "../voice/calls.ts";

/**
 * `POST /twilio/status/:token`: Twilio's status callbacks for a live call.
 * They come from Twilio, not the browser, so they sit outside `/api` and its
 * same-origin check. Instead each needs the call's unguessable token and
 * Twilio's signature. The media-stream WebSocket is attached in `index.ts`.
 */
export function twilioRoutes(voice: VoiceCalls) {
  return new Hono().post("/status/:token", async (c) => {
    const body = await c.req.parseBody();
    const params = Object.fromEntries(
      Object.entries(body).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
    const result = voice.status(
      c.req.param("token"),
      params,
      c.req.header("x-twilio-signature"),
    );
    if (result === "unknown-call") return c.body(null, 404);
    if (result === "bad-signature") return c.body(null, 403);
    return c.body(null, 204);
  });
}
