import {
  PROVIDER_NAMES,
  SIMULATE_REASONS,
  SYSTEM_LINES,
  type Action,
  type ActionId,
  type AppState,
  type Rung,
} from "@rengas/shared";
import { useStartRun } from "../api/queries.ts";
import { useActivity } from "../activity/ActivityProvider.tsx";
import { format } from "../format.ts";
import { Mark } from "../Mark.tsx";
import { speakRobocall } from "../speech/speech.ts";

/** An unlocked rung: how it was unlocked, then its actions. */
export function RungActions({ rung, state }: { rung: Rung; state: AppState }) {
  return (
    <>
      <KeyStatus rung={rung} state={state} />
      <ul className="actions">
        {rung.actions.map((action) => (
          <li key={action.id} className="action" data-action={action.id}>
            <ActionControl action={action} state={state} />
          </li>
        ))}
      </ul>
    </>
  );
}

function KeyStatus({ rung, state }: { rung: Rung; state: AppState }) {
  const mode = state.unlocks.find((u) => u.rungId === rung.id)?.mode;
  if (!mode) return null;
  const provider = rung.keys.find((key) => key.kind === "real")?.provider;
  if (mode === "pretend") {
    const simulates = rung.actions.some((a) => a.mode === "real-capable");
    return (
      <p className="key-status">
        <Mark kind="pretendKey" /> Shape check only. Nothing stored.
        {simulates && " This rung simulates."}
      </p>
    );
  }
  const key = state.keys.find(
    (k) =>
      k.provider === provider &&
      k.source === (mode === "real" ? "stored" : "configured"),
  );
  if (!provider || !key) return null;
  const name = PROVIDER_NAMES[provider];
  return (
    <p className="key-status">
      <span className="dot" aria-hidden="true" />{" "}
      {mode === "real"
        ? `${name} key accepted`
        : `${name} key from server config`}
      {" · "}
      <span className="mono">{key.hint}</span>
    </p>
  );
}

function ActionControl({ action, state }: { action: Action; state: AppState }) {
  const start = useStartRun();
  const { addLocalLine } = useActivity();
  const running =
    state.runningActionIds.includes(action.id as ActionId) || start.isPending;
  const markId = `${action.id}-mode`;
  const noteId = `${action.id}-note`;

  const choice =
    action.mode === "real-capable"
      ? state.actionModes.find((m) => m.actionId === action.id)
      : undefined;
  const real = choice?.mode === "real";

  let note: string | null = null;
  if (choice?.reason) {
    note = format(SYSTEM_LINES.simulating, {
      reason: SIMULATE_REASONS[choice.reason],
    });
  }
  // The send preview and the finder search are built by later parts of the app.
  if (real)
    note = "Real sends open a preview first. The preview isn't available yet.";
  if (action.mode === "finder") note = "The finder search isn't connected yet.";
  const runnable = !real && action.mode !== "finder";
  const speech = action.mode === "simulation-only" ? action.speech : undefined;

  return (
    <>
      <div className="action-main">
        <button
          type="button"
          className={
            real ? "button primary action-button" : "button action-button"
          }
          disabled={running || !runnable}
          aria-describedby={note ? `${markId} ${noteId}` : markId}
          onClick={() => start.mutate({ actionId: action.id as ActionId })}
        >
          {running ? SYSTEM_LINES.running : action.label}
        </button>
        {action.mode === "finder" ? (
          <Mark
            id={markId}
            kind={state.finderMode === "web-search" ? "webSearch" : "example"}
          />
        ) : real ? (
          <span id={markId} className="mark mark-real">
            REAL{choice.recipient && ` → ${choice.recipient}`}
          </span>
        ) : (
          <Mark id={markId} kind="simulated" />
        )}
      </div>
      {note && (
        <p className="help" id={noteId}>
          {note}
        </p>
      )}
      {start.error && (
        <p className="form-error" role="alert">
          {start.error.message}
        </p>
      )}
      {speech && (
        <button
          type="button"
          className="button quiet"
          onClick={() => addLocalLine(speakRobocall(speech))}
        >
          🔊 Hear the robocall · your speakers only
        </button>
      )}
    </>
  );
}
