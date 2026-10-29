import { existsSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openDatabase } from "./db/client.ts";
import { liveFinder } from "./finder.ts";
import { liveKeyCheckers } from "./key-checks.ts";
import { createKeyVault, presetKeys } from "./keys.ts";
import { createMessageAdapters } from "./runs/message-adapters.ts";
import { createOpenAiWriter } from "./runs/openai-writer.ts";
import { createNeutralWriter } from "./sends/neutral-writer.ts";
import { createCodeSender } from "./recipients/code-sender.ts";
import { VoiceCalls } from "./voice/calls.ts";
import { attachMediaStreams } from "./voice/media-server.ts";
import { connectRealtime } from "./voice/realtime.ts";
import { liveTwilioCalls } from "./voice/twilio.ts";

const config = loadConfig();
const db = openDatabase(config.DATABASE_PATH);
const keyVault = createKeyVault({
  db,
  appSecret: config.APP_SECRET,
  preset: presetKeys(config),
  checkers: liveKeyCheckers(),
});
// A real call needs a public address for Twilio's webhooks and a number to call from.
const voice =
  config.PUBLIC_BASE_URL && config.TWILIO_FROM_NUMBER
    ? new VoiceCalls({
        publicBaseUrl: config.PUBLIC_BASE_URL,
        fromNumber: config.TWILIO_FROM_NUMBER,
        keyVault,
        twilio: liveTwilioCalls(),
        connectRealtime,
      })
    : undefined;
console.log(
  voice
    ? `Real AI calls are on. Twilio reaches this server at ${config.PUBLIC_BASE_URL}.`
    : "Real AI calls are off: set PUBLIC_BASE_URL and TWILIO_FROM_NUMBER to turn them on. The call simulates.",
);

const openAiKey = (sessionId: string) =>
  keyVault.credentials(sessionId, "openai");
const app = createApp({
  db,
  keyVault,
  finder: liveFinder(),
  ...(voice && { voice }),
  appSecret: config.APP_SECRET,
  realAdapters: createMessageAdapters({
    credentials: (sessionId, provider) =>
      keyVault.credentials(sessionId, provider),
    resendFrom: config.RESEND_FROM,
    twilioFrom: config.TWILIO_FROM_NUMBER,
  }),
  writer: createOpenAiWriter({ credentials: openAiKey }),
  neutralWriter: createNeutralWriter({ credentials: openAiKey }),
  codeSender: createCodeSender(config.RESEND_FROM),
  sendLimits: {
    email: config.SEND_LIMIT_EMAIL_PER_HOUR,
    sms: config.SEND_LIMIT_SMS_PER_HOUR,
    voice: config.SEND_LIMIT_CALLS_PER_HOUR,
    day: config.SEND_LIMIT_PER_DAY,
  },
});

// After `pnpm build` the same process also serves the web app, with index.html as the SPA fallback.
const webDist = fileURLToPath(new URL("../../web/dist", import.meta.url));
if (existsSync(webDist)) {
  // serveStatic resolves root from the working directory.
  const root = relative(process.cwd(), webDist);
  app.use("*", serveStatic({ root }));
  // Unknown API and webhook paths get a 404, not the page.
  app.all("/api/*", (c) =>
    c.json({ error: "not-found", message: "No such endpoint." }, 404),
  );
  app.all("/twilio/*", (c) => c.text("Not found", 404));
  app.get("*", serveStatic({ root, path: "index.html" }));
}

const server = serve(
  { fetch: app.fetch, hostname: config.HOST, port: config.PORT },
  (info) => {
    console.log(`Listening on http://${info.address}:${info.port}`);
  },
);
if (voice) attachMediaStreams(server, voice);
