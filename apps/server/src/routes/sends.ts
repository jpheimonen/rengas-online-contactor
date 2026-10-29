import { Hono } from "hono";
import {
  SIMULATE_REASONS,
  getAction,
  sendPreviewRequestSchema,
  type RealCapableAction,
} from "@rengas/shared";
import { problem } from "../errors.ts";
import type { Services } from "../services.ts";
import type { SessionEnv } from "../session.ts";
import { getTicket } from "../session-data.ts";
import { readBody } from "../validate.ts";

/**
 * `POST /api/sends/preview`: the first half of every real send (register
 * decision send-guard). It shows exactly what will go to which verified
 * recipient and returns the single-use token that `POST /api/runs` needs.
 */
export function sendRoutes({ db, engine, guard, neutralWriter }: Services) {
  return new Hono<SessionEnv>().post("/sends/preview", async (c) => {
    const sessionId = c.get("sessionId");
    const request = await readBody(c, sendPreviewRequestSchema);
    // The request schema only takes real-capable action ids.
    const action = getAction(request.actionId).action as RealCapableAction;

    // A locked rung, a pretend key or no real adapter: nothing to preview.
    const choice = engine.unlockedMode(sessionId, action);
    if (choice.mode === "simulated") {
      throw problem(
        409,
        "not-configured",
        choice.reason
          ? `This action simulates: ${SIMULATE_REASONS[choice.reason]}.`
          : "Unlock this level with a real key to send for real.",
      );
    }

    // The guard refuses an unverified recipient or a used-up limit.
    const { content, aiWritten } = await neutralWriter.write(
      sessionId,
      action,
      getTicket(db, sessionId),
    );
    return c.json(
      guard.preview(sessionId, action, request.recipientId, content, aiWritten),
    );
  });
}
