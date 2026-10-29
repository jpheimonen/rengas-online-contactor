import { describe, expect, it } from "vitest";
import {
  RUNGS,
  canAttemptUnlock,
  currentLevel,
  isUnlocked,
  validateKey,
} from "./ladder";

const ids = (...names: string[]) => new Set(names);

describe("escalation ladder", () => {
  it("starts with only the polite level open and no keys needed for it", () => {
    expect(RUNGS[0].keys).toEqual([]);
    expect(isUnlocked(0, ids())).toBe(true);
    expect(RUNGS.slice(1).every((_, i) => !isUnlocked(i + 1, ids()))).toBe(
      true,
    );
    expect(currentLevel(ids())).toBe(0);
  });

  it("needs keys for every level above the first", () => {
    expect(RUNGS.slice(1).every((r) => r.keys.length > 0)).toBe(true);
  });

  it("only lets you enter keys for the next level up", () => {
    expect(canAttemptUnlock(0, ids())).toBe(false);
    expect(canAttemptUnlock(1, ids())).toBe(true);
    expect(canAttemptUnlock(2, ids())).toBe(false);
    expect(canAttemptUnlock(2, ids("email"))).toBe(true);
    expect(canAttemptUnlock(1, ids("email"))).toBe(false);
  });

  it("does not open a level whose lower levels are still locked", () => {
    expect(isUnlocked(3, ids("sms"))).toBe(false);
    expect(isUnlocked(3, ids("email", "roboemail", "sms"))).toBe(true);
    expect(currentLevel(ids("email", "sms"))).toBe(1);
  });

  it("puts robocalls and robo-emails before the social media rungs", () => {
    const order = RUNGS.map((r) => r.id);
    expect(order.indexOf("roboemail")).toBeLessThan(order.indexOf("social"));
    expect(order.indexOf("robocall")).toBeLessThan(order.indexOf("social"));
  });

  it("gives every rung at least one action with a script", () => {
    for (const rung of RUNGS) {
      expect(rung.actions.length).toBeGreaterThan(0);
      for (const action of rung.actions)
        expect(action.script.length).toBeGreaterThan(0);
    }
  });

  it("uses unique ids for rungs, keys and actions", () => {
    const all = RUNGS.flatMap((r) => [
      r.id,
      ...r.keys.map((k) => `key:${k.id}`),
      ...r.actions.map((a) => `action:${a.id}`),
    ]);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("validateKey", () => {
  it("accepts anything key-shaped", () => {
    expect(validateKey("SG.abcdef123")).toBeNull();
    expect(validateKey("  sk-12345678  ")).toBeNull();
  });

  it("rejects empty, short and spaced keys", () => {
    expect(validateKey("   ")).toBe("Enter a key.");
    expect(validateKey("abc")).toMatch(/at least 8/);
    expect(validateKey("abc def ghi")).toMatch(/spaces/);
  });
});
