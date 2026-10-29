import { tmpdir } from "node:os";
import { join } from "node:path";

/** Where the e2e server writes any outbound connection it attempted. */
export const OUTBOUND_LOG = join(tmpdir(), "rengas-e2e-outbound.log");

/** The same for the fake-provider server, kept apart so the two don't mix. */
export const FAKE_OUTBOUND_LOG = join(tmpdir(), "rengas-e2e-fake-outbound.log");
