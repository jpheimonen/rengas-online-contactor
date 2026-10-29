import type { RunEvent } from "@rengas/shared";
import { describe, expect, it } from "vitest";
import type { LogItem } from "../activity/log.ts";
import { latestCall, mmss, secondsLeft } from "./call.ts";

const T0 = Date.parse("2026-10-29T12:00:00.000Z");
let nextId = 1;

/** One event of a call run, `seconds` after T0. */
function event(
  seconds: number,
  body: Record<string, unknown>,
  runId = "run-call",
): RunEvent {
  return {
    id: nextId++,
    at: new Date(T0 + seconds * 1000).toISOString(),
    runId,
    actionId: "ai-call",
    mode: "real",
    ...body,
  } as RunEvent;
}

const started = (runId = "run-call", mode = "real") =>
  event(0, { type: "started", label: "Place a live AI call", mode }, runId);
const twilio = (seconds: number, status: string) =>
  event(seconds, {
    type: "provider-status",
    provider: "twilio",
    status,
    text: status,
  });
const said = (seconds: number, speaker: "sisu" | "them", text: string) =>
  event(seconds, { type: "transcript", speaker, text });

/** The log is newest first. */
const log = (...events: LogItem[]) => events.reverse();

describe("latestCall", () => {
  it("is null without a real call, and ignores the simulated one", () => {
    expect(latestCall([])).toBeNull();
    expect(latestCall(log(started("sim", "simulated")))).toBeNull();
  });

  it("rings until Twilio says answered, then connects Sisu until it speaks", () => {
    const ringing = [
      started(),
      event(0, {
        type: "step",
        text: "Calling +358 40 ••• 67, standing in for Rengas Online…",
        invented: false,
      }),
      twilio(1, "ringing"),
    ];
    expect(latestCall(log(...ringing))).toMatchObject({
      status: "ringing",
      answeredAt: null,
      recipient: "+358 40 ••• 67",
    });

    const answered = [...ringing, twilio(5, "in-progress")];
    expect(latestCall(log(...answered))).toMatchObject({
      status: "connecting",
      answeredAt: new Date(T0 + 5000).toISOString(),
    });

    const call = latestCall(
      log(...answered, said(7, "sisu", "Hello!"), said(9, "them", "Hi.")),
    );
    expect(call?.status).toBe("in-call");
    expect(call?.transcript.map((line) => line.text)).toEqual([
      "Hello!",
      "Hi.",
    ]);
  });

  it("ends on done or a hang-up, and fails on a failed run or no answer", () => {
    const base = [started(), twilio(5, "in-progress")];
    expect(
      latestCall(
        log(...base, event(40, { type: "cancelled", text: "📞 You hung up." })),
      ),
    ).toMatchObject({ status: "ended", endText: "📞 You hung up." });
    expect(
      latestCall(log(...base, event(40, { type: "failed", text: "✖ Lost." }))),
    ).toMatchObject({ status: "failed" });
    expect(
      latestCall(
        log(
          started(),
          twilio(30, "no-answer"),
          event(31, { type: "done", text: "Done." }),
        ),
      )?.status,
    ).toBe("failed");
  });

  it("follows the newest call only", () => {
    const call = latestCall(
      log(started("first"), said(1, "sisu", "Old call."), started("second")),
    );
    expect(call?.runId).toBe("second");
    expect(call?.transcript).toEqual([]);
  });
});

describe("the countdown", () => {
  it("counts the 90 seconds from the answered time and stops at zero", () => {
    const answered = new Date(T0).toISOString();
    expect(secondsLeft(answered, T0 + 48_400)).toBe(42);
    expect(secondsLeft(answered, T0 + 120_000)).toBe(0);
    expect(mmss(72)).toBe("01:12");
  });
});
