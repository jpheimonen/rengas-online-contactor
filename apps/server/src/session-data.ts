import { eq } from "drizzle-orm";
import type { RungId, Ticket, UnlockMode } from "@rengas/shared";
import type { Db } from "./db/client.ts";
import { sessions, unlocks } from "./db/schema.ts";

export function getTicket(db: Db, sessionId: string): Ticket {
  const row = db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get()!;
  return {
    number: row.ticketNumber,
    complaint: row.complaint,
    customer: row.customer,
  };
}

export function setTicket(db: Db, sessionId: string, ticket: Ticket): void {
  db.update(sessions)
    .set({
      ticketNumber: ticket.number,
      complaint: ticket.complaint,
      customer: ticket.customer,
    })
    .where(eq(sessions.id, sessionId))
    .run();
}

/** The session's unlocked rungs and how each was unlocked. */
export function getUnlocks(db: Db, sessionId: string): Map<RungId, UnlockMode> {
  const rows = db
    .select()
    .from(unlocks)
    .where(eq(unlocks.sessionId, sessionId))
    .all();
  return new Map(rows.map((row) => [row.rungId as RungId, row.mode]));
}

export function addUnlock(
  db: Db,
  sessionId: string,
  rungId: RungId,
  mode: UnlockMode,
): void {
  db.insert(unlocks)
    .values({ sessionId, rungId, mode, createdAt: new Date().toISOString() })
    .onConflictDoNothing()
    .run();
}

export function clearUnlocks(db: Db, sessionId: string): void {
  db.delete(unlocks).where(eq(unlocks.sessionId, sessionId)).run();
}
