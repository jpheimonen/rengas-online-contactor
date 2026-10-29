// Records what the old app does, so the new app can be checked against it.
// Reads the old ladder from commit f5b9e78, so it works without src/:
// node tests/parity/export-fixtures.ts
// It writes ladder.json and rules.json next to this file.
// Then run `pnpm format` so the JSON matches the repo style.

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const OLD_APP_COMMIT = "f5b9e78";
const oldSource = execFileSync(
  "git",
  ["show", `${OLD_APP_COMMIT}:src/ladder.ts`],
  {
    encoding: "utf8",
  },
);
const oldDir = mkdtempSync(join(tmpdir(), "old-ladder-"));
const oldFile = join(oldDir, "ladder.ts");
writeFileSync(oldFile, oldSource);
interface Rung {
  id: string;
}
const { RUNGS, canAttemptUnlock, currentLevel, isUnlocked, validateKey } =
  (await import(pathToFileURL(oldFile).href)) as {
    RUNGS: Rung[];
    canAttemptUnlock(index: number, unlocked: Set<string>): boolean;
    currentLevel(unlocked: Set<string>): number;
    isUnlocked(index: number, unlocked: Set<string>): boolean;
    validateKey(value: string): string | null;
  };

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "fixtures");
mkdirSync(outDir, { recursive: true });

writeJson("ladder.json", RUNGS);

// Every subset of rung ids, as a sorted list of ids.
const rungIds = RUNGS.map((r) => r.id);
const subsets: string[][] = [];
for (let mask = 0; mask < 1 << rungIds.length; mask++) {
  subsets.push(rungIds.filter((_, bit) => (mask & (1 << bit)) !== 0));
}

const unlockCases = subsets.map((subset) => {
  const unlocked = new Set(subset);
  return {
    unlocked: subset,
    isUnlocked: RUNGS.map((_, i) => isUnlocked(i, unlocked)),
    canAttemptUnlock: RUNGS.map((_, i) => canAttemptUnlock(i, unlocked)),
    currentLevel: currentLevel(unlocked),
  };
});

const keyStrings = [
  "",
  "   ",
  "\t",
  "abc",
  "abc def ghi",
  "abcdefg",
  "abcdefgh",
  "  sk-12345678  ",
  "SG.abcdef123",
  "sk-tts-xxxxxxxxxxxx",
  "abc\tdef123",
  "abcdefgh ",
  "a b c d e f g h",
];

const keyCases = keyStrings.map((value) => ({
  value,
  error: validateKey(value),
}));

writeJson("rules.json", { unlockCases, keyCases });

function writeJson(name: string, data: unknown): void {
  writeFileSync(join(outDir, name), JSON.stringify(data, null, 2) + "\n");
  console.log(`wrote ${name}`);
}
