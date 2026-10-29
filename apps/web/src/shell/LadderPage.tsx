import { useState, type ReactNode } from "react";
import { useActivity } from "../activity/ActivityProvider.tsx";
import { ActivityPanel } from "../activity/ActivityPanel.tsx";
import { useAppState } from "../api/queries.ts";
import { Ladder } from "../ladder/Ladder.tsx";
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

  return (
    <>
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
