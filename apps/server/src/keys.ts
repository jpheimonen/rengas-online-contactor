import type { AppState, Provider, Rung } from "@rengas/shared";
import { problem } from "./errors.ts";

export interface AcceptedKey {
  provider: Provider;
  /** Masked hint such as "re_…a1b2". */
  hint: string;
}

/**
 * Where real provider keys are checked and kept (register decisions
 * provider-keys and unlock-modes). The unlock and reset endpoints call it; the
 * key-vault job supplies the real one.
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
}

/** Until the key vault exists, real keys are refused and nothing is configured. */
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
};
