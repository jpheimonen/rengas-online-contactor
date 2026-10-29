import { describe, expect, it, vi } from "vitest";
import { RUNGS } from "@rengas/shared";
import { openDatabase } from "./db/client.ts";
import { providerKeys } from "./db/schema.ts";
import { KeyCipher } from "./key-cipher.ts";
import type { CheckResult, KeyCheckers } from "./key-checks.ts";
import {
  KEY_FIELDS,
  createKeyVault,
  maskKey,
  presetKeys,
  type PresetKeys,
} from "./keys.ts";
import { TestClient, testApp } from "./test-client.ts";

const APP_SECRET = "s".repeat(32);
const RESEND_KEY = "re_live_key_abcd1234";

function setup(options: { preset?: PresetKeys; result?: CheckResult } = {}) {
  const db = openDatabase(":memory:");
  const check = vi.fn(async () => options.result ?? ("ok" as CheckResult));
  const checkers: KeyCheckers = { resend: check, twilio: check, openai: check };
  const keyVault = createKeyVault({
    db,
    appSecret: APP_SECRET,
    preset: options.preset ?? {},
    checkers,
  });
  const app = testApp({ db, keyVault });
  return { db, check, keyVault, app, client: new TestClient(app) };
}

const unlockRealEmail = (client: TestClient, key = RESEND_KEY) =>
  client.post("/api/rungs/email/unlock", {
    mode: "real",
    keys: { resend: key },
  });

describe("KeyCipher", () => {
  const cipher = new KeyCipher(APP_SECRET);

  it("opens what it sealed, with a fresh IV each time", () => {
    const sealed = cipher.encrypt("secret", "s1:resend");
    expect(cipher.decrypt(sealed, "s1:resend")).toBe("secret");
    expect(cipher.encrypt("secret", "s1:resend")).not.toBe(sealed);
    expect(sealed).not.toContain("secret");
  });

  it("refuses a changed value, another secret and another session or provider", () => {
    const sealed = cipher.encrypt("secret", "s1:resend");
    const bytes = Buffer.from(sealed, "base64url");
    bytes[bytes.length - 1]! ^= 1;
    expect(() =>
      cipher.decrypt(bytes.toString("base64url"), "s1:resend"),
    ).toThrow();
    expect(() =>
      new KeyCipher("t".repeat(32)).decrypt(sealed, "s1:resend"),
    ).toThrow();
    expect(() => cipher.decrypt(sealed, "s2:resend")).toThrow();
    expect(() => cipher.decrypt(sealed, "s1:openai")).toThrow();
  });
});

