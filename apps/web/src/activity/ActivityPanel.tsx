import { useRef, useState, type ReactNode } from "react";
import {
  HEADER,
  LABELS,
  PROVIDER_NAMES,
  SIMULATE_REASONS,
  SYSTEM_LINES,
  getAction,
  type RunEvent,
} from "@rengas/shared";
import { clock, format } from "../format.ts";
import { Mark } from "../Mark.tsx";
import { useActivity, type Connection } from "./ActivityProvider.tsx";
import { itemKey, type LogItem } from "./log.ts";

const CONNECTION_TEXT: Record<Connection, string> = {
  connecting: "Connecting…",
  connected: "Connected",
  reconnecting: "Reconnecting… New lines may be delayed.",
};

/** Sisu's activity, newest first, as a polite live region. */
export function ActivityPanel() {
  const { items, connection } = useActivity();
  const scroller = useRef<HTMLDivElement>(null);
  const [leftTopAt, setLeftTopAt] = useState<number | null>(null);
  const unseen = leftTopAt === null ? 0 : items.length - leftTopAt;

  const onScroll = () => {
    const atTop = (scroller.current?.scrollTop ?? 0) < 8;
    if (atTop) setLeftTopAt(null);
    else if (leftTopAt === null) setLeftTopAt(items.length);
  };

  return (
    <section className="activity" aria-labelledby="activity-title">
      <div className="activity-head">
        <h2 id="activity-title">Sisu’s activity</h2>
        <p className={`connection ${connection}`}>
          <span className="dot" aria-hidden="true" />{" "}
          {CONNECTION_TEXT[connection]}
        </p>
        <p className="activity-sub">Newest first. {HEADER.logSubtitle}</p>
      </div>
      {unseen > 0 && (
        <button
          type="button"
          className="button small jump"
          onClick={() => scroller.current?.scrollTo({ top: 0 })}
        >
          {unseen} new {unseen === 1 ? "event" : "events"} · Jump to latest ↑
        </button>
      )}
      <div
        className="activity-scroll"
        ref={scroller}
        onScroll={onScroll}
        role="region"
        aria-label="Activity log lines"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the log scrolls by itself, so keyboard users must be able to focus it
        tabIndex={0}
      >
        {items.length === 0 && <p className="activity-empty">Sisu is ready.</p>}
        <ol
          className="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Activity log"
        >
          {items.map((item) => (
            <LogLine key={itemKey(item)} item={item} />
          ))}
        </ol>
      </div>
      <dl className="legend">
        {(["simulated", "real", "invented", "aiWritten"] as const).map(
          (kind) => (
            <div key={kind}>
              <dt>
                <Mark kind={kind} />
              </dt>
              <dd>{LABELS[kind].meaning}</dd>
            </div>
          ),
        )}
      </dl>
    </section>
  );
}

function LogLine({ item }: { item: LogItem }) {
  if (item.type === "local" || item.type === "system") {
    return (
      <li
        className={`line system ${item.type === "system" ? item.kind : "local"}`}
      >
        <div className="line-meta">
          <Mark kind="system" />
          <time className="mono" dateTime={item.at}>
            {clock(item.at)}
          </time>
        </div>
        <p className="line-text">{item.text}</p>
      </li>
    );
  }
  return <RunLine event={item} />;
}

function RunLine({ event }: { event: Exclude<RunEvent, { type: "system" }> }) {
  const [expanded, setExpanded] = useState(false);
  const { action } = getAction(event.actionId);
  const narration = event.type === "thought" || event.type === "after";
  const aiWritten = "aiWritten" in event && event.aiWritten;
  const invented = event.type === "step" && event.invented;

  let body: ReactNode;
  switch (event.type) {
    case "started":
      body = (
        <>
          {event.label}
          {event.simulateReason && event.simulateReason in SIMULATE_REASONS && (
            <span className="line-note">
              {" "}
              {format(SYSTEM_LINES.simulating, {
                reason:
                  SIMULATE_REASONS[
                    event.simulateReason as keyof typeof SIMULATE_REASONS
                  ],
              })}
            </span>
          )}
        </>
      );
      break;
    case "set-piece": {
      const long = event.lines.length > 4;
      const shown = long && !expanded ? event.lines.slice(0, 4) : event.lines;
      body = (
        <>
          <span className="set-piece">{shown.join("\n")}</span>
          {long && (
            <button
              type="button"
              className="link"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show less" : "Show all lines"}
            </button>
          )}
        </>
      );
      break;
    }
    case "provider-status":
      body = `${PROVIDER_NAMES[event.provider]} · ${event.status}: ${event.text}`;
      break;
    case "transcript":
      body = `${event.speaker === "sisu" ? "Sisu" : "Rengas Online (you)"}: ${event.text}`;
      break;
    default:
      body = event.text;
  }

  return (
    <li className={`line run ${event.type} ${narration ? "narration" : ""}`}>
      <div className="line-meta">
        <Mark kind={event.mode === "real" ? "real" : "simulated"} />
        {invented && <Mark kind="invented" />}
        {aiWritten && (
          <span className="ai-written">{LABELS.aiWritten.text}</span>
        )}
        <span className="line-action">{action.label}</span>
        <time className="mono" dateTime={event.at}>
          {clock(event.at)}
        </time>
      </div>
      <p className="line-text">
        {narration && <span className="sisu-chip" aria-hidden="true" />}
        {body}
      </p>
    </li>
  );
}
