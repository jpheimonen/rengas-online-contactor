import { Outlet } from "@tanstack/react-router";
import { BANNER, FOOTER, HEADER } from "@rengas/shared";
import { useAppState, useReset } from "../api/queries.ts";
import { ActivityProvider } from "../activity/ActivityProvider.tsx";
import { DisclaimerGate } from "../gate/DisclaimerGate.tsx";
import { stopSpeech } from "../speech/speech.ts";
import { SisuMark } from "./SisuMark.tsx";

/** Header, warning band, the page, the footer disclaimer and the gate. */
export function AppShell() {
  const { data: state } = useAppState();
  const level = state ? state.currentLevel + 1 : 1;
  return (
    <ActivityProvider>
      <div className="app" data-level={level}>
        <header className="top">
          <div className="brand">
            <SisuMark />
            <h1 className="brand-name">{HEADER.title}</h1>
          </div>
          <DeEscalate />
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
    </ActivityProvider>
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
