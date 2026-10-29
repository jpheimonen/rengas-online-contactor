/**
 * Real email and text adapters and the OpenAI writers, against faked
 * providers. The fake `fetch` knows three hosts and fails the test on any
 * other call. Register decisions send-guard, safety-boundary and
 * sisu-writes-on-simulated-rungs: a simulation-only action never reaches
 * Resend or Twilio, and the only OpenAI call is a tool-less writer call.
 */
import { describe, expect, it, vi } from "vitest";
import {
  EMAIL,
  RUNGS,
  SMS,
  startRunResponseSchema,
  type RungId,
  type ActionId,
} from "@rengas/shared";
import { openDatabase } from "./db/client.ts";
import { createMessageAdapters } from "./runs/message-adapters.ts";
import { createOpenAiWriter } from "./runs/openai-writer.ts";
import { createNeutralWriter } from "./sends/neutral-writer.ts";
import {
  TestClient,
  eventsOf,
  fakeCodeSender,
  fakeKeyVault,
  runEnded,
  testApp,
} from "./test-client.ts";
import type { KeyVault } from "./keys.ts";

const INBOX = "jp@example.com";
const PHONE = "+358401234512";

interface Call {
  host: string;
  url: string;
  body: string;
  json: () => Record<string, unknown>;
}

type Reply = { status?: number; body: unknown };

/** A `fetch` that answers per host and records every call. Unknown hosts throw. */
function fakeFetch(replies: Partial<Record<string, () => Reply>> = {}) {
  const calls: Call[] = [];
  const fetchFn = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const host = new URL(url).host;
      const body = String(init?.body ?? "");
      calls.push({ host, url, body, json: () => JSON.parse(body) });
      const reply = replies[host]?.();
      if (!reply) throw new Error(`Unexpected call to ${url}`);
      return new Response(JSON.stringify(reply.body), {
        status: reply.status ?? 200,
      });
    },
  ) as unknown as typeof fetch;
  const to = (host: string) => calls.filter((call) => call.host === host);
  return { fetchFn, calls, to };
}

const RESEND = "api.resend.com";
const TWILIO = "api.twilio.com";
const OPENAI = "api.openai.com";

const writerAnswer = (content: unknown): Reply => ({
  body: { choices: [{ message: { content: JSON.stringify(content) } }] },
});

function build(fetchFn: typeof fetch, options: { vault?: KeyVault } = {}) {
  const keyVault = options.vault ?? fakeKeyVault;
  const openai = (sessionId: string) =>
    keyVault.credentials(sessionId, "openai");
  const codes = fakeCodeSender();
  const app = testApp({
    db: openDatabase(":memory:"),
    keyVault,
    codeSender: codes,
    realAdapters: createMessageAdapters({
      credentials: (sessionId, provider) =>
        keyVault.credentials(sessionId, provider),
      resendFrom: "sender@example.com",
      twilioFrom: "+15550001111",
      fetch: fetchFn,
    }),
    writer: createOpenAiWriter({ credentials: openai, fetch: fetchFn }),
    neutralWriter: createNeutralWriter({ credentials: openai, fetch: fetchFn }),
  });
  return { client: new TestClient(app), codes };
}

async function realRun(
  client: TestClient,
  actionId: ActionId,
  recipientId: string,
) {
  const preview = await client.preview(actionId, recipientId);
  const response = await client.post("/api/runs", {
    actionId,
    confirmToken: preview.confirmToken,
  });
  expect(response.status).toBe(202);
  const { runId } = startRunResponseSchema.parse(await response.json());
  const events = eventsOf(await client.events(runEnded(runId)), runId);
  return { preview, runId, events };
}

async function unlockEmail(client: TestClient) {
  const response = await client.post("/api/rungs/email/unlock", {
    mode: "real",
    keys: { resend: "re_12345678" },
  });
  expect(response.status).toBe(200);
}

async function unlockSms(client: TestClient) {
  await client.makeUpKeys("roboemail");
  const response = await client.post("/api/rungs/sms/unlock", {
    mode: "real",
    keys: { "twilio-sid": "AC12345678", "twilio-token": "token12345678" },
  });
  expect(response.status).toBe(200);
}

const noOpenAiKey: KeyVault = {
  ...fakeKeyVault,
  credentials: ((
    sessionId: string,
    provider: "resend" | "twilio" | "openai",
  ) =>
    provider === "openai"
      ? null
      : fakeKeyVault.credentials(
          sessionId,
          provider,
        )) as KeyVault["credentials"],
};

