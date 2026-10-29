import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";

const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url),
);

/** Opens the SQLite file (or `:memory:`) and brings its schema up to date. Queries run synchronously. */
export function openDatabase(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const client = new DatabaseSync(path);
  client.exec("PRAGMA foreign_keys = ON;");
  if (path !== ":memory:") client.exec("PRAGMA journal_mode = WAL;");
  const db = drizzle({ client });
  migrate(db, { migrationsFolder });
  return db;
}

export type Db = ReturnType<typeof openDatabase>;
