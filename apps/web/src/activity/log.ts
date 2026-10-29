import type { RunEvent } from "@rengas/shared";

/** A line only this browser writes, such as the robocall speech notice. */
export interface LocalLine {
  type: "local";
  id: string;
  at: string;
  text: string;
}

export type LogItem = RunEvent | LocalLine;

export interface LogState {
  /** Newest first, like the old app's log. */
  items: LogItem[];
  /** The highest server event id seen. A new EventSource replays everything, so older ids are skipped. */
  lastEventId: number;
  localCount: number;
}

export type LogAction =
  | { type: "event"; event: RunEvent }
  | { type: "local"; text: string; at: string };

export const emptyLog: LogState = { items: [], lastEventId: 0, localCount: 0 };

export function logReducer(state: LogState, action: LogAction): LogState {
  if (action.type === "event") {
    if (action.event.id <= state.lastEventId) return state;
    return {
      ...state,
      items: [action.event, ...state.items],
      lastEventId: action.event.id,
    };
  }
  const localCount = state.localCount + 1;
  const line: LocalLine = {
    type: "local",
    id: `local-${localCount}`,
    at: action.at,
    text: action.text,
  };
  return { ...state, items: [line, ...state.items], localCount };
}

export const itemKey = (item: LogItem) =>
  typeof item.id === "number" ? `event-${item.id}` : item.id;
