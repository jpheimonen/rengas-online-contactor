/**
 * Recipient verification (register decision send-guard): codes prove an
 * inbox or phone belongs to the operator before any real send can reach it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiErrorSchema, recipientSchema } from "@rengas/shared";
import { openDatabase } from "./db/client.ts";
import { verificationCodes } from "./db/schema.ts";
import { providerRefused } from "./recipients/code-sender.ts";
import { MAX_CODES_PER_HOUR } from "./recipients/recipients.ts";
import {
  PHONE_CODE,
  TestClient,
  fakeCodeSender,
  fakeKeyVault,
  testApp,
} from "./test-client.ts";

function setup() {
  const db = openDatabase(":memory:");
  const codes = fakeCodeSender();
  const app = testApp({ db, keyVault: fakeKeyVault, codeSender: codes });
  return { db, codes, app, client: new TestClient(app) };
}

async function add(client: TestClient, address: string) {
  const channel = address.startsWith("+") ? "phone" : "email";
  const response = await client.post("/api/recipients", { channel, address });
  expect(response.status).toBe(201);
  return recipientSchema.parse(await response.json());
}

const verify = (client: TestClient, id: string, code: string) =>
  client.post(`/api/recipients/${id}/verify`, { code });

async function error(response: Response) {
  return apiErrorSchema.parse(await response.json());
}

afterEach(() => {
  vi.useRealTimers();
});

describe("email recipients", () => {
  it("sends a code with Resend, keeps only its hash and verifies the inbox", async () => {
    const { db, codes, client } = setup();
    const added = await add(client, "jp@example.com");
    expect(added).toMatchObject({
      channel: "email",
      masked: "j•••@example.com",
      verified: false,
    });
    expect(JSON.stringify(added)).not.toContain("jp@example.com");

    expect(codes.sendEmailCode).toHaveBeenCalledWith(
      { apiKey: "re_fake" },
      "jp@example.com",
      expect.stringMatching(/^\d{6}$/),
    );
    const code = codes.emailCodes.get("jp@example.com")!;
    const [stored] = db.select().from(verificationCodes).all();
    expect(stored!.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored!.codeHash).not.toContain(code);

    const verified = await verify(client, added.id, code);
    expect(verified.status).toBe(200);
    expect(recipientSchema.parse(await verified.json()).verified).toBe(true);
    expect((await client.state()).recipients).toEqual([
      { ...added, verified: true },
    ]);
  });

  it("allows 5 tries, then refuses even the right code", async () => {
    const { codes, client } = setup();
    const { id } = await add(client, "jp@example.com");
    const code = codes.emailCodes.get("jp@example.com")!;
    const wrong = code === "000000" ? "111111" : "000000";

    const first = await verify(client, id, wrong);
    expect(first.status).toBe(422);
    expect(await error(first)).toMatchObject({
      error: "code-invalid",
      message: "That code isn't right. 4 tries left.",
    });
    for (let i = 0; i < 4; i++) await verify(client, id, wrong);

    const sixth = await verify(client, id, code);
    expect(sixth.status).toBe(409);
    expect((await error(sixth)).error).toBe("code-expired");
    expect((await client.state()).recipients[0]!.verified).toBe(false);
  });

  it("refuses a code after 10 minutes", async () => {
    const { codes, client } = setup();
    vi.useFakeTimers({ toFake: ["Date"] });
    const { id } = await add(client, "jp@example.com");
    vi.setSystemTime(Date.now() + 10 * 60_000 + 1);

    const late = await verify(
      client,
      id,
      codes.emailCodes.get("jp@example.com")!,
    );
    expect(late.status).toBe(409);
    expect((await error(late)).error).toBe("code-expired");
  });

  it("makes a new code replace the old one", async () => {
    const { codes, client } = setup();
    const { id } = await add(client, "jp@example.com");
    const oldCode = codes.emailCodes.get("jp@example.com")!;
    await add(client, "jp@example.com");
    const newCode = codes.emailCodes.get("jp@example.com")!;

    if (oldCode !== newCode) {
      expect((await verify(client, id, oldCode)).status).toBe(422);
    }
    expect((await verify(client, id, newCode)).status).toBe(200);
    expect((await client.state()).recipients).toHaveLength(1);
  });
});

describe("phone recipients", () => {
  it("starts and checks the code through Twilio Verify", async () => {
    const { codes, client } = setup();
    const added = await add(client, "+358401234512");
    expect(added.masked).toBe("+358 40 ••• 12");
    expect(codes.startPhoneCode).toHaveBeenCalledWith(
      { accountSid: "ACfake", authToken: "fake" },
      "+358401234512",
    );

    const wrong = await verify(client, added.id, "135790");
    expect(wrong.status).toBe(422);
    expect((await error(wrong)).error).toBe("code-invalid");

    expect((await verify(client, added.id, PHONE_CODE)).status).toBe(200);
    expect(codes.checkPhoneCode).toHaveBeenLastCalledWith(
      { accountSid: "ACfake", authToken: "fake" },
      "+358401234512",
      PHONE_CODE,
    );
  });

  it("treats a code Twilio has expired as expired", async () => {
    const { codes, client } = setup();
    const { id } = await add(client, "+358401234512");
    codes.checkPhoneCode.mockResolvedValueOnce("expired");
    const response = await verify(client, id, PHONE_CODE);
    expect(response.status).toBe(409);
    expect((await error(response)).error).toBe("code-expired");
    // The code is closed, so even Twilio's approval can't verify it now.
    expect((await verify(client, id, PHONE_CODE)).status).toBe(409);
  });
});

describe("sending codes", () => {
  it("needs a real key for the provider", async () => {
    // The default code sender fails the test if it is called.
    const client = new TestClient(testApp());
    const response = await client.post("/api/recipients", {
      channel: "email",
      address: "jp@example.com",
    });
    expect(response.status).toBe(409);
    expect((await error(response)).error).toBe("not-configured");
    expect((await client.state()).recipients).toEqual([]);
  });

  it("stores nothing when the provider refuses", async () => {
    const { codes, client } = setup();
    codes.sendEmailCode.mockRejectedValueOnce(
      providerRefused("resend", "Invalid API key."),
    );
    const response = await client.post("/api/recipients", {
      channel: "email",
      address: "jp@example.com",
    });
    expect(response.status).toBe(502);
    expect(await error(response)).toEqual({
      error: "provider-refused",
      message: "✖ Resend refused: Invalid API key. Nothing was sent.",
    });
    expect((await client.state()).recipients).toEqual([]);
  });

  it(`sends at most ${MAX_CODES_PER_HOUR} codes an hour per session`, async () => {
    const { codes, client } = setup();
    vi.useFakeTimers({ toFake: ["Date"] });
    for (let i = 0; i < MAX_CODES_PER_HOUR; i++) {
      await add(client, `jp+${i}@example.com`);
    }
    const over = await client.post("/api/recipients", {
      channel: "email",
      address: "someone@example.com",
    });
    expect(over.status).toBe(429);
    expect((await error(over)).error).toBe("rate-limited");
    expect(codes.sendEmailCode).toHaveBeenCalledTimes(MAX_CODES_PER_HOUR);

    vi.setSystemTime(Date.now() + 60 * 60_000 + 1);
    await add(client, "someone@example.com");
  });

  it("sends no code to an address that is already verified", async () => {
    const { codes, client } = setup();
    const inbox = await client.verifyRecipient(codes, "jp@example.com");
    const again = await add(client, "jp@example.com");
    expect(again).toEqual(inbox);
    expect(codes.sendEmailCode).toHaveBeenCalledOnce();
  });
});

describe("recipients and sessions", () => {
  it("keeps each session's recipients to itself", async () => {
    const { app, codes, client } = setup();
    const inbox = await client.verifyRecipient(codes, "jp@example.com");
    const other = new TestClient(app);

    expect((await other.state()).recipients).toEqual([]);
    expect((await verify(other, inbox.id, "123456")).status).toBe(404);
    expect(
      (await other.request("DELETE", `/api/recipients/${inbox.id}`)).status,
    ).toBe(404);
    expect((await client.state()).recipients).toEqual([inbox]);
  });

  it("deletes a recipient", async () => {
    const { codes, client } = setup();
    const inbox = await client.verifyRecipient(codes, "jp@example.com");
    const deleted = await client.request(
      "DELETE",
      `/api/recipients/${inbox.id}`,
    );
    expect(deleted.status).toBe(204);
    expect((await client.state()).recipients).toEqual([]);
  });

  it("De-escalate cancels codes not yet entered and keeps verified recipients", async () => {
    const { codes, client } = setup();
    const inbox = await client.verifyRecipient(codes, "jp@example.com");
    const phone = await add(client, "+358401234512");

    expect((await client.post("/api/reset")).status).toBe(200);
    const late = await verify(client, phone.id, PHONE_CODE);
    expect(late.status).toBe(409);
    expect((await error(late)).error).toBe("code-expired");
    const { recipients } = await client.state();
    expect(recipients).toHaveLength(2);
    expect(recipients).toEqual(expect.arrayContaining([inbox, phone]));
  });
});
