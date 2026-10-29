import { useEffect, useId, useRef, useState } from "react";
import { DISCLAIMER_GATE } from "@rengas/shared";

/** Same key as the old app, so the acknowledgement lasts for the tab. */
export const ACK_KEY = "roc-disclaimer-acknowledged";

const acknowledged = () => sessionStorage.getItem(ACK_KEY) === "yes";

/**
 * The mandatory disclaimer. It cannot be dismissed until the box is ticked:
 * Escape is blocked, and if the browser closes it anyway it opens again.
 */
export function DisclaimerGate({ onEnter }: { onEnter: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [checked, setChecked] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element || acknowledged()) return;
    const open = () => {
      element.showModal();
      heading.current?.focus();
    };
    const blockEscape = (event: Event) => event.preventDefault();
    const reopen = () => {
      if (!acknowledged()) open();
    };
    element.addEventListener("cancel", blockEscape);
    element.addEventListener("close", reopen);
    open();
    return () => {
      element.removeEventListener("cancel", blockEscape);
      element.removeEventListener("close", reopen);
      if (element.open) element.close();
    };
  }, []);

  const enter = () => {
    sessionStorage.setItem(ACK_KEY, "yes");
    dialog.current?.close();
    onEnter();
  };

  return (
    <dialog ref={dialog} className="gate" aria-labelledby={titleId}>
      <div className="gate-body">
        <h2 id={titleId} ref={heading} tabIndex={-1}>
          {DISCLAIMER_GATE.title}
        </h2>
        <p>{DISCLAIMER_GATE.text}</p>
        <ul>
          {DISCLAIMER_GATE.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <div className="gate-footer">
        <label className="check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <span>{DISCLAIMER_GATE.checkbox}</span>
        </label>
        <button
          type="button"
          className="button primary"
          disabled={!checked}
          onClick={enter}
        >
          {DISCLAIMER_GATE.button}
        </button>
      </div>
    </dialog>
  );
}
