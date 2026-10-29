import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import {
  DEFAULT_TICKET,
  SYSTEM_LINES,
  fillTemplate,
  ticketValues,
} from "@rengas/shared";
import type { Db } from "./db/client.ts";
import { sessions } from "./db/schema.ts";
import { problem } from "./errors.ts";
import type { EventLog } from "./events.ts";

export const SESSION_COOKIE = "sid";
const SESSION_DAYS = 30;

export type SessionEnv = { Variables: { sessionId: string } };

/**
 * Same-origin check for requests that change state (register decision
 * session-and-hosting). They must send JSON, which a plain HTML form can't,
 * and come from this origin, by Sec-Fetch-Site or by Origin.
 */
export const sameOrigin = createMiddleware(async (c, next) => {
  if (!/^(GET|HEAD|OPTIONS)$/.test(c.req.method)) {
    if (!/^application\/json\b/i.test(c.req.header("content-type") ?? "")) {
      throw problem(403, "forbidden", "Send the request as JSON.");
    }
    const site = c.req.header("sec-fetch-site");
    const origin = c.req.header("origin");
    const ok =
      site === "same-origin" ||
      (site === undefined && origin === new URL(c.req.url).origin);
    if (!ok)
      throw problem(403, "forbidden", "Cross-site requests are refused.");
  }
  await next();
});

/**
 * Finds the session from the httpOnly, SameSite=Strict cookie, or starts a new
 * one with the default ticket and Sisu's ready line.
 */
export function sessionMiddleware(db: Db, events: EventLog) {
  return createMiddleware<SessionEnv>(async (c, next) => {
    const now = new Date().toISOString();
    const cookie = getCookie(c, SESSION_COOKIE);
    const known =
      cookie !== undefined &&
      db
        .update(sessions)
        .set({ lastSeenAt: now })
        .where(eq(sessions.id, cookie))
        .returning({ id: sessions.id })
        .get() !== undefined;

    const sessionId = known ? cookie : startSession(db, events, now);
    if (!known) {
      setCookie(c, SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "Strict",
        path: "/",
        maxAge: SESSION_DAYS * 24 * 60 * 60,
      });
    }
    c.set("sessionId", sessionId);
    await next();
  });
}

function startSession(db: Db, events: EventLog, now: string): string {
  const id = randomBytes(32).toString("base64url");
  db.insert(sessions)
    .values({
      id,
      ticketNumber: DEFAULT_TICKET.number,
      complaint: DEFAULT_TICKET.complaint,
      customer: DEFAULT_TICKET.customer,
      createdAt: now,
      lastSeenAt: now,
    })
    .run();
  const text = fillTemplate(SYSTEM_LINES.ready, ticketValues(DEFAULT_TICKET));
  events.append(id, { type: "system", kind: "ready", text });
  return id;
}
