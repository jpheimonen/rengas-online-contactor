import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { eq } from "drizzle-orm";
import {
  RUNGS,
  SMS,
  SYSTEM_LINES,
  fillTemplate,
  getAction,
  isUnlocked,
  ticketValues,
  type ActionId,
  type RunMode,
  type StartRunRequest,
} from "@rengas/shared";
import type { Db } from "../db/client.ts";
import { runs } from "../db/schema.ts";
import { problem } from "../errors.ts";
import type { EventLog } from "../events.ts";
import { getTicket, getUnlocks } from "../session-data.ts";
import {
  chooseMode,
  type ModeChoice,
  type RealAdapters,
  type RunContext,
  type RunnableAction,
  type StepBody,
} from "./adapters.ts";
import { mayWrite, type Writer } from "./writer.ts";

/** The old app's pause between scripted lines. */
export const STEP_DELAY_MS = 550;

export interface RunEngineOptions {
  db: Db;
  events: EventLog;
  realAdapters?: RealAdapters;
  writer?: Writer | undefined;
  stepDelayMs?: number;
}

interface ActiveRun {
  id: string;
  sessionId: string;
  actionId: ActionId;
  mode: RunMode;
  controller: AbortController;
}

/**
 * Starts actions as server-side runs and streams their events to the log
 * (register decision runs-and-sse). The same action can't run twice at once
 * in a session; different actions run side by side. De-escalate cancels every
 * run of the session, and a cancelled run writes nothing more.
 */
export class RunEngine {
  readonly #active = new Map<string, ActiveRun>();
  readonly #db: Db;
  readonly #events: EventLog;
  readonly #realAdapters: RealAdapters;
  readonly #writer: Writer | undefined;
  readonly #stepDelayMs: number;

  constructor(options: RunEngineOptions) {
    this.#db = options.db;
    this.#events = options.events;
    this.#realAdapters = options.realAdapters ?? {};
    this.#writer = options.writer;
    this.#stepDelayMs = options.stepDelayMs ?? STEP_DELAY_MS;
    // Runs still marked running were cut off when the server last stopped.
    this.#db
      .update(runs)
      .set({ status: "failed", endedAt: new Date().toISOString() })
      .where(eq(runs.status, "running"))
      .run();
  }

  get writerEnabled(): boolean {
    return this.#writer !== undefined;
  }

  runningActionIds(sessionId: string): ActionId[] {
    return [...this.#active.values()]
      .filter((run) => run.sessionId === sessionId)
      .map((run) => run.actionId);
  }

  /** How the action would run now, for `GET /api/state`. */
  modeFor(sessionId: string, action: RunnableAction): ModeChoice {
    const { rung } = getAction(action.id as ActionId);
    const unlockMode = getUnlocks(this.#db, sessionId).get(rung.id);
    return chooseMode(action, unlockMode, {}, this.#realAdapters);
  }

  start(
    sessionId: string,
    request: StartRunRequest,
  ): { runId: string; mode: RunMode } {
    const { rung, action } = getAction(request.actionId);
    if (action.mode === "finder") {
      throw problem(
        400,
        "invalid-request",
        "Finder actions run through POST /api/finder.",
      );
    }
    const unlocked = getUnlocks(this.#db, sessionId);
    const rungIndex = RUNGS.indexOf(rung);
    if (!isUnlocked(rungIndex, new Set(unlocked.keys()))) {
      throw problem(
        409,
        "rung-locked",
        `Unlock level ${rung.level} "${rung.title}" first.`,
      );
    }
    if (this.runningActionIds(sessionId).includes(request.actionId)) {
      throw problem(
        409,
        "run-in-progress",
        `"${action.label}" is already running.`,
      );
    }

    const choice = chooseMode(
      action,
      unlocked.get(rung.id),
      request,
      this.#realAdapters,
    );
    if (choice.mode === "real" && !request.confirmToken) {
      throw problem(
        400,
        "token-invalid",
        "A real send needs a confirmed preview first.",
      );
    }

    const firstRun =
      this.#db
        .select({ id: runs.id })
        .from(runs)
        .where(eq(runs.sessionId, sessionId))
        .limit(1)
        .get() === undefined;
    if (firstRun && !this.#writer) {
      this.#events.append(sessionId, {
        type: "system",
        kind: "notice",
        text: SYSTEM_LINES.scriptedMode,
      });
    }

    const run: ActiveRun = {
      id: randomUUID(),
      sessionId,
      actionId: request.actionId,
      mode: choice.mode,
      controller: new AbortController(),
    };
    this.#db
      .insert(runs)
      .values({
        id: run.id,
        sessionId,
        actionId: run.actionId,
        mode: run.mode,
        status: "running",
        startedAt: new Date().toISOString(),
      })
      .run();
    this.#active.set(run.id, run);
    void this.#execute(run, action, choice, request.optionName);
    return { runId: run.id, mode: run.mode };
  }

  /** De-escalate: stops every run of the session and logs each as cancelled. */
  cancelAll(sessionId: string): void {
    for (const run of this.#active.values()) {
      if (run.sessionId !== sessionId) continue;
      run.controller.abort();
      this.#events.append(sessionId, {
        type: "cancelled",
        runId: run.id,
        actionId: run.actionId,
        mode: run.mode,
        text: SYSTEM_LINES.cancelled,
      });
      this.#finish(run, "cancelled");
    }
  }

