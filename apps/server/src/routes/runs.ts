import { Hono } from "hono";
import { startRunRequestSchema } from "@rengas/shared";
import type { Services } from "../services.ts";
import type { SessionEnv } from "../session.ts";
import { readBody } from "../validate.ts";

/** `POST /api/runs` starts one action; its lines arrive over `GET /api/events`. */
export function runRoutes({ engine }: Services) {
  return new Hono<SessionEnv>().post("/runs", async (c) => {
    const request = await readBody(c, startRunRequestSchema);
    const started = engine.start(c.get("sessionId"), request);
    return c.json(started, 202);
  });
}
