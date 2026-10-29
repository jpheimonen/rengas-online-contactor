import type { Rung, Ticket } from "@rengas/shared";
import type { RunnableAction } from "./adapters.ts";

/** Sisu's own lines for one run (product concept, section 2). */
export interface WrittenLines {
  thought: string;
  setPiece?: string[];
  after: string;
}

/**
 * Sisu's text writer: one tool-less OpenAI call per run, shown on screen only
 * (register decision sisu-writes-on-simulated-rungs). It returns null when it
 * can't write, and the run uses the scripted lines. Without a writer every run
 * is scripted and makes no network call.
 */
export interface Writer {
  write(input: {
    sessionId: string;
    ticket: Ticket;
    rung: Rung;
    action: RunnableAction;
    signal: AbortSignal;
  }): Promise<WrittenLines | null>;
}

/** threat-sms and recon have `writer: false`: no writer call at all. */
export const mayWrite = (action: RunnableAction) =>
  action.mode === "real-capable" || action.writer;