  async #execute(
    run: ActiveRun,
    action: RunnableAction,
    choice: ModeChoice,
    optionName: string | undefined,
  ): Promise<void> {
    const { signal } = run.controller;
    const emit = (body: StepBody) => {
      signal.throwIfAborted();
      this.#events.append(run.sessionId, {
        ...body,
        runId: run.id,
        actionId: run.actionId,
        mode: run.mode,
      } as Parameters<EventLog["append"]>[1]);
    };
    const pause = () => sleep(this.#stepDelayMs, undefined, { signal });

    try {
      const ticket = getTicket(this.#db, run.sessionId);
      const base = ticketValues(ticket);
      const values = {
        ...base,
        smsText: fillTemplate(SMS.prefix + SMS.fallbackBody, base),
        ...(optionName !== undefined && { optionName }),
      };
      emit({
        type: "started",
        label: action.label,
        ...(choice.mode === "simulated" &&
          choice.reason && { simulateReason: choice.reason }),
        ...(optionName !== undefined && { optionName }),
      });

      const { rung } = getAction(run.actionId);
      const written =
        this.#writer && mayWrite(action)
          ? await this.#writer.write({ ticket, rung, action, signal })
          : null;
      emit({
        type: "thought",
        text: written?.thought ?? fillTemplate(action.thought, values),
        aiWritten: written !== null,
      });

      const ctx: RunContext = { action, values, written, emit, pause, signal };
      await choice.adapter.run(ctx);

      await pause();
      emit({
        type: "done",
        text:
          run.mode === "real"
            ? SYSTEM_LINES.realDone
            : SYSTEM_LINES.simulatedDone,
      });
      emit({
        type: "after",
        text: written?.after ?? fillTemplate(action.after, values),
        aiWritten: written !== null,
      });
      this.#finish(run, "done");
    } catch (error) {
      // cancelAll has already logged and closed a cancelled run.
      if (signal.aborted) return;
      console.error(`Run ${run.id} (${run.actionId}) failed`, error);
      emit({ type: "failed", text: "✖ This run stopped unexpectedly." });
      this.#finish(run, "failed");
    }
  }

  #finish(run: ActiveRun, status: "done" | "failed" | "cancelled"): void {
    this.#active.delete(run.id);
    this.#db
      .update(runs)
      .set({ status, endedAt: new Date().toISOString() })
      .where(eq(runs.id, run.id))
      .run();
  }
}
