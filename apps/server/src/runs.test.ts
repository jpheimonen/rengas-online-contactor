/**
 * Parity row 5 (task parity-plan.md): simulated runs through POST /api/runs
 * and their events over GET /api/events.
 */
import { describe, expect, it, vi } from "vitest";
import {
  SYSTEM_LINES,
  apiErrorSchema,
  getAction,
  startRunResponseSchema,
  type ActionId,
} from "@rengas/shared";
import type { ChannelAdapter } from "./runs/adapters.ts";
import type { Writer } from "./runs/writer.ts";
import {
  TestClient,
  eventsOf,
  fakeCodeSender,
  fakeKeyVault,
  runEnded,
  testApp,
} from "./test-client.ts";

async function start(client: TestClient, body: Record<string, unknown>) {
  const response = await client.post("/api/runs", body);
  expect(response.status).toBe(202);
  return startRunResponseSchema.parse(await response.json());
}

describe("parity row 5: a simulated run", () => {
  it("streams started, thought, the scripted lines, done and after, all SIMULATED", async () => {
    const client = new TestClient(testApp());
    const { runId, mode } = await start(client, { actionId: "contact-form" });
    expect(mode).toBe("simulated");

    const run = eventsOf(await client.events(runEnded(runId)), runId);
    expect(run.map((e) => e.type)).toEqual([
      "started",
      "thought",
      "step",
      "step",
      "step",
      "step",
      "done",
      "after",
    ]);
    expect(run.every((e) => e.mode === "simulated")).toBe(true);
    expect(run[0]).toMatchObject({ label: "Fill in the website contact form" });
    expect(run[3]).toMatchObject({
      text: 'Typing: "Hello! Quick question about ticket #48213: Where are my winter tyres? Thank you so much :)"',
    });
    expect(run[6]).toMatchObject({ text: SYSTEM_LINES.simulatedDone });
    expect(run.map((e) => e.id)).toEqual(
      run.map((e) => e.id).sort((a, b) => a - b),
    );
  });

  it("logs once, on the first run, that Sisu is on scripted lines", async () => {
    const client = new TestClient(testApp());
    for (const actionId of ["contact-form", "call-cs"] as const) {
      const { runId } = await start(client, { actionId });
      await client.events(runEnded(runId));
    }
    const notices = (await client.log()).filter(
      (e) => e.type === "system" && e.text === SYSTEM_LINES.scriptedMode,
    );
    expect(notices).toHaveLength(1);
  });

  it("rejects the same action while it runs, and lets a different one run alongside", async () => {
    const client = new TestClient(testApp({ stepDelayMs: 5 }));
    const first = await start(client, { actionId: "contact-form" });

    const duplicate = await client.post("/api/runs", {
      actionId: "contact-form",
    });
    expect(duplicate.status).toBe(409);
    expect(apiErrorSchema.parse(await duplicate.json()).error).toBe(
      "run-in-progress",
    );

    const other = await start(client, { actionId: "call-cs" });
    expect((await client.state()).runningActionIds.sort()).toEqual([
      "call-cs",
      "contact-form",
    ]);

    const events = await client.events(
      (all) => runEnded(first.runId)(all) && runEnded(other.runId)(all),
    );
    // The two runs' lines interleave.
    const owners = events.flatMap((e) => ("runId" in e ? [e.runId] : []));
    const switches = owners.filter((id, i) => i > 0 && id !== owners[i - 1]);
    expect(switches.length).toBeGreaterThan(1);

    expect((await client.state()).runningActionIds).toEqual([]);
    await start(client, { actionId: "contact-form" });
  });

  it("refuses an action on a locked rung and a finder action", async () => {
    const client = new TestClient(testApp());
    const locked = await client.post("/api/runs", { actionId: "email-storm" });
    expect(locked.status).toBe(409);
    expect(apiErrorSchema.parse(await locked.json()).error).toBe("rung-locked");

    for (const id of [
      "email",
      "roboemail",
      "sms",
      "robocall",
      "social",
      "osint",
      "rent-a-human",
    ] as const) {
      await client.makeUpKeys(id);
    }
    const finder = await client.post("/api/runs", { actionId: "find-humans" });
    expect(finder.status).toBe(400);
  });

  it("says why a real-capable action simulates", async () => {
    const client = new TestClient(testApp());
    await client.makeUpKeys("email");
    for (const [body, reason] of [
      [{ actionId: "firm-email" }, "pretend-key"],
      [{ actionId: "firm-email", simulate: true }, "chose-simulate"],
    ] as const) {
      const { runId } = await start(client, body);
      const run = eventsOf(await client.events(runEnded(runId)), runId);
      expect(run[0]).toMatchObject({ type: "started", simulateReason: reason });
    }
  });

  it("puts a finder card's name and the set piece in their places", async () => {
    const client = new TestClient(testApp());
    for (const id of [
      "email",
      "roboemail",
      "sms",
      "robocall",
      "social",
      "osint",
      "rent-a-human",
    ] as const) {
      await client.makeUpKeys(id);
    }
    const { runId } = await start(client, {
      actionId: "dispatch-human",
      optionName: "Example Gigs Oy",
    });
    const run = eventsOf(await client.events(runEnded(runId)), runId);
    const steps = run.filter((e) => e.type === "step");
    expect(steps[0]).toMatchObject({
      text: "Pretending to post a gig on Example Gigs Oy. Nothing is posted.",
    });
    expect(steps[2]).toMatchObject({ invented: true });
    expect(steps[3]).toMatchObject({
      text: "The human arrives with a clipboard and a sign: 'TICKET #48213? ANYONE?'",
    });
  });

  it("sends a multi-line set piece as one event", async () => {
    const client = new TestClient(testApp());
    await client.makeUpKeys("email");
    await client.makeUpKeys("roboemail");
    const { runId } = await start(client, { actionId: "email-storm" });
    const run = eventsOf(await client.events(runEnded(runId)), runId);
    expect(run.find((e) => e.type === "set-piece")).toMatchObject({
      lines: [
        "URGENT: Your tyres have a message for you (1 of 900)",
        "Re: Ticket #48213 (now with 40% more urgency)",
        "Quick question (899 of 900)",
      ],
      aiWritten: false,
    });
  });
});