describe("the key vault", () => {
  it("maps every real key field in the ladder to its provider's credentials", () => {
    for (const rung of RUNGS) {
      for (const key of rung.keys) {
        if (key.kind !== "real") continue;
        expect(Object.values(KEY_FIELDS[key.provider])).toContain(key.id);
      }
    }
  });

  it("masks keys to the prefix and the last 4 characters", () => {
    expect(maskKey("re_123456789abcd")).toBe("re_…abcd");
    expect(maskKey("sk-proj-0000a1b2")).toBe("sk-…a1b2");
    expect(maskKey("AC0123456789ffee")).toBe("AC…ffee");
  });

  it("checks a real key live, stores only ciphertext and shows only the hint", async () => {
    const { db, check, keyVault, client } = setup();
    const response = await unlockRealEmail(client);
    expect(response.status).toBe(200);
    expect(check).toHaveBeenCalledWith({ apiKey: RESEND_KEY });

    const body = await response.text();
    expect(body).not.toContain(RESEND_KEY);
    expect(JSON.parse(body).keys).toEqual([
      { provider: "resend", source: "stored", hint: "re_…1234" },
    ]);
    const rows = db.select().from(providerKeys).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.ciphertext).not.toContain(RESEND_KEY);

    const log = await client.log();
    expect(JSON.stringify(log)).not.toContain(RESEND_KEY);
    expect(log.map((e) => ("text" in e ? e.text : ""))).toContainEqual(
      expect.stringContaining(
        "Resend accepted the key (re_…1234). Stored encrypted.",
      ),
    );
    expect(keyVault.credentials(rows[0]!.sessionId, "resend")).toEqual({
      apiKey: RESEND_KEY,
    });
  });

  it("stores Twilio's SID and token as one key, hinted by the SID", async () => {
    const { db, check, client } = setup();
    for (const rung of ["email", "roboemail"] as const) {
      expect((await client.makeUpKeys(rung)).status).toBe(200);
    }
    const response = await client.post("/api/rungs/sms/unlock", {
      mode: "real",
      keys: {
        "twilio-sid": "AC0123456789ffee",
        "twilio-token": "tok-secret-9999",
      },
    });
    expect(response.status).toBe(200);
    expect(check).toHaveBeenCalledWith({
      accountSid: "AC0123456789ffee",
      authToken: "tok-secret-9999",
    });
    expect((await client.state()).keys).toEqual([
      { provider: "twilio", source: "stored", hint: "AC…ffee" },
    ]);
    expect(db.select().from(providerKeys).all()).toHaveLength(1);
  });

  it.each([
    ["refused", "Resend says this key isn't valid."],
    [
      "unreachable",
      "Couldn't reach Resend. Nothing was stored. Try again, or make one up.",
    ],
  ] as const)(
    "keeps the rung locked when the provider check is %s",
    async (result, message) => {
      const { db, client } = setup({ result });
      const response = await unlockRealEmail(client);
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({
        error: "invalid-keys",
        fieldErrors: { resend: message },
      });
      expect(db.select().from(providerKeys).all()).toHaveLength(0);
      const state = await client.state();
      expect(state.unlocks).toEqual([]);
      expect(state.keys).toEqual([]);
    },
  );

  it("unlocks a rung in one click with the key from .env, and keeps it ready after De-escalate", async () => {
    const { check, client, keyVault } = setup({
      preset: { resend: { apiKey: "re_from_env_00a1b2" } },
    });
    const configured = {
      provider: "resend",
      source: "configured",
      hint: "re_…a1b2",
    };
    expect((await client.state()).unlocks).toEqual([]);
    expect((await client.state()).keys).toEqual([configured]);

    const response = await client.post("/api/rungs/email/unlock", {
      mode: "configured",
    });
    expect(response.status).toBe(200);
    expect(check).not.toHaveBeenCalled();

    await client.post("/api/reset");
    const state = await client.state();
    expect(state.unlocks).toEqual([]);
    expect(state.keys).toEqual([configured]);
    expect(keyVault.credentials("any-session", "resend")).toEqual({
      apiKey: "re_from_env_00a1b2",
    });
  });

  it("has no configured key for a rung whose .env keys are incomplete", async () => {
    const preset = presetKeys({
      TWILIO_ACCOUNT_SID: "AC0123456789ffee",
    } as Parameters<typeof presetKeys>[0]);
    expect(preset).toEqual({});
    const { keyVault } = setup({ preset });
    expect(keyVault.configured(RUNGS.find((r) => r.id === "sms")!)).toBeNull();
  });

  it("De-escalate deletes the keys entered in the UI", async () => {
    const { db, client, keyVault } = setup();
    await unlockRealEmail(client);
    const [row] = db.select().from(providerKeys).all();

    await client.post("/api/reset");
    expect(db.select().from(providerKeys).all()).toEqual([]);
    expect((await client.state()).keys).toEqual([]);
    expect(keyVault.credentials(row!.sessionId, "resend")).toBeNull();
  });

  it("keeps each session's keys to itself", async () => {
    const { app, client } = setup();
    await unlockRealEmail(client);
    const other = new TestClient(app);
    expect((await other.state()).keys).toEqual([]);
  });

  it("never checks or stores a pretend key", async () => {
    const { db, check, client } = setup();
    expect((await client.makeUpKeys("email")).status).toBe(200);
    expect(check).not.toHaveBeenCalled();
    expect(db.select().from(providerKeys).all()).toEqual([]);
  });
});
