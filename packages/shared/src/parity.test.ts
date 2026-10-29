/**
 * Parity rows 1–3 (task parity-plan.md): the old ladder's content and rules,
 * recorded in tests/parity/fixtures, replayed against the new ladder.
 */
import { describe, expect, it } from "vitest";
import oldLadder from "../../../tests/parity/fixtures/ladder.json";
import oldRules from "../../../tests/parity/fixtures/rules.json";
import {
  ADDED_RUNGS,
  KEY_RENAMES,
  RUNG_RENAMES,
} from "../../../tests/parity/renames.ts";
import { LADDER, RUNGS } from "./ladder.ts";
import {
  canAttemptUnlock,
  currentLevel,
  isUnlocked,
  validateKey,
} from "./rules.ts";

const newIndex = (id: string) => RUNGS.findIndex((rung) => rung.id === id);

describe("parity row 1: rungs, keys and actions", () => {
  it("maps every old rung to a new rung with the same threat label", () => {
    for (const old of oldLadder) {
      const renamed = RUNG_RENAMES[old.id];
      expect(renamed, old.id).toBeDefined();
      const rung = RUNGS[newIndex(renamed!.id)];
      expect(rung?.level, old.id).toBe(renamed!.level);
      expect(rung?.staffMood, old.id).toBe(old.threat);
    }
  });

  it("keeps the old rungs in their old order", () => {
    const newOrder = oldLadder.map((old) => newIndex(RUNG_RENAMES[old.id]!.id));
    expect(newOrder).toEqual([...newOrder].sort((a, b) => a - b));
  });

  it("accounts for every rung of the new ladder", () => {
    const mapped = Object.values(RUNG_RENAMES).map((r) => r.id);
    expect([...mapped, ...ADDED_RUNGS].sort()).toEqual(
      LADDER.map((rung) => rung.id).sort(),
    );
  });

  it("keeps every old action id on the same rung", () => {
    for (const old of oldLadder) {
      const rung = RUNGS[newIndex(RUNG_RENAMES[old.id]!.id)]!;
      for (const action of old.actions) {
        expect(
          rung.actions.map((a) => a.id),
          `${old.id}/${action.id}`,
        ).toContain(action.id);
      }
    }
  });

  it("keeps or explicitly renames every old key", () => {
    for (const old of oldLadder) {
      const rung = RUNGS[newIndex(RUNG_RENAMES[old.id]!.id)]!;
      const expected = old.keys
        .map((key) => (key.id in KEY_RENAMES ? KEY_RENAMES[key.id] : key.id))
        .filter((id) => id !== null);
      expect(
        rung.keys.map((key) => key.id),
        old.id,
      ).toEqual(expected);
    }
  });

  it("keeps the robocall speech text", () => {
    const oldSpeech = oldLadder
      .flatMap((rung) => rung.actions)
      .find((action) => action.id === "robocall");
    const robocall = RUNGS.flatMap((rung) => rung.actions).find(
      (action) => action.id === "robocall",
    );
    expect(robocall && "speech" in robocall && robocall.speech).toBe(
      oldSpeech && "speech" in oldSpeech ? oldSpeech.speech : undefined,
    );
  });
});

describe("parity row 2: next-rung-only unlocking", () => {
  it("the shared rules reproduce every recorded case on the old ladder", () => {
    for (const recorded of oldRules.unlockCases) {
      const unlocked = new Set(recorded.unlocked);
      oldLadder.forEach((_, i) => {
        expect(isUnlocked(i, unlocked, oldLadder)).toBe(recorded.isUnlocked[i]);
        expect(canAttemptUnlock(i, unlocked, oldLadder)).toBe(
          recorded.canAttemptUnlock[i],
        );
      });
      expect(currentLevel(unlocked, oldLadder)).toBe(recorded.currentLevel);
    }
  });

  /**
   * The same cases on the new ladder. Old rung ids are renamed; rent-a-human
   * now sits below the blimp, so it counts as unlocked whenever the old case
   * reached the blimp's step, which keeps "the blimp needs every rung below".
   */
  it("the new ladder gives the same answers for the renamed rungs", () => {
    for (const recorded of oldRules.unlockCases) {
      const unlocked = new Set<string>(
        recorded.unlocked.map((id) => RUNG_RENAMES[id]!.id),
      );
      unlocked.add("rent-a-human");

      oldLadder.forEach((old, oldIdx) => {
        const i = newIndex(RUNG_RENAMES[old.id]!.id);
        expect(isUnlocked(i, unlocked), `${old.id}`).toBe(
          recorded.isUnlocked[oldIdx],
        );
        expect(canAttemptUnlock(i, unlocked), `${old.id}`).toBe(
          recorded.canAttemptUnlock[oldIdx],
        );
      });

      // With the old top at osint, the always-unlocked rent-a-human is now the top.
      const oldTop = oldLadder[recorded.currentLevel]!.id;
      const expectedTop =
        oldTop === "osint" ? "rent-a-human" : RUNG_RENAMES[oldTop]!.id;
      expect(LADDER[currentLevel(unlocked)]!.id).toBe(expectedTop);
    }
  });

  it("an added rung blocks the rungs above it until it is unlocked", () => {
    const belowRentAHuman = new Set<string>(
      LADDER.slice(1, newIndex("rent-a-human")).map((rung) => rung.id),
    );
    belowRentAHuman.add("blimp");
    expect(isUnlocked(newIndex("blimp"), belowRentAHuman)).toBe(false);
    expect(canAttemptUnlock(newIndex("blimp"), belowRentAHuman)).toBe(false);
    expect(canAttemptUnlock(newIndex("rent-a-human"), belowRentAHuman)).toBe(
      true,
    );
  });
});

describe("parity row 3: key shape errors", () => {
  it.each(oldRules.keyCases)("validateKey(%j)", ({ value, error }) => {
    expect(validateKey(value)).toBe(error);
  });
});
