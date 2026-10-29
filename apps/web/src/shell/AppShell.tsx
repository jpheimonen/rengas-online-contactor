import { Outlet } from "@tanstack/react-router";
import { BANNER, FOOTER, HEADER, STAND_IN_COPY } from "@rengas/shared";
import { useAppState, useReset } from "../api/queries.ts";
import { ActivityProvider } from "../activity/ActivityProvider.tsx";
import { DisclaimerGate } from "../gate/DisclaimerGate.tsx";
import { SendsProvider, useSends } from "../sends/SendsProvider.tsx";
import { stopSpeech } from "../speech/speech.ts";
import { SisuMark } from "./SisuMark.tsx";

/** Header, warning band, the page, the footer disclaimer and the gate. */
export function AppShell() {
  const { data: state } = useAppState();
  const level = state ? state.currentLevel + 1 : 1;
  return (
    <ActivityProvider>
      <SendsProvider>
        <div className="app" data-level={level}>
          <header className="top">
            <div className="brand">
              <SisuMark />
              <h1 className="brand-name">{HEADER.title}</h1>
            </div>
            <div className="top-actions">
              <StandInsButton />
              <DeEscalate />
            </div>
          </header>
          <p className="warning" role="alert">
            {BANNER}
          </p>
          <main id="main">
            <Outlet />
          </main>
          <footer className="footer">
            <p>{FOOTER}</p>
          </footer>
        </div>
        <DisclaimerGate
          onEnter={() => document.getElementById("stage-title")?.focus()}
        />
      </SendsProvider>
    </ActivityProvider>
  );
}

/** Opens the operator's own inbox and phone; the count says how many are verified. */
function StandInsButton() {
  const { openStandIns } = useSends();
  const { data: state } = useAppState();
  const verified = state?.recipients.filter((r) => r.verified).length ?? 0;
  return (
    <button type="button" className="button quiet" onClick={openStandIns}>
      <span className="icon" aria-hidden="true">
        🪪
      </span>{" "}
      {STAND_IN_COPY.button}
      <span className="muted">
        {" "}
        · {verified > 0 ? `${verified} verified` : "none yet"}
      </span>
    </button>
  );
}

function DeEscalate() {
  const reset = useReset();
  return (
    <div className="de-escalate">
      <button
        type="button"
        className="button outline"
        disabled={reset.isPending}
        onClick={() => reset.mutate(undefined, { onSuccess: stopSpeech })}
      >
        {reset.isPending ? "De-escalating…" : "😇 De-escalate"}
      </button>
      {reset.error && (
        <p className="form-error" role="alert">
          De-escalate failed: {reset.error.message}
        </p>
      )}
    </div>
  );
}