describe("the writer seam", () => {
  it("uses Sisu's lines when written, and never asks for threat-sms or recon", async () => {
    const write = vi.fn<Writer["write"]>(async () => ({
      thought: "Written thought.",
      after: "Written after.",
    }));
    const client = new TestClient(testApp({ writer: { write } }));
    const climbTo = [
      "email",
      "roboemail",
      "sms",
      "robocall",
      "social",
      "osint",
    ] as const;
    for (const id of climbTo) await client.makeUpKeys(id);

    for (const actionId of ["contact-form", "threat-sms", "recon"] as const) {
      const { runId } = await start(client, { actionId });
      const run = eventsOf(await client.events(runEnded(runId)), runId);
      const thought = run.find((e) => e.type === "thought")!;
      expect(thought).toMatchObject(
        actionId === "contact-form"
          ? { text: "Written thought.", aiWritten: true }
          : { text: getAction(actionId).action.thought, aiWritten: false },
      );
    }
    expect(write.mock.calls.map(([input]) => input.action.id)).toEqual([
      "contact-form",
    ]);
  });
});

describe("the real adapter seam", () => {
  it("runs a real-capable action through its channel's real adapter, only with a confirm token", async () => {
    const run = vi.fn<ChannelAdapter["run"]>(async ({ emit }) => {
      emit({
        type: "provider-status",
        provider: "resend",
        status: "sent",
        text: "Sent.",
      });
    });
    const codes = fakeCodeSender();
    const client = new TestClient(
      testApp({
        keyVault: fakeKeyVault,
        codeSender: codes,
        realAdapters: { email: { run } },
      }),
    );
    const unlocked = await client.post("/api/rungs/email/unlock", {
      mode: "real",
      keys: { resend: "re_12345678" },
    });
    expect(unlocked.status).toBe(200);
    const inbox = await client.verifyRecipient(codes, "jp@example.com");
    expect((await client.state()).actionModes).toContainEqual({
      actionId: "firm-email",
      mode: "real",
      recipient: "j•••@example.com",
    });

    const noToken = await client.post("/api/runs", { actionId: "firm-email" });
    expect(noToken.status).toBe(400);

    const { confirmToken } = await client.preview("firm-email", inbox.id);
    const { runId, mode } = await start(client, {
      actionId: "firm-email",
      confirmToken,
    });
    expect(mode).toBe("real");
    const events = eventsOf(await client.events(runEnded(runId)), runId);
    expect(events.every((e) => e.mode === "real")).toBe(true);
    expect(events.find((e) => e.type === "done")).toMatchObject({
      text: SYSTEM_LINES.realDone,
    });
    expect(run).toHaveBeenCalledOnce();
  });

  it("never gives a simulation-only action to a real adapter", async () => {
    const run = vi.fn<ChannelAdapter["run"]>();
    const client = new TestClient(
      testApp({
        keyVault: fakeKeyVault,
        realAdapters: { email: { run }, sms: { run } },
      }),
    );
    await client.post("/api/rungs/email/unlock", {
      mode: "real",
      keys: { resend: "re_12345678" },
    });
    await client.makeUpKeys("roboemail");
    const storm: ActionId = "email-storm";
    const { runId, mode } = await start(client, {
      actionId: storm,
      confirmToken: "x",
    });
    expect(mode).toBe("simulated");
    await client.events(runEnded(runId));
    expect(run).not.toHaveBeenCalled();
  });
});
