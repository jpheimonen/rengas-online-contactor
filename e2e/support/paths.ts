import { tmpdir } from "node:os";
import { join } from "node:path";

/** Where the e2e server writes any outbound connection it attempted. */
export const OUTBOUND_LOG = join(tmpdir(), "rengas-e2e-outbound.log");

/** The same for the fake-provider server, kept apart so the two don't mix. */
export const FAKE_OUTBOUND_LOG = join(tmpdir(), "rengas-e2e-fake-outbound.log");

/** Every Resend, Twilio and OpenAI call the recording server was asked to make. */
export const PROVIDER_LOG = join(tmpdir(), "rengas-e2e-providers.log");

/** The same server's outbound connection log. */
export const RECORDING_OUTBOUND_LOG = join(
  tmpdir(),
  "rengas-e2e-recording-outbound.log",
);

/** The OpenAI key the recording server has in its environment, so its writer runs from level 1. */
export const RECORDING_OPENAI_KEY = "sk_rec_from_env";
