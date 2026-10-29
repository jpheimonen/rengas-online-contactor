/**
 * A climb from level 1 to the top with no keys simulates everything and makes
 * no network calls (parity row 12, server side). Any fetch or outgoing socket
 * fails the test.
 */
import net from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RUNGS,
  SYSTEM_LINES,
  type ActionId,
  type RungId,
} from "@rengas/shared";
import { TestClient, eventsOf, runEnded, testApp } from "./test-client.ts";

describe("a climb with no keys", () => {
  const fetch = vi.fn(() => {
    throw new Error("Network call during a no-keys climb");
  });
  let connect: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetch);
    connect = vi
      .spyOn(net.Socket.prototype, "connect")
      .mockImplementation(() => {
        throw new Error("Socket opened during a no-keys climb");
      });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    connect.mockRestore();
  });

  it("unlocks every rung with made-up keys, runs every action simulated and makes zero provider calls", async () => {
    const client = new TestClient(testApp());
    let ran = 0;
    for (const rung of RUNGS) {
      if (rung.keys.length > 0) {
        expect((await client.makeUpKeys(rung.id as RungId)).status).toBe(200);
      }
      for (const action of rung.actions) {
        // The finder has its own endpoint and its own no-key test.
        if (action.mode === "finder") continue;
        const response = await client.post("/api/runs", {
          actionId: action.id as ActionId,
        });
        expect(response.status, action.id).toBe(202);
        const { runId, mode } = (await response.json()) as {
          runId: string;
          mode: string;
        };
        expect(mode, action.id).toBe("simulated");
        const run = eventsOf(await client.events(runEnded(runId)), runId);
        expect(
          run.find((e) => e.type === "done"),
          action.id,
        ).toMatchObject({
          text: SYSTEM_LINES.simulatedDone,
        });
        expect(run.every((e) => e.mode === "simulated")).toBe(true);
        ran++;
      }
    }

    expect((await client.state()).currentLevel).toBe(RUNGS.length - 1);
    expect(ran).toBe(
      RUNGS.flatMap((r) => r.actions).filter((a) => a.mode !== "finder").length,
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });
});
