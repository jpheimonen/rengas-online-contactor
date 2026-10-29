import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CALL,
  DEFAULT_TICKET,
  SIMULATE_REASONS,
  SYSTEM_LINES,
  startRunResponseSchema,
} from "@rengas/shared";
import { openDatabase } from "./db/client.ts";
import { sends } from "./db/schema.ts";
import { providerRefused } from "./recipients/code-sender.ts";
import {
  TestClient,
  eventsOf,
  fakeCodeSender,
  fakeKeyVault,
  fakeRealtime,
  fakeTwilioCalls,
  fakeWire,
  runEnded,
  testApp,
} from "./test-client.ts";
import { VoiceCalls, type CallTiming } from "./voice/calls.ts";
import { twilioSignature } from "./voice/twilio.ts";

const PHONE = "+358401234567";
const BASE = "https://calls.example.test";
/** The Twilio auth token in `fakeKeyVault`. */
const AUTH_TOKEN = "fake";

async function setup(
  options: { trial?: boolean; timing?: Partial<CallTiming> } = {},
) {
  const db = openDatabase(":memory:");
  const codes = fakeCodeSender();
  const twilio = fakeTwilioCalls({ trial: options.trial ?? false });
  const realtime = fakeRealtime();
  const voice = new VoiceCalls({
    publicBaseUrl: `${BASE}/`,
    fromNumber: "+15005550006",
    keyVault: fakeKeyVault,
    twilio,
    connectRealtime: realtime.connect,
    ...(options.timing && { timing: options.timing }),
  });
  const app = testApp({ db, keyVault: fakeKeyVault, codeSender: codes, voice });
  const client = new TestClient(app);
  const phone = await client.verifyRecipient(codes, PHONE);
  return { db, app, client, phone, twilio, realtime, voice };
}

/** Climbs to level 5 with real keys at levels 4 and 5. */
async function unlockCall(client: TestClient, twilioMode = "real") {
  await client.makeUpKeys("email");
  await client.makeUpKeys("roboemail");
  if (twilioMode === "real") {
    const sms = await client.post("/api/rungs/sms/unlock", {
      mode: "real",
      keys: { "twilio-sid": "AC12345678", "twilio-token": "token12345678" },
    });
    expect(sms.status).toBe(200);
  } else {
    await client.makeUpKeys("sms");
  }
  const robocall = await client.post("/api/rungs/robocall/unlock", {
    mode: "real",
    keys: { openai: "sk-12345678" },
  });
  expect(robocall.status).toBe(200);
}

type Setup = Awaited<ReturnType<typeof setup>>;

/** Previews and confirms the call, and waits until Twilio has been asked to place it. */
async function startCall({ client, phone, twilio }: Setup) {
  const { confirmToken } = await client.preview("ai-call", phone.id);
  const response = await client.post("/api/runs", {
    actionId: "ai-call",
    confirmToken,
  });
  expect(response.status).toBe(202);
  const { runId, mode } = startRunResponseSchema.parse(await response.json());
  expect(mode).toBe("real");
  await vi.waitFor(() => expect(twilio.placed).toHaveLength(1));
  const placed = twilio.placed[0]!;
  const token = placed.statusUrl.split("/").at(-1)!;
  return { runId, placed, token };
}

