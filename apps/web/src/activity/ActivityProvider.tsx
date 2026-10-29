import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { runEventSchema, type AppState, type RunEvent } from "@rengas/shared";
import { setRunning, stateKey } from "../api/queries.ts";
import { emptyLog, logReducer, type LogItem } from "./log.ts";

export type Connection = "connecting" | "connected" | "reconnecting";

interface Activity {
  items: LogItem[];
  connection: Connection;
  /** Adds a line that only this browser knows about. */
  addLocalLine: (text: string) => void;
}

const ActivityContext = createContext<Activity | null>(null);

const FINISHED: ReadonlySet<RunEvent["type"]> = new Set([
  "done",
  "failed",
  "cancelled",
]);

/**
 * Streams `GET /api/events` into the activity log. EventSource reconnects by
 * itself and sends Last-Event-ID, so the server replays what was missed.
 */
export function ActivityProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [log, dispatch] = useReducer(logReducer, emptyLog);
  const [connection, setConnection] = useState<Connection>("connecting");

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onopen = () => setConnection("connected");
    source.onerror = () => setConnection("reconnecting");
    source.onmessage = (message: MessageEvent<string>) => {
      const event = runEventSchema.parse(JSON.parse(message.data));
      dispatch({ type: "event", event });
      // Replayed history is already reflected in the state the page loaded.
      const known = client.getQueryData<AppState>(stateKey)?.lastEventId ?? 0;
      if (event.id <= known) return;
      if (event.type !== "system" && FINISHED.has(event.type)) {
        setRunning(client, event.actionId, false);
      } else if (
        event.type === "system" &&
        (event.kind === "unlock" || event.kind === "de-escalate")
      ) {
        void client.invalidateQueries({ queryKey: stateKey });
      }
    };
    return () => source.close();
  }, [client]);

  const addLocalLine = useCallback(
    (text: string) =>
      dispatch({ type: "local", text, at: new Date().toISOString() }),
    [],
  );

  const value = useMemo(
    () => ({ items: log.items, connection, addLocalLine }),
    [log.items, connection, addLocalLine],
  );
  return <ActivityContext value={value}>{children}</ActivityContext>;
}

export function useActivity(): Activity {
  const activity = use(ActivityContext);
  if (!activity) throw new Error("useActivity needs an ActivityProvider");
  return activity;
}
