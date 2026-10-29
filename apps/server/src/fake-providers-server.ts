/**
 * The real app with fake providers, for browser journeys that need a real-mode
 * run. Every provider key "works", the phone code is always 246810, the finder
 * returns two made-up web results, and a placed call plays a short scripted
 * conversation through the real call bridge: Twilio's signed status
 * callbacks, its media stream and OpenAI's transcript events are all faked
 * here. Nothing leaves the machine.
 *
 * Playwright starts it from apps/server (see playwright.config.ts), with PORT
 * and DATABASE_PATH. It is a test tool, never the app's entry point.
 */
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import type { RealKeySpec } from "@rengas/shared";
import { createApp } from "./app.ts";
import { openDatabase } from "./db/client.ts";
import type { KeyVault } from "./keys.ts";
import { VoiceCalls } from "./voice/calls.ts";
import type { ConnectRealtime, WireHandlers } from "./voice/realtime.ts";
import { twilioSignature, type TwilioCalls } from "./voice/twilio.ts";

export const FAKE_PHONE_CODE = "246810";
const AUTH_TOKEN = "fake-twilio-token";
const BASE = "https://calls.fake.test";

/** What the fake call says, in order, after it is answered. */
export const FAKE_CALL_SCRIPT = [
  [
    "sisu",
    "Hello! This is Sisu, an AI agent from the Rengas Online Contactor demo.",
  ],
  ["them", "Rengas Online customer service, how can I help?"],
  ["sisu", "I'm calling about ticket #48213. Where are my winter tyres?"],
  ["them", "Could you hold for a moment?"],
  ["sisu", "Of course. I have nothing but time."],
] as const;

const keyVault: KeyVault = {
  checkAndStore: async (_sessionId, rung) => ({
    provider: rung.keys.find((k): k is RealKeySpec => k.kind === "real")!
      .provider,
    hint: "…fake",
  }),
  configured: () => null,
  forget: () => {},
  list: () => [],
  credentials: (_sessionId, provider) =>
    ({
      resend: { apiKey: "re_fake" },
      twilio: { accountSid: "ACfake", authToken: AUTH_TOKEN },
      openai: { apiKey: "sk-fake" },
    })[provider] as never,
};

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

// The newest OpenAI socket the bridge opened; the script feeds it transcripts.
let realtime: WireHandlers | null = null;
const connectRealtime: ConnectRealtime = (_apiKey, handlers) => {
  realtime = handlers;
  return { send: () => {}, close: () => {} };
};

let calls = 0;
const twilio: TwilioCalls = {
  async place(_credentials, call) {
    calls += 1;
    void playCall(call.statusUrl.split("/").at(-1)!);
    return `CAfake${calls}`;
  },
  hangUp: async () => {},
  isTrial: async () => false,
};

/** Rings, answers, connects the media stream, then says the script. */
async function playCall(token: string) {
  const status = (CallStatus: string) => {
    const params = { CallStatus };
    const url = voice.statusUrl(token);
    return voice.status(
      token,
      params,
      twilioSignature(AUTH_TOKEN, url, params),
    );
  };
  await sleep(600);
  status("ringing");
  await sleep(1200);
  if (status("in-progress") !== "ok") return;
  const media = voice.attach(token, { send: () => {}, close: () => {} });
  if (!media) return;
  media.message(
    JSON.stringify({ event: "start", start: { streamSid: "MZfake" } }),
  );
  const openai = realtime!;
  openai.open();
  // After a hang-up the bridge ignores these, as it would a late frame.
  for (const [speaker, transcript] of FAKE_CALL_SCRIPT) {
    await sleep(900);
    openai.message(
      JSON.stringify(
        speaker === "sisu"
          ? { type: "response.output_audio_transcript.done", transcript }
          : {
              type: "conversation.item.input_audio_transcription.completed",
              transcript,
            },
      ),
    );
  }
}

const voice = new VoiceCalls({
  publicBaseUrl: `${BASE}/`,
  fromNumber: "+15005550006",
  keyVault,
  twilio,
  connectRealtime,
});

const app = createApp({
  db: openDatabase(process.env.DATABASE_PATH ?? ":memory:"),
  appSecret: "e2e-secret-e2e-secret-e2e-secret-00",
  keyVault,
  voice,
  codeSender: {
    sendEmailCode: async () => {},
    startPhoneCode: async () => {},
    checkPhoneCode: async (_credentials, _to, code) =>
      code === FAKE_PHONE_CODE ? "approved" : "wrong",
  },
  finder: {
    search: async ({ kind }) => [
      {
        name:
          kind === "aircraft"
            ? "Fake Airship Advertising Oy"
            : "Fake Errand Platform",
        offer: "A made-up web result for the browser tests.",
        price: null,
        location: "Helsinki, Finland",
        sourceUrl:
          "https://www.fake-result.test/a/very/long/path/that/must/not/overflow",
      },
      {
        name: kind === "aircraft" ? "Fake Banner Planes" : "Fake Sign Holders",
        offer: "Another made-up web result.",
        price: "€120 an hour",
        location: "Tampere, Finland",
        sourceUrl: "https://second.fake-result.test/",
      },
    ],
  },
  stepDelayMs: 50,
});

// The other Playwright web server builds the app; the files are read per request.
const root = "../web/dist";
app.use("*", serveStatic({ root }));
app.get("*", serveStatic({ root, path: "index.html" }));

serve({
  fetch: app.fetch,
  hostname: "127.0.0.1",
  port: Number(process.env.PORT),
});
