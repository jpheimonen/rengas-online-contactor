// Records what the old app does, so the new app can be checked against it.
// Run from the old app's code (commit f5b9e78) with: node tests/parity/export-fixtures.ts
// It writes ladder.json and rules.json next to this file. It does not change src/.
// Then run `pnpm format` so the JSON matches the repo style.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RUNGS,
  canAttemptUnlock,
  currentLevel,
  isUnlocked,
  validateKey,
} from "../../src/ladder.ts";

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