/** Posts a status callback the way Twilio does, signed with the account's auth token. */
function twilioStatus(
  { app }: Setup,
  token: string,
  params: Record<string, string>,
  signature = twilioSignature(
    AUTH_TOKEN,
    `${BASE}/twilio/status/${token}`,
    params,
  ),
) {
  return app.request(`/twilio/status/${token}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": signature,
    },
    body: new URLSearchParams(params),
  });
}

/** Twilio's media stream connects and starts; OpenAI's socket opens. */
function connectMedia(s: Setup, token: string) {
  const twilioWire = fakeWire();
  const media = s.voice.attach(token, twilioWire)!;
  media.message(
    JSON.stringify({ event: "start", start: { streamSid: "MZ1" } }),
  );
  const openai = s.realtime.connections.at(-1)!;
  openai.handlers.open();
  const fromOpenAI = (message: unknown) =>
    openai.handlers.message(JSON.stringify(message));
  return { media, twilioWire, openai, fromOpenAI };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a real AI call", () => {
  it("calls the verified phone, bridges it to gpt-realtime and logs statuses and the transcript", async () => {
    const s = await setup();
    await unlockCall(s.client);
    expect(
      (await s.client.state()).actionModes.find(
        (m) => m.actionId === "ai-call",
      ),
    ).toMatchObject({ mode: "real" });

    const { runId, placed, token } = await startCall(s);
    expect(placed).toEqual({
      to: PHONE,
      from: "+15005550006",
      streamUrl: `wss://calls.example.test/twilio/media/${token}`,
      statusUrl: `${BASE}/twilio/status/${token}`,
      timeLimitSeconds: CALL.maxSeconds + 15,
    });
    expect(token).toMatch(/^[\w-]{32}$/);

    expect(
      (await twilioStatus(s, token, { CallStatus: "ringing" })).status,
    ).toBe(204);
    expect(
      (await twilioStatus(s, token, { CallStatus: "in-progress" })).status,
    ).toBe(204);

    const { media, twilioWire, openai, fromOpenAI } = connectMedia(s, token);
    expect(openai.apiKey).toBe("sk-fake");
    const session = openai.wire.sent[0] as {
      session: { instructions: string };
    };
    expect(session.session.instructions).toContain(CALL.opening);
    expect(session.session.instructions).toContain(
      `ticket #${DEFAULT_TICKET.number}: ${DEFAULT_TICKET.complaint}`,
    );

    media.message(
      JSON.stringify({ event: "media", media: { payload: "aGk=" } }),
    );
    expect(openai.wire.sent.at(-1)).toEqual({
      type: "input_audio_buffer.append",
      audio: "aGk=",
    });
    fromOpenAI({ type: "response.output_audio.delta", delta: "eW8=" });
    expect(twilioWire.sent).toEqual([
      { event: "media", streamSid: "MZ1", media: { payload: "eW8=" } },
    ]);
    fromOpenAI({
      type: "response.output_audio_transcript.done",
      transcript: CALL.opening,
    });
    fromOpenAI({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Rengas Online customer service, how can I help?",
    });

    // The person hangs up: Twilio closes the stream, then reports the end.
    media.close();
    expect(openai.wire.closed).toBe(true);
    expect(
      (
        await twilioStatus(s, token, {
          CallStatus: "completed",
          CallDuration: "72",
        })
      ).status,
    ).toBe(204);

    const events = eventsOf(await s.client.events(runEnded(runId)), runId);
    expect(events.every((e) => e.mode === "real")).toBe(true);
    expect(
      events.map((e) => [e.type, "text" in e ? e.text : undefined]),
    ).toEqual([
      ["started", undefined],
      ["thought", expect.any(String)],
      ["step", "Calling +358 40 ••• 67, standing in for Rengas Online…"],
      ["provider-status", CALL.statuses.ringing],
      ["provider-status", CALL.statuses["in-progress"]],
      ["transcript", CALL.opening],
      ["transcript", "Rengas Online customer service, how can I help?"],
      ["provider-status", CALL.statuses.completed],
      ["step", "Call ended after 1 min 12 s."],
      ["done", SYSTEM_LINES.realDone],
      ["after", expect.any(String)],
    ]);
    expect(
      events.filter((e) => e.type === "transcript").map((e) => e.speaker),
    ).toEqual(["sisu", "them"]);
    expect(s.db.select().from(sends).all()).toEqual([
      expect.objectContaining({
        channel: "voice",
        recipientAddress: PHONE,
        status: "sent",
        providerMessageId: "CA1",
      }),
    ]);
    expect(s.twilio.hungUp).toEqual([]);
  });

  it("nudges Sisu before the cap and hangs up when the cap runs out", async () => {
    const s = await setup({ timing: { capMs: 60, nudgeBeforeCapMs: 30 } });
    await unlockCall(s.client);
    const { runId, token } = await startCall(s);
    const { openai } = connectMedia(s, token);

    await vi.waitFor(() => expect(s.twilio.hungUp).toEqual(["CA1"]));
    const types = openai.wire.sent.map((m) => m.type);
    expect(types).toContain("conversation.item.create");

    await twilioStatus(s, token, {
      CallStatus: "completed",
      CallDuration: "90",
    });
    const events = eventsOf(await s.client.events(runEnded(runId)), runId);
    const texts = events.map((e) => ("text" in e ? e.text : e.type));
    expect(texts).toContain(CALL.capReached);
    expect(texts).toContain("Call ended after 1 min 30 s.");
    expect(events.at(-1)?.type).toBe("after");
  });

  it("hangs up when Sisu calls end_call, after its goodbye has played", async () => {
    const s = await setup();
    await unlockCall(s.client);
    const { token } = await startCall(s);
    const { media, fromOpenAI } = connectMedia(s, token);

    fromOpenAI({
      type: "response.function_call_arguments.done",
      name: "end_call",
      call_id: "c1",
      arguments: "{}",
    });
    expect(s.twilio.hungUp).toEqual([]);
    media.message(JSON.stringify({ event: "mark", mark: { name: "goodbye" } }));
    expect(s.twilio.hungUp).toEqual(["CA1"]);
    await twilioStatus(s, token, {
      CallStatus: "completed",
      CallDuration: "20",
    });
  });

  it("hangs up on De-escalate and logs nothing after the cancel", async () => {
    const s = await setup();
    await unlockCall(s.client);
    const { runId, token } = await startCall(s);
    const { fromOpenAI, openai } = connectMedia(s, token);

    expect((await s.client.post("/api/reset")).status).toBe(200);
    expect(s.twilio.hungUp).toEqual(["CA1"]);
    expect(openai.wire.closed).toBe(true);

    // Late frames and callbacks from the ended call are ignored.
    fromOpenAI({
      type: "response.output_audio_transcript.done",
      transcript: "Too late.",
    });
    expect(
      (await twilioStatus(s, token, { CallStatus: "completed" })).status,
    ).toBe(404);

    const events = eventsOf(await s.client.log(), runId);
    expect(events.at(-1)?.type).toBe("cancelled");
    expect(events.some((e) => e.type === "transcript")).toBe(false);
  });

  it("fails the run and hangs up when OpenAI drops the voice", async () => {
    const s = await setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    await unlockCall(s.client);
    const { runId, token } = await startCall(s);
    const { openai } = connectMedia(s, token);

    openai.handlers.close();
    expect(s.twilio.hungUp).toEqual(["CA1"]);
    await twilioStatus(s, token, {
      CallStatus: "completed",
      CallDuration: "5",
    });

    const events = eventsOf(await s.client.events(runEnded(runId)), runId);
    const texts = events.map((e) => ("text" in e ? e.text : e.type));
    expect(texts).toContain(CALL.voiceLost);
    expect(events.at(-1)?.type).toBe("failed");
  });

  it("ends without a duration line when nobody answers", async () => {
    const s = await setup();
    await unlockCall(s.client);
    const { runId, token } = await startCall(s);
    await twilioStatus(s, token, { CallStatus: "no-answer" });

    const events = eventsOf(await s.client.events(runEnded(runId)), runId);
    const texts = events.map((e) => ("text" in e ? e.text : e.type));
    expect(texts).toContain(CALL.statuses["no-answer"]);
    expect(texts.some((t) => t.startsWith("Call ended after"))).toBe(false);
    expect(events.at(-1)?.type).toBe("after");
  });
});

