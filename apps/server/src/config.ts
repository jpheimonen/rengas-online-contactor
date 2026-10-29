import { z } from "zod";

const optionalSecret = z
  .string()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const limit = (fallback: number) =>
  z.coerce.number().int().min(0).default(fallback);

const configSchema = z.object({
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  PUBLIC_BASE_URL: optionalSecret.pipe(z.url().optional()),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
  DATABASE_PATH: z.string().default("./data/app.db"),
  RESEND_API_KEY: optionalSecret,
  /** Resend's sandbox only sends from this address until you verify a domain. */
  RESEND_FROM: z.string().default("onboarding@resend.dev"),
  TWILIO_ACCOUNT_SID: optionalSecret,
  TWILIO_AUTH_TOKEN: optionalSecret,
  TWILIO_FROM_NUMBER: optionalSecret,
  OPENAI_API_KEY: optionalSecret,
  // Real-send limits per session (register decision send-guard).
  SEND_LIMIT_EMAIL_PER_HOUR: limit(3),
  SEND_LIMIT_SMS_PER_HOUR: limit(3),
  SEND_LIMIT_CALLS_PER_HOUR: limit(2),
  SEND_LIMIT_PER_DAY: limit(10),
});

export type Config = z.infer<typeof configSchema>;

/** Parses the environment once at startup and throws one readable error listing every problem. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${problems}`);
  }
  return result.data;
}
