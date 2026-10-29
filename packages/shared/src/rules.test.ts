import { describe, expect, it } from "vitest";
import { getRung, LADDER } from "./ladder.ts";
import {
  canAttemptUnlock,
  currentLevel,
  isUnlocked,
  validateKey,
  validateKeys,
} from "./rules.ts";

const ids = LADDER.map((rung) => rung.id);

describe("unlock rules on the new ladder", () => {
  it("starts at level 1 with only level 2 open for keys", () => {
    const none = new Set<string>();
    expect(isUnlocked(0, none)).toBe(true);
    expect(currentLevel(none)).toBe(0);
    expect(ids.filter((_, i) => canAttemptUnlock(i, none))).toEqual(["email"]);
  });

  it("can't skip a rung", () => {
    const skipped = new Set(["email", "sms"]);
    expect(isUnlocked(ids.indexOf("sms"), skipped)).toBe(false);
    expect(currentLevel(skipped)).toBe(ids.indexOf("email"));
    expect(canAttemptUnlock(ids.indexOf("roboemail"), skipped)).toBe(true);
  });

  it("reaches level 10 when every rung is unlocked", () => {
    const all = new Set<string>(ids);
    expect(currentLevel(all)).toBe(9);
    expect(ids.some((_, i) => canAttemptUnlock(i, all))).toBe(false);
  });
});

describe("key shape check", () => {
  it.each([
    ["", "Enter a key."],
    ["  ", "Enter a key."],
    ["abc def ghi", "Keys don't have spaces in them."],
    ["short", "Keys are at least 8 characters long."],
    ["  re_12345678  ", null],
  ])("validateKey(%j)", (value, error) => {
    expect(validateKey(value)).toBe(error);
  });

  it("returns errors by key id for every bad field", () => {
    expect(
      validateKeys(getRung("sms").keys, { "twilio-sid": "AC12345678" }),
    ).toEqual({ "twilio-token": "Enter a key." });
  });
});
