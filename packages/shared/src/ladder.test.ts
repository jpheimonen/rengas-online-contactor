import { describe, expect, it } from "vitest";
import { ACTION_IDS, LADDER, RUNGS, getAction } from "./ladder.ts";
import { validateKey } from "./rules.ts";
import { PLACEHOLDERS } from "./template.ts";

const actions = RUNGS.flatMap((rung) => rung.actions);

describe("ladder content", () => {
  it("has 10 rungs at levels 1 to 10, in order", () => {
    expect(LADDER.map((rung) => rung.level)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it("has unique rung, action and key ids", () => {
    const unique = (ids: string[]) => new Set(ids).size === ids.length;
    expect(unique(RUNGS.map((r) => r.id))).toBe(true);
    expect(unique([...ACTION_IDS])).toBe(true);
    expect(unique(RUNGS.flatMap((r) => r.keys.map((k) => k.id)))).toBe(true);
  });

  it("needs no keys at level 1 and at least one key everywhere else", () => {
    RUNGS.forEach((rung, i) =>
      expect(rung.keys.length > 0, rung.id).toBe(i > 0),
    );
  });

  it("only the neutral email, SMS and call can run for real", () => {
    const real = actions.filter((a) => a.mode === "real-capable");
    expect(real.map((a) => [a.id, a.channel])).toEqual([
      ["firm-email", "email"],
      ["polite-sms", "sms"],
      ["ai-call", "voice"],
    ]);
  });

  it("keeps the abusive actions simulation-only", () => {
    for (const id of [
      "email-storm",
      "threat-sms",
      "robocall",
      "fb-siege",
      "recon",
      "dispatch-human",
      "blimp",
      "take-the-job",
    ] as const) {
      expect(getAction(id).action.mode, id).toBe("simulation-only");
    }
  });

  it("makes no writer call for threat-sms and recon only", () => {
    const noWriter = actions
      .filter((a) => a.mode === "simulation-only" && !a.writer)
      .map((a) => a.id);
    expect(noWriter).toEqual(["threat-sms", "recon"]);
  });

  it("marks every recon line as invented", () => {
    const { action } = getAction("recon");
    expect(action.mode === "simulation-only" && action.inventedLines).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it("finders start simulation-only actions on their own rung", () => {
    for (const rung of RUNGS) {
      for (const finder of rung.actions.filter((a) => a.mode === "finder")) {
        const started = rung.actions.find((a) => a.id === finder.startsAction);
        expect(started?.mode, finder.id).toBe("simulation-only");
      }
    }
  });

  it("real keys belong only to the rungs with real-capable actions", () => {
    const realKeyRungs = RUNGS.filter((rung) =>
      rung.keys.some((key) => key.kind === "real"),
    ).map((rung) => rung.id);
    expect(realKeyRungs).toEqual(["email", "sms", "robocall"]);
  });

  it("every made-up key passes the shape check, with one value per key pair", () => {
    for (const rung of RUNGS) {
      const counts = new Set(rung.keys.map((key) => key.madeUp.length));
      expect(counts.size, rung.id).toBeLessThanOrEqual(1);
      for (const key of rung.keys) {
        for (const value of key.madeUp) {
          expect(validateKey(value), `${key.id}: ${value}`).toBeNull();
        }
      }
    }
  });

  it("uses only known placeholders", () => {
    const known = new Set<string>(PLACEHOLDERS);
    const texts = actions.flatMap((a) => [
      a.thought,
      a.after,
      ...("lines" in a ? a.lines : []),
      ...("simulatedLines" in a ? [...a.simulatedLines, ...a.realLines] : []),
      ...("cardLine" in a && a.cardLine ? [a.cardLine] : []),
      ...("setPiece" in a && a.setPiece ? a.setPiece.fallback : []),
    ]);
    for (const text of texts) {
      for (const [, name] of text.matchAll(/\{(\w+)\}/g)) {
        expect(known, text).toContain(name);
      }
    }
  });

  it("places each set piece in its action's lines", () => {
    for (const action of actions) {
      if (action.mode !== "simulation-only" || !action.setPiece) continue;
      const token = `{${action.setPiece.slot}}`;
      expect(
        action.lines.some((line) => line.includes(token)),
        action.id,
      ).toBe(true);
    }
  });
});
