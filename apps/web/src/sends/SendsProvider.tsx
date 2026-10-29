import { createContext, use, useMemo, useState, type ReactNode } from "react";
import type { AppState } from "@rengas/shared";
import { SendPreview } from "./SendPreview.tsx";
import { StandIns } from "./StandIns.tsx";

export type RealActionId = AppState["actionModes"][number]["actionId"];

interface Sends {
  openStandIns: () => void;
  openPreview: (actionId: RealActionId) => void;
}

const SendsContext = createContext<Sends | null>(null);

/**
 * Owns the two real-send dialogs, so the header and every rung open the same
 * stand-ins dialog and send preview.
 */
export function SendsProvider({ children }: { children: ReactNode }) {
  const [standIns, setStandIns] = useState(false);
  const [preview, setPreview] = useState<RealActionId | null>(null);

  const value = useMemo(
    () => ({
      openStandIns: () => setStandIns(true),
      openPreview: (actionId: RealActionId) => setPreview(actionId),
    }),
    [],
  );

  return (
    <SendsContext value={value}>
      {children}
      <StandIns open={standIns} onClose={() => setStandIns(false)} />
      <SendPreview actionId={preview} onClose={() => setPreview(null)} />
    </SendsContext>
  );
}

export function useSends(): Sends {
  const sends = use(SendsContext);
  if (!sends) throw new Error("useSends needs a SendsProvider");
  return sends;
}