describe("a call Twilio refuses", () => {
  it("shows Twilio's reason, fails the run and doesn't count the call", async () => {
    const s = await setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    s.twilio.place.mockRejectedValueOnce(
      providerRefused("twilio", SYSTEM_LINES.twilioTrialUnverified),
    );
    await unlockCall(s.client);
    const { confirmToken } = await s.client.preview("ai-call", s.phone.id);
    const response = await s.client.post("/api/runs", {
      actionId: "ai-call",
      confirmToken,
    });
    const { runId } = startRunResponseSchema.parse(await response.json());

    const events = eventsOf(await s.client.events(runEnded(runId)), runId);
    expect(events.at(-2)).toMatchObject({
      type: "provider-status",
      status: "refused",
      text: expect.stringContaining(SYSTEM_LINES.twilioTrialUnverified),
    });
    expect(events.at(-1)?.type).toBe("failed");
    expect((await s.client.state()).limits.hour.voice.used).toBe(0);
  });
});

describe("Twilio's webhooks", () => {
  it("refuse a status callback with a wrong signature or for an unknown call", async () => {
    const s = await setup();
    await unlockCall(s.client);
    const { runId, token } = await startCall(s);

    const forged = await twilioStatus(
      s,
      token,
      { CallStatus: "completed" },
      "bm9wZQ==",
    );
    expect(forged.status).toBe(403);
    expect(
      (await twilioStatus(s, "no-such-call", { CallStatus: "completed" }))
        .status,
    ).toBe(404);
    expect(s.voice.canAttach("no-such-call")).toBe(false);

    // The call's only media stream attaches once.
    expect(s.voice.canAttach(token)).toBe(true);
    connectMedia(s, token);
    expect(s.voice.canAttach(token)).toBe(false);
    expect(s.voice.attach(token, fakeWire())).toBeNull();

    await twilioStatus(s, token, {
      CallStatus: "completed",
      CallDuration: "3",
    });
    await s.client.events(runEnded(runId));
  });
});

describe("whether the call can go real", () => {
  it("simulates with a pretend Twilio key at level 4, even with a real OpenAI key", async () => {
    const s = await setup();
    await unlockCall(s.client, "pretend");
    expect(
      (await s.client.state()).actionModes.find(
        (m) => m.actionId === "ai-call",
      ),
    ).toMatchObject({ mode: "simulated", reason: "needs-twilio" });

    const preview = await s.client.post("/api/sends/preview", {
      actionId: "ai-call",
      recipientId: s.phone.id,
    });
    expect(preview.status).toBe(409);
    expect(await preview.json()).toMatchObject({
      message: `This action simulates: ${SIMULATE_REASONS["needs-twilio"]}.`,
    });
    expect(s.twilio.place).not.toHaveBeenCalled();
  });

  it("needs a confirmed preview before Twilio is asked to call", async () => {
    const s = await setup();
    await unlockCall(s.client);
    const response = await s.client.post("/api/runs", { actionId: "ai-call" });
    expect(response.status).toBe(400);
    expect(s.twilio.place).not.toHaveBeenCalled();
  });

  it("says in the preview when the Twilio account is a trial", async () => {
    const trial = await setup({ trial: true });
    await unlockCall(trial.client);
    const preview = await trial.client.preview("ai-call", trial.phone.id);
    expect(preview.content).toMatchObject({
      channel: "voice",
      maxSeconds: CALL.maxSeconds,
      trialNotice: true,
    });

    const full = await setup();
    await unlockCall(full.client);
    expect(
      (await full.client.preview("ai-call", full.phone.id)).content,
    ).toMatchObject({ trialNotice: false });
  });
});
