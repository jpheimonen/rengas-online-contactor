import { CALL, getAction, type RunEvent } from "@rengas/shared";
import type { LogItem } from "../activity/log.ts";

export type CallStatus =
  "ringing" | "connecting" | "in-call" | "ended" | "failed";

type TranscriptEvent = Extract<RunEvent, { type: "transcript" }>;

/** A real call, read from its run's events in the activity log. */
export interface LiveCall {
  runId: string;
  /** The masked number from the run's "Calling …" line, such as +358 40 ••• 67. */
  recipient: string | null;
  status: CallStatus;
  /** When Twilio reported the call answered; the 90-second cap counts from here. */
  answeredAt: string | null;
  /** When the run ended, and the line that ended it. */
  endedAt: string | null;
  endText: string | null;
  /** Oldest first, unlike the log. */
  transcript: TranscriptEvent[];
}

/** Matches the call's first line, "Calling {recipient}, standing in for…". */
const CALLING = (() => {
  const { action } = getAction("ai-call");
  const template = action.mode === "real-capable" ? action.realLines[0]! : "";
  const [before, after] = template
    .split("{recipient}")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^${before}(.+?)${after}$`);
})();

/** Twilio statuses that mean the call is over before it was answered. */
const UNANSWERED = new Set(["busy", "no-answer", "canceled", "failed"]);

/**
 * The newest real `ai-call` run in the log, or null. The status follows the
 * events only: Twilio's answered status, Sisu's first line, and the run's end.
 */
export function latestCall(items: readonly LogItem[]): LiveCall | null {
  const started = items.find(
    (item): item is RunEvent =>
      item.type === "started" &&
      item.actionId === "ai-call" &&
      item.mode === "real",
  );
  if (!started || started.type === "system") return null;
  const runId = started.runId;

  const events = items
    .filter(
      (item): item is RunEvent =>
        item.type !== "local" && item.type !== "system" && item.runId === runId,
    )
    .reverse();

  let recipient: string | null = null;
  let answeredAt: string | null = null;
  let unanswered = false;
  let end: RunEvent | null = null;
  const transcript: TranscriptEvent[] = [];
  for (const event of events) {
    if (event.type === "step") {
      recipient ??= CALLING.exec(event.text)?.[1] ?? null;
    } else if (
      event.type === "provider-status" &&
      event.provider === "twilio"
    ) {
      if (event.status === "in-progress") answeredAt ??= event.at;
      if (UNANSWERED.has(event.status)) unanswered = true;
    } else if (event.type === "transcript") {
      transcript.push(event);
    } else if (
      event.type === "done" ||
      event.type === "failed" ||
      event.type === "cancelled"
    ) {
      end = event;
    }
  }

  let status: CallStatus;
  if (end) {
    status =
      end.type === "failed" || (unanswered && !answeredAt) ? "failed" : "ended";
  } else if (!answeredAt) status = "ringing";
  else status = transcript.length > 0 ? "in-call" : "connecting";

  return {
    runId,
    recipient,
    status,
    answeredAt,
    endedAt: end?.at ?? null,
    endText: end && "text" in end ? end.text : null,
    transcript,
  };
}

export const isLive = (call: LiveCall) =>
  call.status !== "ended" && call.status !== "failed";

/** Whole seconds between two ISO times, never negative. */
export const secondsBetween = (from: string, to: string | number) =>
  Math.max(
    0,
    Math.floor(
      ((typeof to === "number" ? to : Date.parse(to)) - Date.parse(from)) /
        1000,
    ),
  );

/** Seconds left of the cap, counted from the answered time. */
export const secondsLeft = (answeredAt: string, now: number) =>
  Math.max(0, CALL.maxSeconds - secondsBetween(answeredAt, now));

/** 72 → "01:12". */
export const mmss = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
