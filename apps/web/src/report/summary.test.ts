import type { RunEvent } from "@rengas/shared";
import { describe, expect, it } from "vitest";
import type { LogItem } from "../activity/log.ts";
import { duration, summarize } from "./summary.ts";

const T0 = Date.parse("2026-10-29T12:00:00.000Z");
let nextId = 1;
const at = (seconds: number) => new Date(T0 + seconds * 1000).toISOString();

function run(
  seconds: number,
  actionId: string,
  mode: "real" | "simulated",
  body: Record<string, unknown>,
  runId = `${actionId}-${mode}`,
): RunEvent {
  return {
    id: nextId++,
    at: at(seconds),
    runId,
    actionId,
    mode,
    ...body,
  } as RunEvent;
}

const started = (
  s: number,
  actionId: string,
  mode: "real" | "simulated" = "simulated",
) => run(s, actionId, mode, { type: "started", label: actionId });
const done = (
  s: number,
  actionId: string,
  mode: "real" | "simulated" = "simulated",
) => run(s, actionId, mode, { type: "done", text: "Done." });

/** The log is newest first. */
const log = (...events: LogItem[]) => events.reverse();

describe("summarize", () => {
  it("counts the climb since the last De-escalate", () => {
    const summary = summarize(
      log(
        started(0, "contact-form"),
        done(5, "contact-form"),
        {
          id: nextId++,
          at: at(6),
          type: "system",
          kind: "de-escalate",
          text: "😇 De-escalated.",
        } as RunEvent,
        started(100, "contact-form"),
        run(101, "contact-form", "simulated", {
          type: "thought",
          text: "Hm.",
          aiWritten: true,
        }),
        done(110, "contact-form"),
        started(120, "firm-email", "real"),
        done(125, "firm-email", "real"),
        started(130, "ai-call", "real"),
        run(140, "ai-call", "real", {
          type: "provider-status",
          provider: "twilio",
          status: "in-progress",
          text: "answered",
        }),
        run(212, "ai-call", "real", {
          type: "cancelled",
          text: "📞 You hung up.",
        }),
        started(300, "blimp"),
        done(310, "blimp"),
        started(320, "blimp", "simulated"),
        done(330, "blimp"),
      ),
    );
    expect(summary).toEqual({
      seconds: 230,
      real: { email: 1, sms: 0, calls: 1, callSeconds: 72 },
      simulated: [
        { label: "Fill in the website contact form", count: 1 },
        { label: "Deploy the blimp", count: 2 },
      ],
      aiWrittenLines: 1,
    });
  });

  it("formats the time", () => {
    expect(duration(42)).toBe("42 s");
    expect(duration(372)).toBe("6 min 12 s");
  });
});
