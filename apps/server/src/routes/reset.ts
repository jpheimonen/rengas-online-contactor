import { Hono } from "hono";
import { SYSTEM_LINES } from "@rengas/shared";
import type { Services } from "../services.ts";
import type { SessionEnv } from "../session.ts";
import { clearUnlocks } from "../session-data.ts";
import { buildState } from "../state.ts";

/**
 * `POST /api/reset`: De-escalate (register decision de-escalate-scope). It
 * cancels running runs first, so their cancelled lines come before the
 * de-escalate lines, then relocks every rung and forgets the UI keys. The
 * ticket and the log stay.
 */
export function resetRoutes(services: Services) {
  return new Hono<SessionEnv>().post("/reset", (c) => {
    const sessionId = c.get("sessionId");
    services.engine.cancelAll(sessionId);
    services.keyVault.forget(sessionId);
    clearUnlocks(services.db, sessionId);
    for (const text of [
      SYSTEM_LINES.deEscalated,
      SYSTEM_LINES.deEscalatedSisu,
    ]) {
      services.events.append(sessionId, {
        type: "system",
        kind: "de-escalate",
        text,
      });
    }
    return c.json(buildState(services, sessionId));
  });
}
