import { useEffect, useRef, useState } from "react";
import {
  RUNGS,
  UNLOCK_COPY,
  canAttemptUnlock,
  isUnlocked,
  type AppState,
  type Rung,
} from "@rengas/shared";
import { format } from "../format.ts";
import { useDesktop } from "../useMediaQuery.ts";
import { KeyForm } from "./KeyForm.tsx";
import { RungActions } from "./RungActions.tsx";

type Status = "locked" | "next" | "current" | "unlocked";

const STATUS_TEXT: Record<Status, string> = {
  locked: "Locked",
  next: "Next · needs key",
  current: "Current",
  unlocked: "Unlocked",
};

const STATUS_ICON: Record<Status, string> = {
  locked: "🔒",
  next: "🔑",
  current: "●",
  unlocked: "✓",
};

/** All ten rungs, highest first. The next and current rungs start open. */
export function Ladder({ state }: { state: AppState }) {
  const desktop = useDesktop();
  const unlocked = new Set<string>(state.unlocks.map((u) => u.rungId));
  const status = (index: number): Status =>
    index === state.currentLevel
      ? "current"
      : isUnlocked(index, unlocked)
        ? "unlocked"
        : canAttemptUnlock(index, unlocked)
          ? "next"
          : "locked";

  // Opened or closed by hand; cleared whenever the level changes.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [seenLevel, setSeenLevel] = useState(state.currentLevel);
  const [showHigher, setShowHigher] = useState(false);
  if (seenLevel !== state.currentLevel) {
    setSeenLevel(state.currentLevel);
    setToggled({});
  }

  // Bring a newly unlocked rung into view, like the old app did.
  const previousLevel = useRef(state.currentLevel);
  useEffect(() => {
    if (state.currentLevel > previousLevel.current) {
      const id = RUNGS[state.currentLevel]?.id;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      document.getElementById(`rung-${id}`)?.scrollIntoView({
        block: "nearest",
        behavior: reduce ? "auto" : "smooth",
      });
    }
    previousLevel.current = state.currentLevel;
  }, [state.currentLevel]);

  const rows = RUNGS.map((rung, index) => ({
    rung,
    index,
    status: status(index),
  })).reverse();
  const nextIndex =
    rows.find((row) => row.status === "next")?.index ?? RUNGS.length;
  // On small screens the rungs above the next one wait behind a disclosure.
  const grouped = desktop ? [] : rows.filter((row) => row.index > nextIndex);
  const visible = rows.filter((row) => !grouped.includes(row));

  const renderRow = ({ rung, status }: (typeof rows)[number]) => (
    <RungRow
      key={rung.id}
      rung={rung}
      status={status}
      state={state}
      open={toggled[rung.id] ?? (status === "next" || status === "current")}
      onToggle={(open) => setToggled({ ...toggled, [rung.id]: open })}
    />
  );

  return (
    <section className="ladder panel" aria-labelledby="ladder-title">
      <div className="panel-head">
        <h2 id="ladder-title">The escalation ladder</h2>
        <p className="muted">From polite to properly unhinged.</p>
      </div>
      <ol className="rungs" aria-label="Escalation ladder, highest level first">
        {grouped.length > 0 && (
          <li className="higher">
            <button
              type="button"
              className="button quiet higher-toggle"
              aria-expanded={showHigher}
              aria-controls="higher-rungs"
              onClick={() => setShowHigher(!showHigher)}
            >
              {grouped.length} higher rungs · {showHigher ? "Hide" : "Show"}
            </button>
            {showHigher && (
              <ol className="rungs" id="higher-rungs">
                {grouped.map(renderRow)}
              </ol>
            )}
          </li>
        )}
        {visible.map(renderRow)}
      </ol>
    </section>
  );
}

function RungRow({
  rung,
  status,
  state,
  open,
  onToggle,
}: {
  rung: Rung;
  status: Status;
  state: AppState;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const bodyId = `rung-${rung.id}-body`;
  return (
    <li
      id={`rung-${rung.id}`}
      className={`rung ${status}`}
      data-level={rung.level}
    >
      <h3 className="rung-title">
        <button
          type="button"
          className="rung-head"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => onToggle(!open)}
        >
          <span className="level mono" aria-hidden="true">
            {String(rung.level).padStart(2, "0")}
          </span>
          <span className="visually-hidden">Level {rung.level}: </span>
          <span className="title">{rung.title}</span>
          <span className="status">
            <span className="visually-hidden">, </span>
            {STATUS_TEXT[status]}{" "}
            <span aria-hidden="true">{STATUS_ICON[status]}</span>
          </span>
          <span className="chevron" aria-hidden="true" />
        </button>
      </h3>
      <div id={bodyId} className="rung-body" hidden={!open}>
        <p className="tagline">{rung.tagline}</p>
        {status === "locked" && (
          <p className="help">
            <span aria-hidden="true">🔒 </span>
            {format(UNLOCK_COPY.locked, {
              keys: rung.keys.map((key) => key.label).join(" + "),
            })}
          </p>
        )}
        {status === "next" && <KeyForm rung={rung} state={state} />}
        {(status === "current" || status === "unlocked") && (
          <RungActions rung={rung} state={state} />
        )}
      </div>
    </li>
  );
}
