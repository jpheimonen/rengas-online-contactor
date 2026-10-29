import { Hono } from "hono";
import {
  createRecipientRequestSchema,
  verifyRecipientRequestSchema,
} from "@rengas/shared";
import type { Services } from "../services.ts";
import type { SessionEnv } from "../session.ts";
import { readBody } from "../validate.ts";

/**
 * The operator's own inbox and phone (register decision send-guard). Adding
 * one sends it a 6-digit code; entering the code verifies it. Responses carry
 * the masked recipient only.
 */
export function recipientRoutes({ recipients }: Services) {
  return new Hono<SessionEnv>()
    .post("/recipients", async (c) => {
      const request = await readBody(c, createRecipientRequestSchema);
      return c.json(await recipients.add(c.get("sessionId"), request), 201);
    })
    .post("/recipients/:id/verify", async (c) => {
      const { code } = await readBody(c, verifyRecipientRequestSchema);
      return c.json(
        await recipients.verify(c.get("sessionId"), c.req.param("id"), code),
      );
    })
    .delete("/recipients/:id", (c) => {
      recipients.remove(c.get("sessionId"), c.req.param("id"));
      return c.body(null, 204);
    });
}
