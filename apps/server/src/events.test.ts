/** GET /api/events: SSE with Last-Event-ID replay (register decision runs-and-sse). */
import { describe, expect, it } from "vitest";
import { TestClient, eventsOf, runEnded, testApp } from "./test-client.ts";

describe("GET /api/events", () => {
  it("replays only the events after Last-Event-ID", async () => {
    const client = new TestClient(testApp());
    await client.makeUpKeys("email");
    const all = await client.log();
    expect(all.length).toBeGreaterThan(2);

    const from = all[1]!.id;
    const replayed = await client.events(
      (events) => events.at(-1)?.id === all.at(-1)!.id,
      from,
    );
    expect(replayed).toEqual(all.slice(2));
  });

  it("streams a run live to a connected client, in order and without duplicates", async () => {
    const client = new TestClient(testApp({ stepDelayMs: 5 }));
    await client.state();
    let runId = "";
    const reading = client.events(
      (events) => runId !== "" && runEnded(runId)(events),
    );
    const response = await client.post("/api/runs", { actionId: "call-cs" });
    runId = ((await response.json()) as { runId: string }).runId;

    const events = await reading;
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(eventsOf(events, runId).map((e) => e.type)).toEqual([
      "started",
      "thought",
      "step",
      "step",
      "step",
      "step",
      "done",
      "after",
    ]);
  });

  it("only streams the session's own events", async () => {
    const app = testApp();
    const mine = new TestClient(app);
    const theirs = new TestClient(app);
    await mine.makeUpKeys("email");
    await theirs.state();
    const log = await theirs.log();
    expect(log.map((e) => e.type === "system" && e.kind)).toEqual(["ready"]);
  });
});
