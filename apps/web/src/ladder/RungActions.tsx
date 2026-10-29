import {
  PROVIDER_NAMES,
  SEND_COPY,
  SIMULATE_REASONS,
  STAND_IN_COPY,
  SYSTEM_LINES,
  type Action,
  type ActionId,
  type AppState,
  type Rung,
} from "@rengas/shared";
import { useStartRun } from "../api/queries.ts";
import { useActivity } from "../activity/ActivityProvider.tsx";
import { FinderPanel } from "../finder/FinderPanel.tsx";
import { format } from "../format.ts";
import { Mark } from "../Mark.tsx";
import { useSends, type RealActionId } from "../sends/SendsProvider.tsx";
import { speakRobocall } from "../speech/speech.ts";

/** An unlocked rung: how it was unlocked, then its actions. */
export function RungActions({ rung, state }: { rung: Rung; state: AppState }) {
  return (
    <>
      <KeyStatus rung={rung} state={state} />
      <ul className="actions">
        {rung.actions.map((action) => (
          <li key={action.id} className="action" data-action={action.id}>
            {action.mode === "finder" ? (
              <FinderPanel action={action} state={state} />
            ) : (
              <ActionControl action={action} state={state} />
            )}
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

function ActionControl({
  action,
  state,
}: {
  action: Exclude<Action, { mode: "finder" }>;
  state: AppState;
}) {
  const start = useStartRun();
  const { openPreview, openStandIns } = useSends();
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
    if (action.mode === "real-capable") {
      const used = limitUsed(state, action.channel, choice.reason);
      if (used) note += ` ${used}`;
    }
  }
  const setup =
    choice?.reason === "no-verified-inbox"
      ? STAND_IN_COPY.setupInbox
      : choice?.reason === "no-verified-phone"
        ? STAND_IN_COPY.setupPhone
        : null;
  const speech = action.mode === "simulation-only" ? action.speech : undefined;

  return (
    <>
      <div className="action-main">
        <button
          type="button"
          className={
            real ? "button primary action-button" : "button action-button"
          }
          disabled={running}
          aria-describedby={note || real ? `${markId} ${noteId}` : markId}
          onClick={() =>
            real
              ? openPreview(action.id as RealActionId)
              : start.mutate({ actionId: action.id as ActionId })
          }
        >
          {running ? SYSTEM_LINES.running : action.label}
        </button>
        {real ? (
          <Mark id={markId} kind="real" detail={choice.recipient} />
        ) : (
          <Mark id={markId} kind="simulated" />
        )}
      </div>
      {real && (
        <p className="help" id={noteId}>
          {SEND_COPY.actionHelp}
        </p>
      )}
      {note && (
        <p className="help" id={noteId}>
          {note}{" "}
          {setup && (
            <button type="button" className="link" onClick={openStandIns}>
              {setup}
            </button>
          )}
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

/** "3 of 3 emails used this hour." when a limit is why the action simulates. */
function limitUsed(
  state: AppState,
  channel: "email" | "sms" | "voice",
  reason: string,
): string | null {
  if (reason === "hour-limit") {
    const { used, max } = state.limits.hour[channel];
    return `${used} of ${max} ${SEND_COPY.sendWords[channel]} used this hour.`;
  }
  if (reason === "day-limit") {
    const { used, max } = state.limits.day;
    return `${used} of ${max} real sends used today.`;
  }
  return null;
}
