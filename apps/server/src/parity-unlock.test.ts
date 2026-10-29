/**
 * Parity rows 2 and 3 (task parity-plan.md) through POST /api/rungs/:id/unlock:
 * the old app's recorded rules, replayed against the server.
 */
import { describe, expect, it } from "vitest";
import { LADDER, apiErrorSchema, type RungId } from "@rengas/shared";
import oldLadder from "../../../tests/parity/fixtures/ladder.json";
import oldRules from "../../../tests/parity/fixtures/rules.json";
import { RUNG_RENAMES } from "../../../tests/parity/renames.ts";
import { TestClient, testApp } from "./test-client.ts";

const renamed = (oldId: string): RungId => RUNG_RENAMES[oldId]!.id;

/**
 * Through the API a session can only climb, so the reachable cases are the
 * recorded ones whose unlocked rungs are the first k keyed rungs. Rent-a-human
 * sits between osint and the blimp in the new ladder, so it is unlocked right
 * after osint, as the shared replay does.
 */
const keyedOldIds = oldLadder.slice(1).map((rung) => rung.id);
const reachableCases = oldRules.unlockCases.filter(({ unlocked }) =>
  unlocked.every((id, i) => id === keyedOldIds[i]),
);

async function climb(client: TestClient, oldIds: readonly string[]) {
  for (const oldId of oldIds) {
    expect((await client.makeUpKeys(renamed(oldId))).status).toBe(200);
    if (oldId === "osint") {
      expect((await client.makeUpKeys("rent-a-human")).status).toBe(200);
    }
  }
}

describe("parity row 2: next-rung-only unlocking through the API", () => {
  it("covers every climb the old app could reach", () => {
    expect(reachableCases).toHaveLength(keyedOldIds.length + 1);
  });

  it.each(reachableCases.map((c) => [c.unlocked.join(",") || "nothing", c]))(
    "with %s unlocked",
    async (_, recorded) => {
      const client = new TestClient(testApp());
      await climb(client, recorded.unlocked);

      const state = await client.state();
      const oldTop = oldLadder[recorded.currentLevel]!.id;
      const expectedTop = oldTop === "osint" ? "rent-a-human" : renamed(oldTop);
      expect(LADDER[state.currentLevel]!.id).toBe(expectedTop);

      // Try every old rung; the one the old app allowed goes last, since it unlocks.
      const order = oldLadder
        .map((old, i) => ({ old, allowed: recorded.canAttemptUnlock[i]! }))
        .sort((a, b) => Number(a.allowed) - Number(b.allowed));
      for (const { old, allowed } of order) {
        const response = await client.makeUpKeys(renamed(old.id));
        if (allowed) {
          expect(response.status, old.id).toBe(200);
        } else {
          expect(response.status, old.id).toBe(409);
          const body = apiErrorSchema.parse(await response.json());
          expect(body.error).toBe("not-next-rung");
        }
      }
    },
  );

  it("can't skip the added rent-a-human rung to reach the blimp", async () => {
    const client = new TestClient(testApp());
    for (const id of keyedOldIds.slice(0, -1)) {
      expect((await client.makeUpKeys(renamed(id))).status).toBe(200);
    }
    expect((await client.makeUpKeys("blimp")).status).toBe(409);
  });

  it("answers 404 for a rung that doesn't exist", async () => {
    const missing = await new TestClient(testApp()).post(
      "/api/rungs/moon/unlock",
      { mode: "pretend", keys: {} },
    );
    expect(missing.status).toBe(404);
  });
});

describe("parity row 3: key form errors from the unlock endpoint", () => {
  it.each(oldRules.keyCases.map((c) => [JSON.stringify(c.value), c]))(
    "key %s",
    async (_, { value, error }) => {
      const client = new TestClient(testApp());
      const response = await client.post("/api/rungs/email/unlock", {
        mode: "pretend",
        keys: { resend: value },
      });
      if (error === null) {
        expect(response.status).toBe(200);
        return;
      }
      expect(response.status).toBe(422);
      const body = apiErrorSchema.parse(await response.json());
      expect(body.error).toBe("invalid-keys");
      expect(body.fieldErrors).toEqual({ resend: error });
      expect((await client.state()).currentLevel).toBe(0);
    },
  );

  it("reports each field of a two-key rung on its own, for real keys too", async () => {
    const client = new TestClient(testApp());
    await client.makeUpKeys("email");
    await client.makeUpKeys("roboemail");
    const response = await client.post("/api/rungs/sms/unlock", {
      mode: "real",
      keys: { "twilio-sid": "AC has spaces", "twilio-token": "" },
    });
    expect(response.status).toBe(422);
    expect(apiErrorSchema.parse(await response.json()).fieldErrors).toEqual({
      "twilio-sid": "Keys don't have spaces in them.",
      "twilio-token": "Enter a key.",
    });
  });

  it("checks shape before anything else, and stores nothing for a missing key", async () => {
    const client = new TestClient(testApp());
    const response = await client.post("/api/rungs/email/unlock", {
      mode: "pretend",
      keys: {},
    });
    expect(apiErrorSchema.parse(await response.json()).fieldErrors).toEqual({
      resend: "Enter a key.",
    });
  });
});

describe("unlock modes without a key vault", () => {
  it("refuses real and configured keys and leaves the rung locked", async () => {
    const client = new TestClient(testApp());
    const real = await client.post("/api/rungs/email/unlock", {
      mode: "real",
      keys: { resend: "re_123456789" },
    });
    expect(real.status).toBe(501);
    const configured = await client.post("/api/rungs/email/unlock", {
      mode: "configured",
    });
    expect(configured.status).toBe(409);
    expect(apiErrorSchema.parse(await configured.json()).error).toBe(
      "not-configured",
    );
    expect((await client.state()).unlocks).toEqual([]);
  });

  it("refuses real mode on a rung whose keys are pretend", async () => {
    const client = new TestClient(testApp());
    await client.makeUpKeys("email");
    const response = await client.post("/api/rungs/roboemail/unlock", {
      mode: "real",
      keys: { bulkmail: "mk-123456789" },
    });
    expect(response.status).toBe(400);
  });

  it("logs a pretend unlock, names a made-up key and warns that real actions simulate", async () => {
    const client = new TestClient(testApp());
    await client.makeUpKeys("email");
    const [unlock, reaction] = (await client.log()).slice(-2);
    expect(unlock).toMatchObject({ kind: "unlock", rungId: "email" });
    expect(unlock!.type === "system" && unlock!.text).toBe(
      "🔓 Level 2 \"Firmly Worded Email\" unlocked with a pretend key ('SG.TRUST-ME-BRO'). Nothing stored. Its real actions will simulate.",
    );
    expect(reaction).toMatchObject({ kind: "reaction", rungId: "email" });
    expect((await client.state()).actionModes).toContainEqual({
      actionId: "firm-email",
      mode: "simulated",
      reason: "pretend-key",
    });
  });
});
