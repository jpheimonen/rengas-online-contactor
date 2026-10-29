/** Parity row 7 (task parity-plan.md): De-escalate through POST /api/reset. */
import { setTimeout as sleep } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { SYSTEM_LINES, apiErrorSchema } from "@rengas/shared";
import { TestClient, eventsOf, testApp } from "./test-client.ts";

const STEP_MS = 20;

describe("parity row 7: De-escalate", () => {
  it("cancels runs in flight so no late lines appear, then logs its lines", async () => {
    const client = new TestClient(testApp({ stepDelayMs: STEP_MS }));
    const response = await client.post("/api/runs", {
      actionId: "contact-form",
    });
    const { runId } = (await response.json()) as { runId: string };
    await client.events((all) =>
      eventsOf(all, runId).some((e) => e.type === "step"),
    );

    expect((await client.post("/api/reset")).status).toBe(200);
    // Wait well past the time the rest of the script would take.
    await sleep(STEP_MS * 10);

    const log = await client.log();
    const run = eventsOf(log, runId);
    expect(run.at(-1)).toMatchObject({
      type: "cancelled",
      text: SYSTEM_LINES.cancelled,
    });
    expect(run.some((e) => e.type === "done")).toBe(false);
    const cancelledAt = log.indexOf(run.at(-1)!);
    expect(
      log.slice(cancelledAt + 1).map((e) => e.type === "system" && e.text),
    ).toEqual([SYSTEM_LINES.deEscalated, SYSTEM_LINES.deEscalatedSisu]);
    expect((await client.state()).runningActionIds).toEqual([]);
  });

  it("relocks every rung, keeps the ticket and the log, and real-capable actions lock again", async () => {
    const client = new TestClient(testApp());
    const ticket = { number: "9", complaint: "Hello?", customer: "Room" };
    await client.put("/api/ticket", ticket);
    await client.makeUpKeys("email");
    const before = await client.log();

    await client.post("/api/reset");
    const state = await client.state();
    expect(state.unlocks).toEqual([]);
    expect(state.currentLevel).toBe(0);
    expect(state.ticket).toEqual(ticket);
    expect((await client.log()).slice(0, before.length)).toEqual(before);

    const locked = await client.post("/api/runs", { actionId: "firm-email" });
    expect(apiErrorSchema.parse(await locked.json()).error).toBe("rung-locked");
  });

  it("only touches its own session", async () => {
    const app = testApp({ stepDelayMs: STEP_MS });
    const mine = new TestClient(app);
    const theirs = new TestClient(app);
    const response = await theirs.post("/api/runs", { actionId: "call-cs" });
    const { runId } = (await response.json()) as { runId: string };

    await mine.post("/api/reset");
    const run = eventsOf(
      await theirs.events((all) =>
        eventsOf(all, runId).some((e) => e.type === "after"),
      ),
      runId,
    );
    expect(run.some((e) => e.type === "cancelled")).toBe(false);
  });
});
