import { useEffect, useId, useRef } from "react";
import { useReset } from "../api/queries.ts";
import { Mark } from "../Mark.tsx";
import { stopSpeech } from "../speech/speech.ts";
import { duration, type ClimbSummary } from "./summary.ts";

/**
 * The Case closed report after Sisu answers its own ticket. A normal dialog:
 * Escape and Close dismiss it, and the browser returns focus to where it was.
 */
export function CaseClosed({
  ticket,
  summary,
  onClose,
}: {
  ticket: string;
  summary: ClimbSummary;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const reset = useReset();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    heading.current?.focus();
    element.addEventListener("close", onClose);
    return () => {
      element.removeEventListener("close", onClose);
      if (element.open) element.close();
    };
  }, [onClose]);

  const { real } = summary;
  const sent = [
    real.email > 0 && `📧 ${plural(real.email, "email")}`,
    real.sms > 0 && `💬 ${plural(real.sms, "text")}`,
    real.calls > 0 &&
      `📞 ${plural(real.calls, "call")}, ${duration(real.callSeconds)} on the phone`,
  ].filter((line): line is string => typeof line === "string");

  return (
    <dialog ref={dialog} className="gate report" aria-labelledby={titleId}>
      <div className="gate-body">
        <h2 id={titleId} ref={heading} tabIndex={-1}>
          Ticket #{ticket}: CLOSED
        </h2>
        <p>
          From the polite form to the reply:{" "}
          <strong>{duration(summary.seconds)}</strong>.
        </p>

        <h3>Real messages sent to you</h3>
        {sent.length > 0 ? (
          <ul>
            {sent.map((line) => (
              <li key={line}>
                <span className="mark mark-real">REAL</span> {line}
              </li>
            ))}
          </ul>
        ) : (
          <p>None. Everything this time was simulated.</p>
        )}

        <h3>
          What was simulated <Mark kind="simulated" />
        </h3>
        <ul className="report-jokes">
          {summary.simulated.map(({ label, count }) => (
            <li key={label}>
              {label}
              {count > 1 && <span className="mono"> ×{count}</span>}
            </li>
          ))}
        </ul>

        <p>Lines Sisu wrote itself: {summary.aiWrittenLines}</p>
        <p className="report-score">
          Replies from Rengas Online: 0. Replies from Sisu: 1.
        </p>
      </div>
      <div className="gate-footer report-footer">
        {reset.error && (
          <p className="form-error" role="alert">
            De-escalate failed: {reset.error.message}
          </p>
        )}
        <button
          type="button"
          className="button primary"
          disabled={reset.isPending}
          onClick={() =>
            reset.mutate(undefined, {
              onSuccess: () => {
                stopSpeech();
                dialog.current?.close();
              },
            })
          }
        >
          {reset.isPending ? "De-escalating…" : "😇 De-escalate and start over"}
        </button>
        <button
          type="button"
          className="button outline"
          onClick={() => dialog.current?.close()}
        >
          Close
        </button>
      </div>
    </dialog>
  );
}

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;
