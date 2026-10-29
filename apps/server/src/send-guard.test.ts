/**
 * The send guard's safety checks (task parity-plan.md, "Safety checks beyond
 * parity"): the server refuses a real send with no token or a reused one, to
 * an unverified recipient, over the rate limit or after De-escalate. Every
 * test counts the calls to a fake real adapter; a refused send makes none.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiErrorSchema,
  startRunResponseSchema,
  type ActionId,
  type TemplateValues,
} from "@rengas/shared";
import { openDatabase } from "./db/client.ts";
import { sends } from "./db/schema.ts";
import type { ChannelAdapter, RealSend } from "./runs/adapters.ts";
import { DEFAULT_SEND_LIMITS, type SendLimits } from "./sends/guard.ts";
import {
  TestClient,
  eventsOf,
  fakeCodeSender,
  fakeKeyVault,
  runEnded,
  testApp,
} from "./test-client.ts";

const INBOX = "jp@example.com";
const PHONE = "+358401234512";

async function setup(sendLimits: SendLimits = DEFAULT_SEND_LIMITS) {
  const db = openDatabase(":memory:");
  const codes = fakeCodeSender();
  const sent: { send: RealSend; values: TemplateValues }[] = [];
  const run = vi.fn<ChannelAdapter["run"]>(async ({ send, values, emit }) => {
    sent.push({ send: send!, values });
    send!.markSent(`msg_${sent.length}`);
    emit({
      type: "provider-status",
      provider: "resend",
      status: "sent",
      text: "Sent.",
    });
  });
  const app = testApp({
    db,
    sendLimits,
    keyVault: fakeKeyVault,
    codeSender: codes,
    realAdapters: { email: { run }, sms: { run } },
  });
  const client = new TestClient(app);
  await unlockEmail(client);
  const inbox = await client.verifyRecipient(codes, INBOX);
  return { db, app, client, codes, run, sent, inbox };
}

async function unlockEmail(client: TestClient) {
  const response = await client.post("/api/rungs/email/unlock", {
    mode: "real",
    keys: { resend: "re_12345678" },
  });
  expect(response.status).toBe(200);
}

/** Unlocks levels 3 and 4 so the polite text can go for real. */
async function unlockSms(client: TestClient) {
  await client.makeUpKeys("roboemail");
  const response = await client.post("/api/rungs/sms/unlock", {
    mode: "real",
    keys: { "twilio-sid": "AC12345678", "twilio-token": "token12345678" },
  });
  expect(response.status).toBe(200);
}

async function runToEnd(
  client: TestClient,
  body: { actionId: ActionId; confirmToken?: string },
) {
  const response = await client.post("/api/runs", body);
  expect(response.status).toBe(202);
  const started = startRunResponseSchema.parse(await response.json());
  const events = eventsOf(
    await client.events(runEnded(started.runId)),
    started.runId,
  );
  return { ...started, events };
}

