import { tmpdir } from "node:os";
import { join } from "node:path";

/** Where the e2e server writes any outbound connection it attempted. */
export const OUTBOUND_LOG = join(tmpdir(), "rengas-e2e-outbound.log");
