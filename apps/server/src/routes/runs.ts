import { Hono } from "hono";
import { startRunRequestSchema } from "@rengas/shared";
import { problem } from "../errors.ts";
import type { Services } from "../services.ts";
import type { SessionEnv } from "../session.ts";
import { readBody } from "../validate.ts";

/**
 * `POST /api/runs` starts one action; its lines arrive over `GET /api/events`.
 * `POST /api/runs/:runId/hang-up` ends a live call.
 */
export function runRoutes({ engine }: Services) {
  return new Hono<SessionEnv>()
    .post("/runs", async (c) => {
      const request = await readBody(c, startRunRequestSchema);
      const started = engine.start(c.get("sessionId"), request);
      return c.json(started, 202);
    })
    .post("/runs/:runId/hang-up", (c) => {
      if (!engine.hangUp(c.get("sessionId"), c.req.param("runId")))
        throw problem(404, "not-found", "That call has already ended.");
      return c.body(null, 204);
    });
}
