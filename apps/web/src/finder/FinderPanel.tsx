import {
  SYSTEM_LINES,
  type ActionId,
  type AppState,
  type FinderAction,
  type FinderOption,
  type FinderResponse,
} from "@rengas/shared";
import { useState } from "react";
import { useFinder, useStartRun } from "../api/queries.ts";
import { Mark } from "../Mark.tsx";
import { FinderCard } from "./FinderCard.tsx";

/**
 * A finder action: a read-only web search (or invented examples without an
 * OpenAI key), shown as cards whose only action is a simulated booking.
 */
export function FinderPanel({
  action,
  state,
}: {
  action: FinderAction;
  state: AppState;
}) {
  const search = useFinder();
  const markId = `${action.id}-mode`;
  // The reply says what it really was; before that, the state predicts it.
  const mode = search.data?.mode ?? state.finderMode;

  return (
    <>
      <div className="action-main">
        <button
          type="button"
          className="button action-button"
          disabled={search.isPending}
          aria-describedby={markId}
          onClick={() => search.mutate(action.kind)}
        >
          {search.isPending ? "Searching…" : action.label}
        </button>
        <Mark
          id={markId}
          kind={mode === "web-search" ? "webSearch" : "example"}
        />
      </div>
      {search.error && (
        <div className="finder-problem" role="alert">
          <p className="form-error">{search.error.message}</p>
          <button
            type="button"
            className="button small outline"
            onClick={() => search.mutate(action.kind)}
          >
            Try again
          </button>
        </div>
      )}
      {search.data && !search.isPending && (
        <FinderResults action={action} state={state} reply={search.data} />
      )}
    </>
  );
}

function FinderResults({
  action,
  state,
  reply,
}: {
  action: FinderAction;
  state: AppState;
  reply: FinderResponse;
}) {
  const start = useStartRun();
  const [chosen, setChosen] = useState<string | null>(null);
  const target = action.startsAction as ActionId;
  const busy = start.isPending || state.runningActionIds.includes(target);
  const web = reply.mode === "web-search";
  const headingId = `${action.id}-results`;

  const simulate = (option: FinderOption) => {
    setChosen(option.name);
    start.mutate({ actionId: target, optionName: option.name });
  };

  return (
    <section className="finder" aria-labelledby={headingId}>
      <h4 id={headingId} className="finder-title">
        {web
          ? "Results from the web"
          : "No OpenAI key? Rehearse with examples."}
      </h4>
      <p
        className={web ? "finder-strip web" : "finder-strip example"}
        role="status"
      >
        {reply.results.length === 0
          ? "No suitable businesses found. Search again when you like."
          : web
            ? `Found ${reply.results.length} options. Sisu read about them and contacted none of them.`
            : `${reply.results.length} invented examples · safe to try`}
      </p>
      {reply.results.length > 0 && (
        <ul className="finder-cards">
          {reply.results.map((option) => (
            <li key={option.name}>
              <FinderCard
                option={option}
                web={web}
                buttonLabel={
                  busy && chosen === option.name
                    ? SYSTEM_LINES.running
                    : action.cardButton
                }
                buttonDisabled={busy}
                onSimulate={() => simulate(option)}
              />
            </li>
          ))}
        </ul>
      )}
      {start.error && (
        <p className="form-error" role="alert">
          {start.error.message}
        </p>
      )}
    </section>
  );
}
