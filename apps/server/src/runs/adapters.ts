import {
  fillTemplate,
  type RealCapableAction,
  type RealChannel,
  type SimulateReason,
  type SimulationOnlyAction,
  type TemplateValues,
  type UnlockMode,
} from "@rengas/shared";
import type { RunEventBody } from "../events.ts";
import type { ConfirmedSend } from "../sends/guard.ts";
import type { WrittenLines } from "./writer.ts";

type RunScopedBody = Exclude<RunEventBody, { type: "system" }>;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** A run event as an adapter emits it; the engine adds the run id, action id and mode. */
export type StepBody = DistributiveOmit<
  RunScopedBody,
  "runId" | "actionId" | "mode"
>;

export type RunnableAction = RealCapableAction | SimulationOnlyAction;

export interface RunContext {
  action: RunnableAction;
  /** Ticket, option name and SMS text for the action's placeholders. */
  values: TemplateValues;
  /** What Sisu's writer produced for this run, or null for the scripted lines. */
  written: WrittenLines | null;
  /** Saves and streams one event. Throws once the run is cancelled, so nothing late gets out. */
  emit(body: StepBody): void;
  /** Waits one step. Rejects as soon as the run is cancelled. */
  pause(): Promise<void>;
  signal: AbortSignal;
  /**
   * Set only on a real run: the confirmed preview's recipient and content,
   * which are exactly what the adapter sends. It reports the provider's
   * message ID with `markSent`.
   */
  send?: RealSend;
}

export interface RealSend extends ConfirmedSend {
  markSent(providerMessageId: string): void;
}

/** Runs one action over its channel (register decision channel-adapters). */
export interface ChannelAdapter {
  run(ctx: RunContext): Promise<void>;
}

/**
 * Real adapters by channel. Only email, SMS and voice can have one, and only
 * real-capable actions reach them: simulation-only actions have no channel
 * key in this map's type.
 */
export type RealAdapters = Partial<Record<RealChannel, ChannelAdapter>>;

export type ModeChoice =
  | { mode: "real"; adapter: ChannelAdapter }
  | { mode: "simulated"; adapter: ChannelAdapter; reason?: SimulateReason };

/**
 * Picks the adapter for a run. Simulation-only actions always simulate. A
 * real-capable action goes real only when its rung was unlocked with a real or
 * configured key and its channel has a real adapter. The run engine then asks
 * the send guard for a verified recipient, the confirmation token and the
 * limits before anything is sent.
 */
export function chooseMode(
  action: RunnableAction,
  unlockMode: UnlockMode | undefined,
  options: { simulate?: boolean | undefined },
  realAdapters: RealAdapters,
): ModeChoice {
  if (action.mode === "simulation-only") return simulated();
  if (options.simulate) return simulated("chose-simulate");
  if (unlockMode === "pretend") return simulated("pretend-key");
  const adapter = realAdapters[action.channel];
  if (unlockMode === undefined || !adapter) return simulated();
  return { mode: "real", adapter };
}

/** A simulated run, with the reason to show when there is one. */
export function simulated(
  reason?: SimulateReason,
): Extract<ModeChoice, { mode: "simulated" }> {
  return reason
    ? { mode: "simulated", adapter: simulatedAdapter, reason }
    : { mode: "simulated", adapter: simulatedAdapter };
}

/** Plays the action's scripted lines, one per step, with the set piece in its slot. */
export const simulatedAdapter: ChannelAdapter = {
  async run({ action, values, written, emit, pause }) {
    const scripted = action.mode === "simulation-only";
    const lines = scripted ? action.lines : action.simulatedLines;
    const setPiece = scripted ? action.setPiece : undefined;
    const invented = new Set<number>(scripted ? action.inventedLines : []);
    const pieceLines = (written?.setPiece ?? setPiece?.fallback ?? []).map(
      (line) => fillTemplate(line, values),
    );
    const slotValues: TemplateValues = setPiece
      ? { ...values, [setPiece.slot]: pieceLines.join(" ") }
      : values;

    if (scripted && action.cardLine && values.optionName !== undefined) {
      await pause();
      emit({
        type: "step",
        text: fillTemplate(action.cardLine, values),
        invented: false,
      });
    }
    for (const [index, line] of lines.entries()) {
      await pause();
      if (setPiece && line === `{${setPiece.slot}}`) {
        emit({
          type: "set-piece",
          lines: pieceLines,
          aiWritten: written?.setPiece !== undefined,
        });
      } else {
        emit({
          type: "step",
          text: fillTemplate(line, slotValues),
          invented: invented.has(index),
        });
      }
    }
  },
};
