import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { AppState } from "@rengas/shared";
import { useActivity } from "../activity/ActivityProvider.tsx";
import { ActivityPanel } from "../activity/ActivityPanel.tsx";
import { useAppState, useHangUp } from "../api/queries.ts";
import { isLive, latestCall, type LiveCall } from "../call/call.ts";
import {
  LiveCallStrip,
  LiveCallView,
  type HangUpControl,
} from "../call/LiveCallView.tsx";
import { Ladder } from "../ladder/Ladder.tsx";
import { CaseClosed } from "../report/CaseClosed.tsx";
import { summarize } from "../report/summary.ts";
import { Stage } from "../stage/Stage.tsx";
import { useDesktop } from "../useMediaQuery.ts";

type Tab = "ladder" | "activity";

/** The stage, then the ladder beside the activity log, or as tabs on small screens. */
export function LadderPage() {
  const { data: state, error, refetch } = useAppState();
  const desktop = useDesktop();

  if (error) {
    return (
      <div className="page-message" role="alert">
        <p>Couldn’t reach the server: {error.message}</p>
        <button type="button" className="button" onClick={() => void refetch()}>
          Try again
        </button>
      </div>
    );
  }
  if (!state) return <p className="page-message">Loading the ladder…</p>;
  return <Page state={state} desktop={desktop} />;
}

function Page({ state, desktop }: { state: AppState; desktop: boolean }) {
  const { items } = useActivity();
  const call = useMemo(() => latestCall(items), [items]);
  const control = useHangUpControl(call);
  // A new live call opens its view; closing the view leaves the call running.
  const [viewing, setViewing] = useState<string | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  if (call && isLive(call) && call.runId !== opened) {
    setOpened(call.runId);
    setViewing(call.runId);
  }

  // The report opens when Sisu's job run finishes now, not for one in replayed history.
  const [loadedAt] = useState(state.lastEventId);
  const [reported, setReported] = useState(loadedAt);
  const [reportOpen, setReportOpen] = useState(false);
  const closeReport = useCallback(() => setReportOpen(false), []);
  const tookTheJob = items.find(
    (item) => item.type === "done" && item.actionId === "take-the-job",
  );
  if (typeof tookTheJob?.id === "number" && tookTheJob.id > reported) {
    setReported(tookTheJob.id);
    setReportOpen(true);
  }
  const report = reportOpen && (
    <CaseClosed
      ticket={state.ticket.number}
      summary={summarize(items)}
      onClose={closeReport}
    />
  );

  if (call && viewing === call.runId) {
    return (
      <LiveCallView
        call={call}
        control={control}
        onBack={() => {
          setViewing(null);
          requestAnimationFrame(() =>
            document.getElementById("stage-title")?.focus(),
          );
        }}
      />
    );
  }

  return (
    <>
      {report}
      {call && isLive(call) && (
        <LiveCallStrip
          call={call}
          control={control}
          onView={() => setViewing(call.runId)}
        />
      )}
      <Stage state={state} />
      {desktop ? (
        <div className="columns">
          <Ladder state={state} />
          <ActivityPanel />
        </div>
      ) : (
        <MobileTabs ladder={<Ladder state={state} />} />
      )}
    </>
  );
}

function useHangUpControl(call: LiveCall | null): HangUpControl {
  const hangUp = useHangUp();
  const mine = call !== null && hangUp.variables === call.runId;
  return {
    ending: mine && isLive(call) && (hangUp.isPending || hangUp.isSuccess),
    error: mine && hangUp.error ? hangUp.error.message : null,
    hangUp: () => {
      if (call) hangUp.mutate(call.runId);
    },
  };
}

function MobileTabs({ ladder }: { ladder: ReactNode }) {
  const { items } = useActivity();
  const [tab, setTab] = useState<Tab>("ladder");
  const [seen, setSeen] = useState(items.length);
  if (tab === "activity" && seen !== items.length) setSeen(items.length);
  const unseen = items.length - seen;

  const tabButton = (id: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={tab === id}
      aria-controls={`panel-${id}`}
      tabIndex={tab === id ? 0 : -1}
      className="tab"
      onClick={() => setTab(id)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          const other: Tab = id === "ladder" ? "activity" : "ladder";
          setTab(other);
          document.getElementById(`tab-${other}`)?.focus();
        }
      }}
    >
      {label}
      {id === "activity" && unseen > 0 && (
        <span className="tab-count"> · {unseen} new</span>
      )}
    </button>
  );

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Ladder or activity">
        {tabButton("ladder", "Ladder")}
        {tabButton("activity", "Activity")}
      </div>
      <div
        id="panel-ladder"
        role="tabpanel"
        aria-labelledby="tab-ladder"
        hidden={tab !== "ladder"}
      >
        {ladder}
      </div>
      <div
        id="panel-activity"
        role="tabpanel"
        aria-labelledby="tab-activity"
        hidden={tab !== "activity"}
      >
        <ActivityPanel />
      </div>
    </>
  );
}
