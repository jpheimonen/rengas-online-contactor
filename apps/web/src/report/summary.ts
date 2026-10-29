import { getAction, type ActionId, type RunEvent } from "@rengas/shared";
import type { LogItem } from "../activity/log.ts";
import { latestCall, secondsBetween } from "../call/call.ts";

export interface ClimbSummary {
  /** From the first run to the end of the last one, in seconds. */
  seconds: number;
  /** Real sends: finished emails and texts, answered calls and their seconds. */
  real: { email: number; sms: number; calls: number; callSeconds: number };
  /** Simulated runs that finished, by action label, in the order they first ran. */
  simulated: { label: string; count: number }[];
  /** Thoughts, set pieces and after lines that Sisu wrote just now. */
  aiWrittenLines: number;
}

type RunEventOfRun = Exclude<RunEvent, { type: "system" }>;

/** Real email and SMS count when they finish; calls count below, once answered. */
const REAL_CHANNEL: Partial<Record<ActionId, "email" | "sms">> = {
  "firm-email": "email",
  "polite-sms": "sms",
};

/**
 * Sums up the climb for the Case closed report, from the activity log since
 * the last De-escalate. The log already holds every run event of the session.
 */
export function summarize(items: readonly LogItem[]): ClimbSummary {
  const sinceReset: RunEventOfRun[] = [];
  for (const item of items) {
    if (item.type === "system" && item.kind === "de-escalate") break;
    if (item.type !== "local" && item.type !== "system") sinceReset.push(item);
  }
  const events = sinceReset.reverse();

  const summary: ClimbSummary = {
    seconds: 0,
    real: { email: 0, sms: 0, calls: 0, callSeconds: 0 },
    simulated: [],
    aiWrittenLines: 0,
  };
  let first: string | null = null;
  let last: string | null = null;
  for (const event of events) {
    if (event.type === "started") first ??= event.at;
    if ("aiWritten" in event && event.aiWritten) summary.aiWrittenLines += 1;
    if (event.type !== "done") continue;
    last = event.at;
    if (event.mode === "real") {
      const channel = REAL_CHANNEL[event.actionId];
      if (channel) summary.real[channel] += 1;
      continue;
    }
    const { label } = getAction(event.actionId).action;
    const row = summary.simulated.find((s) => s.label === label);
    if (row) row.count += 1;
    else summary.simulated.push({ label, count: 1 });
  }

  // A call counts once answered, even if you hung up; read as the call view reads it.
  const calls = events.filter(
    (e) =>
      e.type === "started" && e.actionId === "ai-call" && e.mode === "real",
  );
  for (const { runId } of calls) {
    const call = latestCall(events.filter((e) => e.runId === runId).reverse());
    if (!call?.answeredAt) continue;
    summary.real.calls += 1;
    if (call.endedAt)
      summary.real.callSeconds += secondsBetween(call.answeredAt, call.endedAt);
  }

  if (first && last) summary.seconds = secondsBetween(first, last);
  return summary;
}

/** 372 → "6 min 12 s". */
export const duration = (seconds: number) =>
  seconds < 60
    ? `${seconds} s`
    : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
