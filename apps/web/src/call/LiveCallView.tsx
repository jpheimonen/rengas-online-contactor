import { CALL } from "@rengas/shared";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SisuMark } from "../shell/SisuMark.tsx";
import {
  isLive,
  mmss,
  secondsBetween,
  secondsLeft,
  type CallStatus,
  type LiveCall,
} from "./call.ts";

/** How long after answering, with no transcript, to say the transcript is unavailable. */
const TRANSCRIPT_GRACE_MS = 10_000;

const STEPS: { status: CallStatus; label: string }[] = [
  { status: "ringing", label: "Ringing" },
  { status: "connecting", label: "Connecting Sisu" },
  { status: "in-call", label: "In call" },
  { status: "ended", label: "Ended" },
];

export interface HangUpControl {
  /** True from the click until the call's end event arrives. */
  ending: boolean;
  error: string | null;
  hangUp: () => void;
}

/** The current time, ticking while `active`. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

const headline: Record<CallStatus, string> = {
  ringing: "Calling your phone…",
  connecting: "Connecting Sisu…",
  "in-call": "Sisu is on the line.",
  ended: "Call ended.",
  failed: "The call didn't go through.",
};

/**
 * The live call: status, countdown, the transcript as it streams, Hang up.
 * The call happens on the operator's verified phone, not in the browser.
 */
export function LiveCallView({
  call,
  control,
  onBack,
}: {
  call: LiveCall;
  control: HangUpControl;
  onBack: () => void;
}) {
  const live = isLive(call);
  const now = useNow(live);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  const silent =
    call.status === "connecting" &&
    call.answeredAt !== null &&
    now - Date.parse(call.answeredAt) > TRANSCRIPT_GRACE_MS;
  const status: CallStatus = silent ? "in-call" : call.status;
  const shown = control.ending && live ? "Ending call…" : headline[status];

  return (
    <section className="call" aria-labelledby="call-title">
      <div className="call-panel">
        <header className="call-head">
          <SisuMark />
          <div className="call-who">
            <h2 id="call-title" ref={heading} tabIndex={-1}>
              {shown} <span className="mark mark-real">REAL</span>
            </h2>
            <p className="call-phone">
              {call.recipient && (
                <>
                  <span className="mono">{call.recipient}</span> ·{" "}
                </>
              )}
              Your verified phone
            </p>
          </div>
          <CallClock call={call} now={now} />
        </header>
        <p className="call-hint">
          <strong>Answer like you work there:</strong> Rengas Online customer
          service, how can I help?
          {call.status === "ringing" &&
            " If you hear a Twilio trial notice first, press any key to connect Sisu."}
        </p>
        <Transcript call={call} silent={silent} />
        {call.endText && !live && (
          <p
            className={
              call.status === "failed" ? "call-end failed" : "call-end"
            }
          >
            {call.endText}
          </p>
        )}
      </div>
      <aside className="call-facts" aria-label="On this call">
        <h3>On this call</h3>
        <ul>
          <li>⏱ {CALL.maxSeconds}-second maximum</li>
          <li>📞 Only your verified phone is connected.</li>
          <li>🤖 Sisu says it is an AI agent.</li>
          <li>✋ Ask Sisu to stop, or use Hang up.</li>
        </ul>
      </aside>
      <footer className="call-foot">
        <button type="button" className="button outline" onClick={onBack}>
          ← Back to ladder
        </button>
        <ol className="call-steps" aria-label="Call progress">
          {STEPS.map((step, index) => {
            const current = STEPS.findIndex(
              (s) => s.status === (status === "failed" ? "ended" : status),
            );
            const label =
              step.status === "ended" && status === "failed"
                ? "Failed"
                : step.label;
            return (
              <li
                key={step.status}
                className={
                  index < current ? "done" : index === current ? "now" : ""
                }
                aria-current={index === current ? "step" : undefined}
              >
                {label}
              </li>
            );
          })}
        </ol>
        {live && (
          <button
            type="button"
            className="button hang-up"
            disabled={control.ending}
            onClick={control.hangUp}
          >
            {control.ending ? "Ending call…" : "Hang up"}
          </button>
        )}
        {control.error && (
          <p className="form-error" role="alert">
            {control.error}
          </p>
        )}
      </footer>
    </section>
  );
}

