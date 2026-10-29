import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { SendContent } from "@rengas/shared";
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

/**
 * Real provider keys entered in the UI (register decision provider-keys). The
 * secret is AES-256-GCM ciphertext (`key-cipher.ts`); only the masked hint
 * ever leaves the server. Twilio's SID and token are one secret.
 */
export const providerKeys = sqliteTable(
  "provider_keys",
  {
    sessionId: sessionId(),
    provider: text({ enum: ["resend", "twilio", "openai"] }).notNull(),
    ciphertext: text().notNull(),
    hint: text().notNull(),
    validatedAt: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.provider] })],
);

// Recipient verification and the send guard (register decision send-guard).

/** The operator's own inbox and phone. Real sends go only to verified ones. */
export const recipients = sqliteTable(
  "recipients",
  {
    id: text().primaryKey(),
    sessionId: sessionId(),
    channel: text({ enum: ["email", "phone"] }).notNull(),
    address: text().notNull(),
    createdAt: text().notNull(),
    verifiedAt: text(),
  },
  (t) => [uniqueIndex("recipients_address_idx").on(t.sessionId, t.address)],
);

/**
 * A code sent and not yet entered. Email codes are kept only as an HMAC;
 * Twilio Verify keeps phone codes, so their `codeHash` is null. The row exists
 * so De-escalate can cancel the code. `sentAt` stays after verification for
 * the hourly cap on code sends.
 */
export const verificationCodes = sqliteTable(
  "verification_codes",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    sessionId: sessionId(),
    recipientId: text()
      .notNull()
      .references(() => recipients.id, { onDelete: "cascade" }),
    codeHash: text(),
    expiresAt: text().notNull(),
    attempts: integer().notNull().default(0),
    sentAt: text().notNull(),
    closedAt: text(),
  },
  (t) => [index("verification_codes_session_idx").on(t.sessionId)],
);

/** A send preview waiting for "Send for real". Only the token's hash is stored. */
export const sendConfirmations = sqliteTable("send_confirmations", {
  tokenHash: text().primaryKey(),
  sessionId: sessionId(),
  actionId: text().notNull(),
  recipientId: text()
    .notNull()
    .references(() => recipients.id, { onDelete: "cascade" }),
  content: text({ mode: "json" }).$type<SendContent>().notNull(),
  expiresAt: text().notNull(),
  usedAt: text(),
});

/** Every real send, for the rate limits and the record. */
export const sends = sqliteTable(
  "sends",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    sessionId: sessionId(),
    runId: text()
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    channel: text({ enum: ["email", "sms", "voice"] }).notNull(),
    recipientAddress: text().notNull(),
    status: text({ enum: ["pending", "sent", "failed"] }).notNull(),
    providerMessageId: text(),
    createdAt: text().notNull(),
  },
  (t) => [index("sends_session_idx").on(t.sessionId, t.createdAt)],
);
