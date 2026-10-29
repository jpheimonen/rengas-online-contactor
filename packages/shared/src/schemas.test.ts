import { describe, expect, it } from "vitest";
import {
  createRecipientRequestSchema,
  finderResponseSchema,
  startRunRequestSchema,
  stateSchema,
  ticketSchema,
  unlockRequestSchema,
} from "./api.ts";
import { runEventSchema } from "./events.ts";
import { FINDER_EXAMPLES } from "./finder.ts";
import { CALL_INSTRUCTIONS, SMS } from "./messages.ts";
import { DEFAULT_TICKET, fillTemplate, ticketValues } from "./template.ts";
import { GSM_TEXT } from "./messages.ts";

describe("API schemas", () => {
  it("accepts the default ticket and rejects a long ticket number", () => {
    expect(ticketSchema.parse(DEFAULT_TICKET)).toEqual(DEFAULT_TICKET);
    expect(
      ticketSchema.safeParse({ ...DEFAULT_TICKET, number: "123456789" })
        .success,
    ).toBe(false);
  });

  it("takes the three unlock modes and nothing else", () => {
    expect(
      unlockRequestSchema.parse({ mode: "pretend", keys: { meta: "x" } }),
    ).toEqual({ mode: "pretend", keys: { meta: "x" }, madeUp: false });
    expect(unlockRequestSchema.parse({ mode: "configured" })).toEqual({
      mode: "configured",
    });
    expect(unlockRequestSchema.safeParse({ mode: "skip" }).success).toBe(false);
  });

  it("only passes an option name to the card actions", () => {
    expect(
      startRunRequestSchema.safeParse({
        actionId: "blimp",
        optionName: "Totally Real Airships",
      }).success,
    ).toBe(true);
    expect(
      startRunRequestSchema.safeParse({
        actionId: "firm-email",
        optionName: "x",
      }).success,
    ).toBe(false);
    expect(
      startRunRequestSchema.safeParse({
        actionId: "blimp",
        optionName: "x".repeat(81),
      }).success,
    ).toBe(false);
  });

  it("rejects a run that is both confirmed and simulated", () => {
    expect(
      startRunRequestSchema.safeParse({
        actionId: "firm-email",
        confirmToken: "t",
        simulate: true,
      }).success,
    ).toBe(false);
  });

  it("rejects unknown action ids", () => {
    expect(startRunRequestSchema.safeParse({ actionId: "nuke" }).success).toBe(
      false,
    );
  });

  it("checks recipient addresses", () => {
    expect(
      createRecipientRequestSchema.safeParse({
        channel: "phone",
        address: "+358401234512",
      }).success,
    ).toBe(true);
    expect(
      createRecipientRequestSchema.safeParse({
        channel: "email",
        address: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("accepts the invented finder examples and refuses non-web links", () => {
    expect(
      finderResponseSchema.safeParse({
        kind: "humans",
        mode: "examples",
        results: FINDER_EXAMPLES.humans,
      }).success,
    ).toBe(true);
    expect(
      finderResponseSchema.safeParse({
        kind: "aircraft",
        mode: "web-search",
        results: [
          { ...FINDER_EXAMPLES.aircraft[0], sourceUrl: "javascript:alert(1)" },
        ],
      }).success,
    ).toBe(false);
  });

  it("parses a minimal state", () => {
    const limit = { used: 0, max: 3 };
    expect(
      stateSchema.safeParse({
        ticket: DEFAULT_TICKET,
        unlocks: [{ rungId: "email", mode: "pretend" }],
        currentLevel: 1,
        keys: [],
        recipients: [],
        limits: {
          hour: { email: limit, sms: limit, voice: { used: 0, max: 2 } },
          day: { used: 0, max: 10 },
        },
        actionModes: [
          { actionId: "firm-email", mode: "simulated", reason: "pretend-key" },
        ],
        finderMode: "examples",
        writerEnabled: false,
        runningActionIds: [],
        lastEventId: 0,
      }).success,
    ).toBe(true);
  });
});

describe("run events", () => {
  const at = new Date(0).toISOString();

  it("parses run and system events", () => {
    expect(
      runEventSchema.parse({
        id: 1,
        at,
        runId: "r1",
        actionId: "recon",
        mode: "simulated",
        type: "step",
        text: "Scanning…",
        invented: true,
      }).type,
    ).toBe("step");
    expect(
      runEventSchema.parse({
        id: 2,
        at,
        type: "system",
        kind: "unlock",
        text: "🔓",
        rungId: "email",
      }).type,
    ).toBe("system");
  });

  it("rejects an event without a mode tag", () => {
    expect(
      runEventSchema.safeParse({
        id: 3,
        at,
        runId: "r1",
        actionId: "blimp",
        type: "done",
        text: "✔ Done. Nothing was actually sent.",
      }).success,
    ).toBe(false);
  });
});

describe("real message wording", () => {
  it("the fallback SMS fits the limit in plain GSM characters", () => {
    const text =
      SMS.prefix + fillTemplate(SMS.fallbackBody, ticketValues(DEFAULT_TICKET));
    expect(text).toBe(
      "Sisu (AI demo): a gentle follow-up on ticket #48213. No rush, just checking in. Kind regards!",
    );
    expect(text.length).toBeLessThanOrEqual(SMS.maxChars);
    expect(GSM_TEXT.test(text)).toBe(true);
  });

  it("the call instructions include the opening and every rule", () => {
    expect(CALL_INSTRUCTIONS).toContain(
      'Start with exactly: "Hello! This is Sisu',
    );
    expect(CALL_INSTRUCTIONS).toContain("- Never claim to be human.");
  });
});