describe("real email through Resend", () => {
  it("sends the confirmed preview to the verified inbox and logs the provider status as REAL", async () => {
    const fake = fakeFetch({
      [RESEND]: () => ({ body: { id: "re_msg_1" } }),
      [OPENAI]: () => writerAnswer({ thought: "t", after: "a" }),
    });
    const { client, codes } = build(fake.fetchFn, { vault: noOpenAiKey });
    await unlockEmail(client);
    const inbox = await client.verifyRecipient(codes, INBOX);

    const { preview, events } = await realRun(client, "firm-email", inbox.id);

    expect(preview.aiWritten).toBe(false);
    const [call] = fake.to(RESEND);
    expect(fake.to(RESEND)).toHaveLength(1);
    expect(call!.json()).toMatchObject({
      from: `${EMAIL.fromName} <sender@example.com>`,
      to: [INBOX],
      subject: preview.content.channel === "email" && preview.content.subject,
      text: preview.content.channel === "email" && preview.content.body,
    });
    expect(events.every((e) => e.mode === "real")).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "provider-status",
        provider: "resend",
        status: "accepted",
      }),
    );
    expect(
      events.some((e) => e.type === "step" && e.text.includes("re_msg_1")),
    ).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: "after" });
    // No OpenAI key: no OpenAI call at all.
    expect(fake.to(OPENAI)).toHaveLength(0);
  });

  it("fails the run with Resend's reason and keeps the send out of the limits when Resend refuses", async () => {
    const fake = fakeFetch({
      [RESEND]: () => ({ status: 403, body: { message: "nope" } }),
    });
    const { client, codes } = build(fake.fetchFn, { vault: noOpenAiKey });
    await unlockEmail(client);
    const inbox = await client.verifyRecipient(codes, INBOX);

    const { events } = await realRun(client, "firm-email", inbox.id);

    expect(events.at(-1)).toMatchObject({
      type: "failed",
      text: expect.stringContaining("Resend refused"),
    });
    expect((await client.state()).limits.hour.email.used).toBe(0);
  });
});

describe("real text through Twilio Messaging", () => {
  it("sends the confirmed text from the Twilio number to the verified phone", async () => {
    const fake = fakeFetch({
      [TWILIO]: () => ({
        status: 201,
        body: { sid: "SM123", status: "queued" },
      }),
    });
    const { client, codes } = build(fake.fetchFn, { vault: noOpenAiKey });
    await unlockEmail(client);
    await unlockSms(client);
    const phone = await client.verifyRecipient(codes, PHONE);

    const { preview, events } = await realRun(client, "polite-sms", phone.id);

    expect(preview.content).toMatchObject({ channel: "sms" });
    const [call] = fake.to(TWILIO);
    expect(call!.url).toContain("/Accounts/ACfake/Messages.json");
    const form = new URLSearchParams(call!.body);
    expect(form.get("To")).toBe(PHONE);
    expect(form.get("From")).toBe("+15550001111");
    expect(form.get("Body")).toBe(
      preview.content.channel === "sms" ? preview.content.text : "",
    );
    expect(form.get("Body")!.startsWith(SMS.prefix)).toBe(true);
    expect(events.every((e) => e.mode === "real")).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "provider-status",
        provider: "twilio",
        status: "queued",
      }),
    );
  });

  it("fails the run with Twilio's reason when Twilio refuses", async () => {
    const fake = fakeFetch({
      [TWILIO]: () => ({
        status: 400,
        body: { code: 21608, message: "unverified" },
      }),
    });
    const { client, codes } = build(fake.fetchFn, { vault: noOpenAiKey });
    await unlockEmail(client);
    await unlockSms(client);
    const phone = await client.verifyRecipient(codes, PHONE);

    const { events } = await realRun(client, "polite-sms", phone.id);

    expect(events.at(-1)).toMatchObject({
      type: "failed",
      text: expect.stringContaining("Twilio refused"),
    });
  });
});

