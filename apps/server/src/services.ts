import type { Db } from "./db/client.ts";
import type { EventLog } from "./events.ts";
import type { Finder } from "./finder.ts";
import type { KeyVault } from "./keys.ts";
import type { Recipients } from "./recipients/recipients.ts";
import type { RunEngine } from "./runs/engine.ts";
import type { NeutralWriter } from "./sends/neutral-writer.ts";
import type { SendGuard } from "./sends/guard.ts";

/** What the routes work with; `createApp` builds one set per app. */
export interface Services {
  db: Db;
  events: EventLog;
  engine: RunEngine;
  keyVault: KeyVault;
  finder: Finder;
  recipients: Recipients;
  guard: SendGuard;
  neutralWriter: NeutralWriter;
}