/** Time left once answered, the duration once ended; nothing while ringing. */
function CallClock({ call, now }: { call: LiveCall; now: number }) {
  if (!call.answeredAt) {
    return (
      <p className="call-clock">
        <span className="call-clock-main">--:--</span>
        <span>{CALL.maxSeconds}-second maximum</span>
      </p>
    );
  }
  if (call.endedAt) {
    return (
      <p className="call-clock">
        <span className="call-clock-main mono">
          {mmss(secondsBetween(call.answeredAt, call.endedAt))}
        </span>
        <span>Call length</span>
      </p>
    );
  }
  return (
    <p className="call-clock">
      <span className="call-clock-main mono">
        {mmss(secondsLeft(call.answeredAt, now))} left
      </span>
      <span>{CALL.maxSeconds}-second maximum</span>
    </p>
  );
}

/**
 * Oldest line first. It follows new lines only while you are at the bottom;
 * otherwise it offers Jump to latest and leaves your place alone.
 */
function Transcript({ call, silent }: { call: LiveCall; silent: boolean }) {
  const list = useRef<HTMLOListElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [seen, setSeen] = useState(call.transcript.length);
  const count = call.transcript.length;

  useLayoutEffect(() => {
    const element = list.current;
    if (element && atBottom) element.scrollTop = element.scrollHeight;
  }, [count, atBottom]);
  if (atBottom && seen !== count) setSeen(count);
  const unseen = count - seen;

  const start = call.answeredAt;
  return (
    <div className="transcript-wrap">
      {count === 0 ? (
        <p className="transcript-empty">
          {silent
            ? "Call connected. Transcript unavailable."
            : "The transcript appears here when Sisu starts talking."}
        </p>
      ) : (
        <ol
          ref={list}
          className="transcript"
          aria-label="Call transcript"
          aria-live="polite"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the transcript scrolls by itself, so keyboard users must be able to focus it
          tabIndex={0}
          onScroll={(event) => {
            const el = event.currentTarget;
            setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
          }}
        >
          {call.transcript.map((line) => (
            <li
              key={line.id}
              className={line.speaker === "sisu" ? "line sisu" : "line them"}
            >
              <p className="line-who">
                {line.speaker === "sisu" ? "Sisu" : "Rengas Online (you)"}
                {start && (
                  <span className="mono">
                    {" "}
                    · {mmss(secondsBetween(start, line.at))}
                  </span>
                )}
              </p>
              <p className="line-text">{line.text}</p>
            </li>
          ))}
        </ol>
      )}
      {unseen > 0 && (
        <button
          type="button"
          className="button small jump"
          onClick={() => setAtBottom(true)}
        >
          {unseen} new {unseen === 1 ? "line" : "lines"} · Jump to latest ↓
        </button>
      )}
    </div>
  );
}

/** Shown on the ladder while a call goes on and its view is closed. */
export function LiveCallStrip({
  call,
  control,
  onView,
}: {
  call: LiveCall;
  control: HangUpControl;
  onView: () => void;
}) {
  const now = useNow(true);
  return (
    <div className="call-strip" role="region" aria-label="Live call">
      <span className="mark mark-real">REAL</span>
      <span>
        📞 Live call ·{" "}
        {call.answeredAt ? (
          <span className="mono">
            {mmss(secondsLeft(call.answeredAt, now))} left
          </span>
        ) : (
          "Ringing…"
        )}
      </span>
      <button type="button" className="button small outline" onClick={onView}>
        View call
      </button>
      <button
        type="button"
        className="button small hang-up"
        disabled={control.ending}
        onClick={control.hangUp}
      >
        {control.ending ? "Ending call…" : "Hang up"}
      </button>
    </div>
  );
}
