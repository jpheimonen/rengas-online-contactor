import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { RunEventBody } from "../events.ts";

/**
 * Tables the server core owns (architecture/index.md, "Data"). The key vault
 * and the send guard add their own. After changing this file, run
 * `pnpm --filter @rengas/server db:generate` and commit the new migration.
 * Timestamps are ISO 8601 strings.
 */

/** One operator per browser session (register decision session-and-hosting). The ticket lives here. */
export const sessions = sqliteTable("sessions", {
  id: text().primaryKey(),
  ticketNumber: text().notNull(),
  complaint: text().notNull(),
  customer: text().notNull(),
  createdAt: text().notNull(),
  lastSeenAt: text().notNull(),
});

const sessionId = () =>
  text()
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" });

export const unlocks = sqliteTable(
  "unlocks",
  {
    sessionId: sessionId(),
    rungId: text().notNull(),
    mode: text({ enum: ["real", "pretend", "configured"] }).notNull(),
    createdAt: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.rungId] })],
);

export const runs = sqliteTable(
  "runs",
  {
    id: text().primaryKey(),
    sessionId: sessionId(),
    actionId: text().notNull(),
    mode: text({ enum: ["real", "simulated"] }).notNull(),
    status: text({
      enum: ["running", "done", "failed", "cancelled"],
    }).notNull(),
    startedAt: text().notNull(),
    endedAt: text(),
  },
  (t) => [index("runs_session_idx").on(t.sessionId)],
);

/** The activity log. `id` is the SSE id, so a reconnect replays from Last-Event-ID. */
export const runEvents = sqliteTable(
  "run_events",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    sessionId: sessionId(),
    runId: text().references(() => runs.id, { onDelete: "cascade" }),
    type: text().notNull(),
    body: text({ mode: "json" }).$type<RunEventBody>().notNull(),
    createdAt: text().notNull(),
  },
  (t) => [index("run_events_session_idx").on(t.sessionId, t.id)],
);