async function refusal(response: Response) {
  return {
    status: response.status,
    ...apiErrorSchema.parse(await response.json()),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("a confirmed real send", () => {
  it("previews the exact content, sends it to the verified inbox once, and records it", async () => {
    const { db, client, run, sent, inbox } = await setup();
    const state = await client.state();
    expect(state.actionModes).toContainEqual({
      actionId: "firm-email",
      mode: "real",
      recipient: "j•••@example.com",
    });
    expect(state.limits.hour.email).toEqual({ used: 0, max: 3 });

    const preview = await client.preview("firm-email", inbox.id);
    expect(preview).toMatchObject({
      actionId: "firm-email",
      recipient: "j•••@example.com",
      aiWritten: false,
      remaining: { hour: { left: 3, of: 3 }, day: { left: 10, of: 10 } },
      content: {
        channel: "email",
        subject: "Ticket #48213: a firm but friendly follow-up",
      },
    });
    expect(
      preview.content.channel === "email" && preview.content.body,
    ).toContain("This email did not go to Rengas Online.");
    expect(Date.parse(preview.expiresAt) - Date.now()).toBeLessThanOrEqual(
      5 * 60_000,
    );

    const { mode, runId, events } = await runToEnd(client, {
      actionId: "firm-email",
      confirmToken: preview.confirmToken,
    });
    expect(mode).toBe("real");
    expect(events.every((e) => e.mode === "real")).toBe(true);
    expect(run).toHaveBeenCalledOnce();
    expect(sent[0]!.send).toMatchObject({
      channel: "email",
      recipient: { address: INBOX, masked: "j•••@example.com" },
      content: preview.content,
    });
    // The real lines' {recipient} shows the masked address.
    expect(sent[0]!.values.recipient).toBe("j•••@example.com");

    expect(db.select().from(sends).all()).toEqual([
      expect.objectContaining({
        runId,
        channel: "email",
        recipientAddress: INBOX,
        status: "sent",
        providerMessageId: "msg_1",
      }),
    ]);
    expect((await client.state()).limits).toMatchObject({
      hour: { email: { used: 1, max: 3 } },
      day: { used: 1, max: 10 },
    });
    const next = await client.preview("firm-email", inbox.id);
    expect(next.remaining).toEqual({
      hour: { left: 2, of: 3 },
      day: { left: 9, of: 10 },
    });
  });
});

describe("the server refuses a real send", () => {
  it("with no token", async () => {
    const { client, run } = await setup();
    const response = await client.post("/api/runs", { actionId: "firm-email" });
    expect(await refusal(response)).toMatchObject({
      status: 400,
      error: "token-invalid",
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("with a made-up token", async () => {
    const { client, run } = await setup();
    const response = await client.post("/api/runs", {
      actionId: "firm-email",
      confirmToken: "checked-by-the-send-guard",
    });
    expect(await refusal(response)).toMatchObject({
      status: 400,
      error: "token-invalid",
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("with a token that was already used", async () => {
    const { client, run, inbox } = await setup();
    const { confirmToken } = await client.preview("firm-email", inbox.id);
    await runToEnd(client, { actionId: "firm-email", confirmToken });

    const again = await client.post("/api/runs", {
      actionId: "firm-email",
      confirmToken,
    });
    expect(await refusal(again)).toMatchObject({
      status: 400,
      error: "token-invalid",
    });
    expect(run).toHaveBeenCalledOnce();
  });

  it("with a token older than 5 minutes", async () => {
    const { client, run, inbox } = await setup();
    vi.useFakeTimers({ toFake: ["Date"] });
    const { confirmToken } = await client.preview("firm-email", inbox.id);
    vi.setSystemTime(Date.now() + 5 * 60_000 + 1);

    const late = await client.post("/api/runs", {
      actionId: "firm-email",
      confirmToken,
    });
    expect((await refusal(late)).error).toBe("token-invalid");
    expect(run).not.toHaveBeenCalled();
  });

  it("with a token from another action or another session", async () => {
    const { app, codes, client, run, inbox } = await setup();
    await unlockSms(client);
    const phone = await client.verifyRecipient(codes, PHONE);
    const smsToken = (await client.preview("polite-sms", phone.id))
      .confirmToken;
    const crossAction = await client.post("/api/runs", {
      actionId: "firm-email",
      confirmToken: smsToken,
    });
    expect((await refusal(crossAction)).error).toBe("token-invalid");

    const emailToken = (await client.preview("firm-email", inbox.id))
      .confirmToken;
    const other = new TestClient(app);
    await unlockEmail(other);
    const crossSession = await other.post("/api/runs", {
      actionId: "firm-email",
      confirmToken: emailToken,
    });
    expect((await refusal(crossSession)).error).toBe("token-invalid");
    expect(run).not.toHaveBeenCalled();
  });

  it("to an unverified recipient", async () => {
    const { client, run } = await setup();
    const added = await client.post("/api/recipients", {
      channel: "email",
      address: "someone@example.com",
    });
    const { id } = (await added.json()) as { id: string };
    const response = await client.post("/api/sends/preview", {
      actionId: "firm-email",
      recipientId: id,
    });
    expect(await refusal(response)).toMatchObject({
      status: 409,
      error: "not-verified",
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("to a recipient deleted after the preview", async () => {
    const { client, run, inbox } = await setup();
    const { confirmToken } = await client.preview("firm-email", inbox.id);
    await client.request("DELETE", `/api/recipients/${inbox.id}`);

    const response = await client.post("/api/runs", {
      actionId: "firm-email",
      confirmToken,
    });
    expect((await refusal(response)).error).toBe("token-invalid");
    expect(run).not.toHaveBeenCalled();
  });

  it("by email to a phone, or with no verified recipient for the channel", async () => {
    const { codes, client, run } = await setup();
    await unlockSms(client);
    const phone = await client.verifyRecipient(codes, PHONE);
    const wrongChannel = await client.post("/api/sends/preview", {
      actionId: "firm-email",
      recipientId: phone.id,
    });
    expect((await refusal(wrongChannel)).status).toBe(400);

    await client.request("DELETE", `/api/recipients/${phone.id}`);
    expect((await client.state()).actionModes).toContainEqual({
      actionId: "polite-sms",
      mode: "simulated",
      reason: "no-verified-phone",
    });
    // Without a token, an action that can't go real simulates instead.
    const { mode } = await runToEnd(client, { actionId: "polite-sms" });
    expect(mode).toBe("simulated");
    expect(run).not.toHaveBeenCalled();
  });

  it("over the hourly limit for the channel", async () => {
    const { client, run, inbox } = await setup({
      ...DEFAULT_SEND_LIMITS,
      email: 1,
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    const first = await client.preview("firm-email", inbox.id);
    const second = await client.preview("firm-email", inbox.id);
    await runToEnd(client, {
      actionId: "firm-email",
      confirmToken: first.confirmToken,
    });

    // A preview made before the limit ran out is checked again at send time.
    const over = await client.post("/api/runs", {
      actionId: "firm-email",
      confirmToken: second.confirmToken,
    });
    expect(await refusal(over)).toMatchObject({
      status: 429,
      error: "rate-limited",
      message: expect.stringMatching(
        /^That's all the real emails for this hour\. This action simulates until \d\d:\d\d\.$/,
      ),
    });
    const preview = await client.post("/api/sends/preview", {
      actionId: "firm-email",
      recipientId: inbox.id,
    });
    expect((await refusal(preview)).error).toBe("rate-limited");
    expect((await client.state()).actionModes).toContainEqual({
      actionId: "firm-email",
      mode: "simulated",
      reason: "hour-limit",
    });
    expect(run).toHaveBeenCalledOnce();

    vi.setSystemTime(Date.now() + 60 * 60_000 + 1);
    await client.preview("firm-email", inbox.id);
  });

  it("over the daily limit across channels", async () => {
    const { codes, client, run, inbox } = await setup({
      ...DEFAULT_SEND_LIMITS,
      day: 1,
    });
    const { confirmToken } = await client.preview("firm-email", inbox.id);
    await runToEnd(client, { actionId: "firm-email", confirmToken });

    await unlockSms(client);
    const phone = await client.verifyRecipient(codes, PHONE);
    const preview = await client.post("/api/sends/preview", {
      actionId: "polite-sms",
      recipientId: phone.id,
    });
    expect(await refusal(preview)).toMatchObject({
      status: 429,
      error: "rate-limited",
      message:
        "That's all 1 real sends for today. Everything simulates until tomorrow.",
    });
    expect((await client.state()).actionModes).toContainEqual({
      actionId: "polite-sms",
      mode: "simulated",
      reason: "day-limit",
    });
    expect(run).toHaveBeenCalledOnce();
  });

  it("after De-escalate, even once the rung is unlocked again", async () => {
    const { client, run, inbox } = await setup();
    const { confirmToken } = await client.preview("firm-email", inbox.id);
    expect((await client.post("/api/reset")).status).toBe(200);

    const locked = await client.post("/api/runs", {
      actionId: "firm-email",
      confirmToken,
    });
    expect((await refusal(locked)).error).toBe("rung-locked");

    await unlockEmail(client);
    const cancelled = await client.post("/api/runs", {
      actionId: "firm-email",
      confirmToken,
    });
    expect((await refusal(cancelled)).error).toBe("token-invalid");
    expect(run).not.toHaveBeenCalled();
    // The verified inbox stays (register decision de-escalate-scope).
    expect((await client.state()).recipients).toEqual([inbox]);
  });
});

describe("previews that can't go real", () => {
  it("are refused on a pretend key", async () => {
    const codes = fakeCodeSender();
    const client = new TestClient(
      testApp({ keyVault: fakeKeyVault, codeSender: codes }),
    );
    await client.makeUpKeys("email");
    const inbox = await client.verifyRecipient(codes, INBOX);
    const response = await client.post("/api/sends/preview", {
      actionId: "firm-email",
      recipientId: inbox.id,
    });
    expect(await refusal(response)).toMatchObject({
      status: 409,
      error: "not-configured",
      message: "This action simulates: pretend key.",
    });
  });

  it("are refused on a locked rung", async () => {
    const codes = fakeCodeSender();
    const client = new TestClient(
      testApp({ keyVault: fakeKeyVault, codeSender: codes }),
    );
    const inbox = await client.verifyRecipient(codes, INBOX);
    const response = await client.post("/api/sends/preview", {
      actionId: "firm-email",
      recipientId: inbox.id,
    });
    expect((await refusal(response)).status).toBe(409);
  });
});

describe("a send the provider refuses", () => {
  it("is recorded as failed and doesn't use up the limit", async () => {
    const db = openDatabase(":memory:");
    const codes = fakeCodeSender();
    const client = new TestClient(
      testApp({
        db,
        keyVault: fakeKeyVault,
        codeSender: codes,
        realAdapters: {
          email: {
            run: async () => {
              throw new Error("Resend said no");
            },
          },
        },
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    await unlockEmail(client);
    const inbox = await client.verifyRecipient(codes, INBOX);
    const { confirmToken } = await client.preview("firm-email", inbox.id);
    const { events } = await runToEnd(client, {
      actionId: "firm-email",
      confirmToken,
    });

    expect(events.at(-1)?.type).toBe("failed");
    expect(db.select().from(sends).all()).toEqual([
      expect.objectContaining({ status: "failed", providerMessageId: null }),
    ]);
    expect((await client.state()).limits.hour.email.used).toBe(0);
  });
});
