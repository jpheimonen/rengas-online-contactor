import { z } from "zod";
import { ACTION_IDS, RUNG_IDS } from "./ladder.ts";
import { SIMULATE_REASONS } from "./copy.ts";
import { runModeSchema } from "./events.ts";

/** Request and response bodies for every /api endpoint (architecture/index.md). */

export const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
});
export type Health = z.infer<typeof healthSchema>;

export const rungIdSchema = z.enum(RUNG_IDS);
export const actionIdSchema = z.enum(ACTION_IDS);
export const providerSchema = z.enum(["resend", "twilio", "openai"]);
export const finderKindSchema = z.enum(["humans", "aircraft"]);
export const simulateReasonSchema = z.enum(
  Object.keys(SIMULATE_REASONS) as [
    keyof typeof SIMULATE_REASONS,
    ...(keyof typeof SIMULATE_REASONS)[],
  ],
);
export const realActionIdSchema = z.enum([
  "firm-email",
  "polite-sms",
  "ai-call",
]);

/** Every error response. `fieldErrors` holds per-field messages, such as key errors by key id. */
export const apiErrorSchema = z.object({
  error: z.enum([
    "invalid-request",
    "forbidden",
    "not-found",
    "not-next-rung",
    "rung-locked",
    "invalid-keys",
    "not-configured",
    "run-in-progress",
    "not-verified",
    "code-invalid",
    "code-expired",
    "token-invalid",
    "rate-limited",
    "search-failed",
  ]),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// Ticket: GET in state, PUT /api/ticket

export const ticketSchema = z.object({
  number: z.string().regex(/^\d{1,8}$/, "Use up to 8 digits."),
  complaint: z.string().trim().min(1).max(120),
  customer: z.string().trim().min(1).max(40),
});
export const putTicketRequestSchema = ticketSchema;

// State: GET /api/state

export const unlockModeSchema = z.enum(["real", "pretend", "configured"]);
export type UnlockMode = z.infer<typeof unlockModeSchema>;

export const recipientSchema = z.object({
  id: z.string(),
  channel: z.enum(["email", "phone"]),
  /** Masked address, e.g. "j•••@gmail.com". The full address is never sent back. */
  masked: z.string(),
  verified: z.boolean(),
});
export type Recipient = z.infer<typeof recipientSchema>;

const limitSchema = z.object({ used: z.number().int(), max: z.number().int() });

export const stateSchema = z.object({
  ticket: ticketSchema,
  unlocks: z.array(z.object({ rungId: rungIdSchema, mode: unlockModeSchema })),
  /** Index of the highest unlocked rung, as `currentLevel` returns it. */
  currentLevel: z.number().int().min(0),
  keys: z.array(
    z.object({
      provider: providerSchema,
      source: z.enum(["stored", "configured"]),
      /** Masked hint such as "sk-…a1b2". Keys never return to the browser. */
      hint: z.string(),
    }),
  ),
  recipients: z.array(recipientSchema),
  limits: z.object({
    hour: z.object({
      email: limitSchema,
      sms: limitSchema,
      voice: limitSchema,
    }),
    day: limitSchema,
  }),
  /** How each real-capable action would run now. */
  actionModes: z.array(
    z.object({
      actionId: realActionIdSchema,
      mode: runModeSchema,
      reason: simulateReasonSchema.optional(),
      recipient: z.string().optional(),
    }),
  ),
  finderMode: z.enum(["web-search", "examples"]),
  /** True when Sisu writes its own lines (a validated OpenAI key is held). */
  writerEnabled: z.boolean(),
  runningActionIds: z.array(actionIdSchema),
  lastEventId: z.number().int().min(0),
});
export type AppState = z.infer<typeof stateSchema>;

// Unlock: POST /api/rungs/:id/unlock (register decision unlock-modes)

const keyValuesSchema = z.record(z.string(), z.string());

export const unlockRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("real"), keys: keyValuesSchema }),
  z.object({
    mode: z.literal("pretend"),
    keys: keyValuesSchema,
    /** True for "🎲 Make one up", so the log names the fake key. */
    madeUp: z.boolean().default(false),
  }),
  z.object({ mode: z.literal("configured") }),
]);
export type UnlockRequest = z.infer<typeof unlockRequestSchema>;

// Recipients

export const createRecipientRequestSchema = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("email"), address: z.email() }),
  z.object({
    channel: z.literal("phone"),
    address: z.string().regex(/^\+[1-9]\d{6,14}$/, "Use the +358… format."),
  }),
]);
export type CreateRecipientRequest = z.infer<
  typeof createRecipientRequestSchema
>;

export const verifyRecipientRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

// Send preview: POST /api/sends/preview (register decision send-guard)

export const sendPreviewRequestSchema = z.object({
  actionId: realActionIdSchema,
  recipientId: z.string(),
});

const remainingSchema = z.object({
  hour: z.object({ left: z.number().int(), of: z.number().int() }),
  day: z.object({ left: z.number().int(), of: z.number().int() }),
});

export const sendPreviewSchema = z.object({
  confirmToken: z.string().min(1),
  expiresAt: z.iso.datetime(),
  actionId: realActionIdSchema,
  recipient: z.string(),
  aiWritten: z.boolean(),
  remaining: remainingSchema,
  content: z.discriminatedUnion("channel", [
    z.object({
      channel: z.literal("email"),
      subject: z.string(),
      body: z.string(),
    }),
    z.object({ channel: z.literal("sms"), text: z.string() }),
    z.object({
      channel: z.literal("voice"),
      maxSeconds: z.number().int().positive(),
      opening: z.string(),
      rules: z.array(z.string()),
      trialNotice: z.boolean(),
    }),
  ]),
});
export type SendPreview = z.infer<typeof sendPreviewSchema>;

// Runs: POST /api/runs

/** A finder card's name. It comes from the web, so it is plain text and short. */
export const optionNameSchema = z.string().trim().min(1).max(80);

export const startRunRequestSchema = z
  .object({
    actionId: actionIdSchema,
    /** The preview's token; required for a real run. */
    confirmToken: z.string().min(1).optional(),
    /** "Simulate instead" on a real-capable action. */
    simulate: z.boolean().optional(),
    optionName: optionNameSchema.optional(),
  })
  .refine((r) => !(r.confirmToken && r.simulate), {
    message: "A run is either confirmed for real or simulated, not both.",
  })
  .refine(
    (r) =>
      r.optionName === undefined ||
      r.actionId === "dispatch-human" ||
      r.actionId === "blimp",
    { message: "Only finder cards pass an option name.", path: ["optionName"] },
  );
export type StartRunRequest = z.infer<typeof startRunRequestSchema>;

export const startRunResponseSchema = z.object({
  runId: z.string(),
  mode: runModeSchema,
});

// Finder: POST /api/finder (register decisions finder-agent, finder-two-kinds)

export const finderRequestSchema = z.object({ kind: finderKindSchema });

export const finderOptionSchema = z.object({
  name: optionNameSchema,
  offer: z.string().min(1).max(200),
  price: z.string().max(80).nullable(),
  location: z.string().max(80),
  sourceUrl: z.url({ protocol: /^https?$/ }).nullable(),
});

export const finderResponseSchema = z.object({
  kind: finderKindSchema,
  mode: z.enum(["web-search", "examples"]),
  results: z.array(finderOptionSchema),
});
export type FinderResponse = z.infer<typeof finderResponseSchema>;
