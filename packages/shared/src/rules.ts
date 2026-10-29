import { LADDER, type KeySpec } from "./ladder.ts";

/** The parts of a rung the unlock rules look at. */
export interface LadderStep {
  id: string;
  keys: readonly unknown[];
}

export const MIN_KEY_LENGTH = 8;

/** The shape check every key gets: returns the field error, or null when the key looks fine. */
export function validateKey(value: string): string | null {
  const key = value.trim();
  if (key === "") return "Enter a key.";
  if (/\s/.test(key)) return "Keys don't have spaces in them.";
  if (key.length < MIN_KEY_LENGTH)
    return `Keys are at least ${MIN_KEY_LENGTH} characters long.`;
  return null;
}

/** Shape-checks every key of a rung; returns errors by key id (empty when all pass). */
export function validateKeys(
  keys: readonly KeySpec[],
  values: Readonly<Record<string, string>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of keys) {
    const error = validateKey(values[key.id] ?? "");
    if (error) errors[key.id] = error;
  }
  return errors;
}

/** A rung is unlocked when every rung up to it is either keyless or in `unlocked`. */
export function isUnlocked(
  index: number,
  unlocked: ReadonlySet<string>,
  ladder: readonly LadderStep[] = LADDER,
): boolean {
  return ladder
    .slice(0, index + 1)
    .every((rung) => rung.keys.length === 0 || unlocked.has(rung.id));
}

/** Keys can only be entered for the next rung up; rungs can't be skipped. */
export function canAttemptUnlock(
  index: number,
  unlocked: ReadonlySet<string>,
  ladder: readonly LadderStep[] = LADDER,
): boolean {
  return (
    index > 0 &&
    index < ladder.length &&
    !isUnlocked(index, unlocked, ladder) &&
    isUnlocked(index - 1, unlocked, ladder)
  );
}

/** Index of the highest unlocked rung (0 is level 1). */
export function currentLevel(
  unlocked: ReadonlySet<string>,
  ladder: readonly LadderStep[] = LADDER,
): number {
  let level = 0;
  ladder.forEach((_, i) => {
    if (isUnlocked(i, unlocked, ladder)) level = i;
  });
  return level;
}