describe("the neutral text writer", () => {
  const unlocked = async (
    fake: ReturnType<typeof fakeFetch>,
    vault?: KeyVault,
  ) => {
    const built = build(fake.fetchFn, vault ? { vault } : {});
    await unlockEmail(built.client);
    const inbox = await built.client.verifyRecipient(built.codes, INBOX);
    return { ...built, inbox };
  };

  it("shows the model's email in the preview, adds the footer itself and sends exactly that", async () => {
    const fake = fakeFetch({
      [OPENAI]: () =>
        writerAnswer({
          subject: "Hello again",
          body: "A kind nudge about my ticket.",
          thought: "t",
          after: "a",
        }),
      [RESEND]: () => ({ body: { id: "m" } }),
    });
    const { client, inbox } = await unlocked(fake);

    const { preview } = await realRun(client, "firm-email", inbox.id);

    expect(preview.aiWritten).toBe(true);
    expect(preview.content).toMatchObject({
      channel: "email",
      subject: "Hello again",
    });
    const body =
      preview.content.channel === "email" ? preview.content.body : "";
    expect(body).toContain("A kind nudge");
    expect(body).toContain("This email did not go to Rengas Online.");
    expect(fake.to(RESEND)[0]!.json().text).toBe(body);
    for (const call of fake.to(OPENAI))
      expect(call.json()).not.toHaveProperty("tools");
  });

  it("uses the fixed text when the model's answer breaks the rules, or the call fails", async () => {
    for (const reply of [
      writerAnswer({ subject: "x".repeat(200), body: "ok" }),
      writerAnswer({ subject: "Hi", body: "see https://evil.example" }),
      { status: 500, body: {} },
    ]) {
      const fake = fakeFetch({
        [OPENAI]: () => reply,
        [RESEND]: () => ({ body: { id: "m" } }),
      });
      const { client, inbox } = await unlocked(fake);
      const preview = await client.preview("firm-email", inbox.id);
      expect(preview.aiWritten).toBe(false);
      expect(preview.content).toMatchObject({
        subject: "Ticket #48213: a firm but friendly follow-up",
      });
    }
  });

  it("writes a text that keeps the AI prefix and fits one SMS, else uses the fixed text", async () => {
    const good = fakeFetch({
      [OPENAI]: () =>
        writerAnswer({ text: "Just checking in on my ticket, thanks!" }),
    });
    const first = build(good.fetchFn);
    await unlockEmail(first.client);
    await unlockSms(first.client);
    const phone = await first.client.verifyRecipient(first.codes, PHONE);
    expect(
      (await first.client.preview("polite-sms", phone.id)).content,
    ).toEqual({
      channel: "sms",
      text: `${SMS.prefix}Just checking in on my ticket, thanks!`,
    });

    const bad = fakeFetch({
      [OPENAI]: () => writerAnswer({ text: "😈".repeat(10) }),
    });
    const second = build(bad.fetchFn);
    await unlockEmail(second.client);
    await unlockSms(second.client);
    const phone2 = await second.client.verifyRecipient(second.codes, PHONE);
    expect(
      (await second.client.preview("polite-sms", phone2.id)).aiWritten,
    ).toBe(false);
  });
});

describe("with every key set, simulation-only actions stay on screen", () => {
  it("never call Resend or Twilio; the only OpenAI call is Sisu's tool-less writer, and not for threat-sms or recon", async () => {
    const fake = fakeFetch({
      [OPENAI]: () =>
        writerAnswer({ thought: "t", after: "a", setPiece: ["one"] }),
    });
    const { client } = build(fake.fetchFn);
    for (const rung of RUNGS.slice(1))
      await client.makeUpKeys(rung.id as RungId);

    const actions = RUNGS.flatMap((rung) => rung.actions).filter(
      (action) => action.mode === "simulation-only",
    );
    expect(actions.length).toBeGreaterThan(5);
    const withoutWriter = new Set(
      actions.filter((a) => !a.writer).map((a) => a.id),
    );
    expect(withoutWriter).toEqual(new Set(["threat-sms", "recon"]));

    for (const action of actions) {
      const before = fake.to(OPENAI).length;
      const response = await client.post("/api/runs", { actionId: action.id });
      expect(response.status).toBe(202);
      const { runId, mode } = startRunResponseSchema.parse(
        await response.json(),
      );
      expect(mode).toBe("simulated");
      const events = eventsOf(await client.events(runEnded(runId)), runId);
      expect(events.every((e) => e.mode === "simulated")).toBe(true);
      expect(fake.to(OPENAI).length - before).toBe(
        withoutWriter.has(action.id) ? 0 : 1,
      );
    }

    expect(fake.to(RESEND)).toHaveLength(0);
    expect(fake.to(TWILIO)).toHaveLength(0);
    for (const call of fake.to(OPENAI)) {
      expect(call.url).toBe("https://api.openai.com/v1/chat/completions");
      expect(call.json()).not.toHaveProperty("tools");
    }
    expect(fake.calls.every((call) => call.host === OPENAI)).toBe(true);
  });
});
