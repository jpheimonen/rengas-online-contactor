/**
 * The app with faked providers, for the Playwright journeys only. Key checks,
 * verification codes and real sends go to in-memory fakes, so the real-send
 * flow can be driven end to end without keys or network. Production starts
 * from index.ts; nothing imports this file.
 *
 * Two extra routes let the tests read what the fakes saw:
 * - GET /__fake/codes?to=ADDRESS → { code } for the last email code sent there
 * - GET /__fake/sends → [{ channel, to, content }] for every real send
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openDatabase } from "./db/client.ts";
import type { KeyCheckers } from "./key-checks.ts";
import { createKeyVault } from "./keys.ts";
import type { CodeSender } from "./recipients/code-sender.ts";
import type { ChannelAdapter, RealAdapters } from "./runs/adapters.ts";
import type { ConfirmedSend } from "./sends/guard.ts";

/** The phone code Twilio Verify "sends" here. */
const PHONE_CODE = "246810";
/** A typed key containing this word is refused, so the refusal path can be shown. */
const REFUSED = "refused";

const config = loadConfig();
const db = openDatabase(config.DATABASE_PATH);

const accept = async (key: string) =>
  key.includes(REFUSED) ? "refused" : "ok";
const checkers: KeyCheckers = {
  resend: ({ apiKey }) => accept(apiKey),
  twilio: ({ authToken }) => accept(authToken),
  openai: ({ apiKey }) => accept(apiKey),
};

const emailCodes = new Map<string, string>();
const codeSender: CodeSender = {
  sendEmailCode: async (_credentials, to, code) => {
    emailCodes.set(to, code);
  },
  startPhoneCode: async () => {},
  checkPhoneCode: async (_credentials, _to, code) =>
    code === PHONE_CODE ? "approved" : "wrong",
};

const sends: {
  channel: string;
  to: string;
  content: ConfirmedSend["content"];
}[] = [];
const PROVIDER = { email: "resend", sms: "twilio", voice: "twilio" } as const;
const fakeAdapter = (channel: keyof typeof PROVIDER): ChannelAdapter => ({
  async run({ send, emit, pause }) {
    if (!send) throw new Error("A real adapter ran without a confirmed send");
    await pause();
    sends.push({
      channel,
      to: send.recipient.address,
      content: send.content,
    });
    send.markSent(`fake-${sends.length}`);
    emit({
      type: "provider-status",
      provider: PROVIDER[channel],
      status: "accepted",
      text: `Accepted for ${send.recipient.masked}.`,
    });
  },
});
const realAdapters: RealAdapters = {
  email: fakeAdapter("email"),
  sms: fakeAdapter("sms"),
  voice: fakeAdapter("voice"),
};

const app = createApp({
  db,
  keyVault: createKeyVault({
    db,
    appSecret: config.APP_SECRET,
    preset: {},
    checkers,
  }),
  appSecret: config.APP_SECRET,
  codeSender,
  realAdapters,
  sendLimits: {
    email: config.SEND_LIMIT_EMAIL_PER_HOUR,
    sms: config.SEND_LIMIT_SMS_PER_HOUR,
    voice: config.SEND_LIMIT_CALLS_PER_HOUR,
    day: config.SEND_LIMIT_PER_DAY,
  },
});

app.get("/__fake/codes", (c) =>
  c.json({ code: emailCodes.get(c.req.query("to") ?? "") ?? null }),
);
app.get("/__fake/sends", (c) => c.json(sends));

// Same as index.ts: serve the built web app with index.html as the SPA fallback.
const webDist = fileURLToPath(new URL("../../web/dist", import.meta.url));
if (existsSync(webDist)) {
  const root = "../web/dist";
  app.use("*", serveStatic({ root }));
  app.get("*", serveStatic({ root, path: "index.html" }));
}

serve(
  { fetch: app.fetch, hostname: config.HOST, port: config.PORT },
  (info) => {
    console.log(`Fake-provider app on http://${info.address}:${info.port}`);
  },
);
