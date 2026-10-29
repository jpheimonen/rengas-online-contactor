import { Hono } from "hono";
import { putTicketRequestSchema } from "@rengas/shared";
import type { Services } from "../services.ts";
import type { SessionEnv } from "../session.ts";
import { setTicket } from "../session-data.ts";
import { buildState } from "../state.ts";
import { readBody } from "../validate.ts";

export function stateRoutes(services: Services) {
  return new Hono<SessionEnv>()
    .get("/state", (c) => c.json(buildState(services, c.get("sessionId"))))
    .put("/ticket", async (c) => {
      const ticket = await readBody(c, putTicketRequestSchema);
      setTicket(services.db, c.get("sessionId"), ticket);
      return c.json(buildState(services, c.get("sessionId")));
    });
}
