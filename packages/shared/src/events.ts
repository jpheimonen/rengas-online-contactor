import { z } from "zod";
import { ACTION_IDS, RUNG_IDS } from "./ladder.ts";

/**
 * Events streamed over GET /api/events (register decision runs-and-sse).
 * `id` is monotonic per server and is also the SSE id, so a reconnect replays
 * from Last-Event-ID.
 */

export const runModeSchema = z.enum(["real", "simulated"]);
export type RunMode = z.infer<typeof runModeSchema>;

const base = {
  id: z.number().int().positive(),
  at: z.iso.datetime(),
};

/** Fields every event of a run carries; `mode` is the run's REAL or SIMULATED tag. */
const runBase = {
  ...base,
  runId: z.string().min(1),
  actionId: z.enum(ACTION_IDS),
  mode: runModeSchema,
};

export const runEventSchema = z.discriminatedUnion("type", [
  z.object({
    ...runBase,
    type: z.literal("started"),
    label: z.string(),
    /** Set when a real-capable action simulates: the SIMULATE_REASONS key. */
    simulateReason: z.string().optional(),
    optionName: z.string().optional(),
  }),
  z.object({
    ...runBase,
    type: z.literal("thought"),
    text: z.string(),
    aiWritten: z.boolean(),
  }),
  z.object({
    ...runBase,
    type: z.literal("step"),
    text: z.string(),
    invented: z.boolean(),
  }),
  z.object({
    ...runBase,
    type: z.literal("set-piece"),
    lines: z.array(z.string()).min(1),
    aiWritten: z.boolean(),
  }),
  z.object({
    ...runBase,
    type: z.literal("provider-status"),
    provider: z.enum(["resend", "twilio", "openai"]),
    status: z.string(),
    text: z.string(),
  }),
  z.object({
    ...runBase,
    type: z.literal("transcript"),
    speaker: z.enum(["sisu", "them"]),
    text: z.string(),
  }),
  z.object({ ...runBase, type: z.literal("done"), text: z.string() }),
  z.object({
    ...runBase,
    type: z.literal("after"),
    text: z.string(),
    aiWritten: z.boolean(),
  }),
  z.object({ ...runBase, type: z.literal("failed"), text: z.string() }),
  z.object({ ...runBase, type: z.literal("cancelled"), text: z.string() }),
  /** Log lines outside a run: the ready line, unlocks, De-escalate, speech, finder notes. */
  z.object({
    ...base,
    type: z.literal("system"),
    kind: z.enum([
      "ready",
      "notice",
      "unlock",
      "reaction",
      "de-escalate",
      "speech",
      "finder",
    ]),
    text: z.string(),
    rungId: z.enum(RUNG_IDS).optional(),
  }),
]);

export type RunEvent = z.infer<typeof runEventSchema>;
export type RunEventType = RunEvent["type"];
