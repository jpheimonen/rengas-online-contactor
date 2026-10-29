import { and, eq } from "drizzle-orm";
import {
  PROVIDER_NAMES,
  UNLOCK_COPY,
  type AppState,
  type Provider,
  type RealKeySpec,
  type Rung,
} from "@rengas/shared";
import type { Config } from "./config.ts";
import type { Db } from "./db/client.ts";
import { providerKeys } from "./db/schema.ts";
import { problem } from "./errors.ts";
import { KeyCipher } from "./key-cipher.ts";
import type {
  CheckResult,
  Credentials,
  KeyCheckers,
  ProviderCredentials,
} from "./key-checks.ts";

export interface AcceptedKey {
  provider: Provider;
  /** Masked hint such as "re_…a1b2". */
  hint: string;
}

/**
 * Where real provider keys are checked and kept (register decisions
 * provider-keys and unlock-modes). The unlock and reset endpoints call it.
 */
export interface KeyVault {
  /** Checks the rung's real keys live with the provider and stores them. Returns field errors on refusal. */
  checkAndStore(
    sessionId: string,
    rung: Rung,
    keys: Readonly<Record<string, string>>,
  ): Promise<AcceptedKey | { fieldErrors: Record<string, string> }>;
  /** The key from .env that unlocks this rung in one click, or null. */
  configured(rung: Rung): AcceptedKey | null;
  /** De-escalate: deletes the keys entered in the UI. Configured keys stay ready. */
  forget(sessionId: string): void;
  list(sessionId: string): AppState["keys"];
  /**
   * The provider's key for the real adapters: the one entered in this session,
   * else the one from .env, else null. Server-side only; never send it to the browser.
   */
  credentials<P extends Provider>(
    sessionId: string,
    provider: P,
  ): ProviderCredentials[P] | null;
}

/** Real keys are refused and nothing is configured; tests that need no vault use it. */
export const noKeyVault: KeyVault = {
  checkAndStore() {
    throw problem(
      501,
      "not-configured",
      "This server can't check real keys yet. Make one up instead.",
    );
  },
  configured: () => null,
  forget: () => {},
  list: () => [],
  credentials: () => null,
};

/** Which rung key field fills which part of each provider's credentials (see `ladder.ts`). */
export const KEY_FIELDS: {
  [P in Provider]: Record<keyof ProviderCredentials[P], string>;
} = {
  resend: { apiKey: "resend" },
  twilio: { accountSid: "twilio-sid", authToken: "twilio-token" },
  openai: { apiKey: "openai" },
};

export type PresetKeys = { [P in Provider]?: ProviderCredentials[P] };

/** The provider keys set in .env. Twilio counts only with both its SID and token. */
export function presetKeys(config: Config): PresetKeys {
  return {
    ...(config.RESEND_API_KEY && {
      resend: { apiKey: config.RESEND_API_KEY },
    }),
    ...(config.TWILIO_ACCOUNT_SID &&
      config.TWILIO_AUTH_TOKEN && {
        twilio: {
          accountSid: config.TWILIO_ACCOUNT_SID,
          authToken: config.TWILIO_AUTH_TOKEN,
        },
      }),
    ...(config.OPENAI_API_KEY && {
      openai: { apiKey: config.OPENAI_API_KEY },
    }),
  };
}

/** Keeps the provider's prefix and the last 4 characters: "sk-…a1b2", "AC…9f3e". */
export function maskKey(value: string): string {
  const prefix = /^[A-Za-z]{1,4}[_-]/.exec(value)?.[0] ?? value.slice(0, 2);
  return `${prefix}…${value.slice(-4)}`;
}

/** Twilio's hint shows the account SID; the auth token never appears, even masked. */
const hintFor = (credentials: Credentials) =>
  maskKey(
    "accountSid" in credentials ? credentials.accountSid : credentials.apiKey,
  );

const realKeysOf = (rung: Rung) =>
  rung.keys.filter((key): key is RealKeySpec => key.kind === "real");

/** The provider a rung's real keys belong to, or null on a simulation-only rung. */
const providerOf = (rung: Rung): Provider | null =>
  realKeysOf(rung)[0]?.provider ?? null;

/** Each ciphertext opens only for its own session and provider. */
const cipherContext = (sessionId: string, provider: Provider) =>
  `${sessionId}:${provider}`;

export interface KeyVaultOptions {
  db: Db;
  appSecret: string;
  preset: PresetKeys;
  checkers: KeyCheckers;
}

/** The SQLite key vault: AES-256-GCM ciphertext per session and provider. */
export function createKeyVault({
  db,
  appSecret,
  preset,
  checkers,
}: KeyVaultOptions): KeyVault {
  const cipher = new KeyCipher(appSecret);

  const check = <P extends Provider>(
    provider: P,
    credentials: ProviderCredentials[P],
  ): Promise<CheckResult> => checkers[provider](credentials);

  const stored = (sessionId: string) =>
    db
      .select()
      .from(providerKeys)
      .where(eq(providerKeys.sessionId, sessionId))
      .all();

  return {
    async checkAndStore(sessionId, rung, keys) {
      const provider = providerOf(rung)!;
      const credentials = Object.fromEntries(
        Object.entries(KEY_FIELDS[provider]).map(([part, field]) => [
          part,
          keys[field],
        ]),
      ) as Credentials;

      const result = await check(provider, credentials);
      if (result !== "ok") {
        const template =
          result === "refused"
            ? UNLOCK_COPY.keyRejected
            : UNLOCK_COPY.providerUnreachable;
        const message = template.replaceAll(
          "{provider}",
          PROVIDER_NAMES[provider],
        );
        return {
          fieldErrors: Object.fromEntries(
            realKeysOf(rung).map((key) => [key.id, message]),
          ),
        };
      }

      const row = {
        ciphertext: cipher.encrypt(
          JSON.stringify(credentials),
          cipherContext(sessionId, provider),
        ),
        hint: hintFor(credentials),
        validatedAt: new Date().toISOString(),
      };
      db.insert(providerKeys)
        .values({ sessionId, provider, ...row })
        .onConflictDoUpdate({
          target: [providerKeys.sessionId, providerKeys.provider],
          set: row,
        })
        .run();
      return { provider, hint: row.hint };
    },

    configured(rung) {
      const provider = providerOf(rung);
      const credentials = provider && preset[provider];
      return credentials ? { provider, hint: hintFor(credentials) } : null;
    },

    forget(sessionId) {
      db.delete(providerKeys)
        .where(eq(providerKeys.sessionId, sessionId))
        .run();
    },

    list(sessionId) {
      return [
        ...stored(sessionId).map((row) => ({
          provider: row.provider,
          source: "stored" as const,
          hint: row.hint,
        })),
        ...Object.entries(preset).map(([provider, credentials]) => ({
          provider: provider as Provider,
          source: "configured" as const,
          hint: hintFor(credentials),
        })),
      ];
    },

    credentials<P extends Provider>(sessionId: string, provider: P) {
      const row = db
        .select()
        .from(providerKeys)
        .where(
          and(
            eq(providerKeys.sessionId, sessionId),
            eq(providerKeys.provider, provider),
          ),
        )
        .get();
      if (!row)
        return (preset[provider] ?? null) as ProviderCredentials[P] | null;
      return JSON.parse(
        cipher.decrypt(row.ciphertext, cipherContext(sessionId, provider)),
      ) as ProviderCredentials[P];
    },
  };
}
