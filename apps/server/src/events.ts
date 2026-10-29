import { and, asc, eq, gt, max } from "drizzle-orm";
import type { RunEvent } from "@rengas/shared";
import type { Db } from "./db/client.ts";
import { runEvents } from "./db/schema.ts";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** An event before it is saved; the log assigns `id` and `at`. */
export type RunEventBody = DistributiveOmit<RunEvent, "id" | "at">;

type Listener = (event: RunEvent) => void;

/**
 * The session's activity log (register decision runs-and-sse). Every event is
 * saved first and then handed to the session's live listeners, so the SSE
 * stream and a replay from Last-Event-ID see the same events in the same order.
 */
export class EventLog {
  readonly #listeners = new Map<string, Set<Listener>>();

  constructor(private readonly db: Db) {}

  append(sessionId: string, body: RunEventBody): RunEvent {
    const at = new Date().toISOString();
    const runId = "runId" in body ? body.runId : null;
    const { id } = this.db
      .insert(runEvents)
      .values({ sessionId, runId, type: body.type, body, createdAt: at })
      .returning({ id: runEvents.id })
      .get()!;
    const event = { ...body, id, at } as RunEvent;
    for (const listener of this.#listeners.get(sessionId) ?? []) {
      listener(event);
    }
    return event;
  }

  /** The session's events with an id above `afterId`, oldest first. */
  after(sessionId: string, afterId: number): RunEvent[] {
    return this.db
      .select()
      .from(runEvents)
      .where(and(eq(runEvents.sessionId, sessionId), gt(runEvents.id, afterId)))
      .orderBy(asc(runEvents.id))
      .all()
      .map(
        (row) => ({ ...row.body, id: row.id, at: row.createdAt }) as RunEvent,
      );
  }

  lastId(sessionId: string): number {
    const row = this.db
      .select({ id: max(runEvents.id) })
      .from(runEvents)
      .where(eq(runEvents.sessionId, sessionId))
      .get();
    return row?.id ?? 0;
  }

  /** Calls `listener` for each new event of the session; returns the unsubscribe function. */
  subscribe(sessionId: string, listener: Listener): () => void {
    const listeners = this.#listeners.get(sessionId) ?? new Set<Listener>();
    listeners.add(listener);
    this.#listeners.set(sessionId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.#listeners.delete(sessionId);
    };
  }
}
