import {
  RUNGS,
  currentLevel,
  type AppState,
  type RealCapableAction,
  type RungId,
} from "@rengas/shared";
import type { Services } from "./services.ts";
import { getTicket, getUnlocks } from "./session-data.ts";

const realCapableActions = RUNGS.flatMap((rung) =>
  rung.actions.filter(
    (action): action is RealCapableAction => action.mode === "real-capable",
  ),
);

/** Everything the web app shows for the session (`GET /api/state`). */
export function buildState(services: Services, sessionId: string): AppState {
  const { db, engine, events, guard, keyVault, recipients } = services;
  const unlocks = getUnlocks(db, sessionId);
  return {
    ticket: getTicket(db, sessionId),
    unlocks: [...unlocks].map(([rungId, mode]) => ({
      rungId: rungId as RungId,
      mode,
    })),
    currentLevel: currentLevel(new Set(unlocks.keys())),
    keys: keyVault.list(sessionId),
    recipients: recipients.list(sessionId),
    limits: guard.limits(sessionId),
    actionModes: realCapableActions.map((action) => {
      const choice = engine.modeFor(sessionId, action);
      return {
        actionId: action.id as AppState["actionModes"][number]["actionId"],
        mode: choice.mode,
        ...(choice.mode === "simulated" &&
          choice.reason && { reason: choice.reason }),
        ...(choice.recipient && { recipient: choice.recipient }),
      };
    }),
    finderMode: keyVault.credentials(sessionId, "openai")
      ? "web-search"
      : "examples",
    writerEnabled: engine.writerEnabled,
    runningActionIds: engine.runningActionIds(sessionId),
    lastEventId: events.lastId(sessionId),
  };
}
