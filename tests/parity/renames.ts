/**
 * The rename tables between the old ladder in tests/parity/fixtures and the
 * new one in packages/shared. The shared and server parity tests both use them.
 */
import type { RungId } from "../../packages/shared/src/ladder.ts";

/**
 * What the product concept (section 14) changed. Every old rung maps to a new
 * rung; old keys map to new keys, or to null when dropped.
 */
export const RUNG_RENAMES: Record<string, { id: RungId; level: number }> = {
  polite: { id: "polite", level: 1 },
  email: { id: "email", level: 2 },
  roboemail: { id: "roboemail", level: 3 },
  sms: { id: "sms", level: 4 },
  robocall: { id: "robocall", level: 5 },
  social: { id: "social", level: 6 },
  osint: { id: "osint", level: 7 },
  blimp: { id: "blimp", level: 9 },
};

export const KEY_RENAMES: Record<string, string | null> = {
  smtp: "resend",
  "sms-sid": "twilio-sid",
  "sms-token": "twilio-token",
  voice: null, // calls use the Twilio account from level 4
  tts: "openai",
};

/** Rungs the concept added; they sit between old rungs and are not in the fixtures. */
export const ADDED_RUNGS: readonly RungId[] = ["rent-a-human", "singularity"];
