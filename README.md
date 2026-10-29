# rengas-online-contactor

> **A joke project that really sends, but only to you.**

"AI outreach agent" satire: a ladder of ten escalating rungs, from a polite customer inquiry to a blimp
over the warehouse and "The Singularity". With provider keys, three of the actions are real: a firm email,
a polite text and an AI phone call. They go to **your own** email address and phone number, and nothing else.
Without a key, the same action runs as a simulation, so the app is fully usable with no setup.

In the demo, your inbox and phone stand in for Rengas Online.

## Safety rules

- **Only verified recipients.** A real send needs a recipient you have verified with a code
  (email code through Resend, phone code through Twilio Verify). The code expires after 10 minutes. An email code allows 5 wrong tries.
- **Preview first.** You see the exact message and recipient and confirm before anything leaves the server.
- **Neutral text only.** OpenAI writes the message when a key is set. The server adds a footer or prefix,
  and checks length and that there are no links. If the text breaks a rule or the call fails, a fixed neutral text is used.
- **Abusive rungs never send.** Email storm, threat texts, robocalls, Facebook siege, staff recon, renting
  humans, aircraft and the rest are always simulated. Staff and humans it "finds" are invented.
- **Finder actions book nothing.** With an OpenAI key they run a real web search; without one they show examples.
- **Rate limits per browser session.** Defaults: 3 emails/hour, 3 texts/hour, 2 calls/hour, 10 sends/day. Verification codes don't count.
- **Keys stay on the server.** Keys you type in the UI are checked with the provider, then stored encrypted
  (AES-256-GCM, with `APP_SECRET`). The browser only sees masked hints.
- **De-escalate** cancels pending verification codes.

## Setup

Needs Node 24 or newer and pnpm.

```sh
pnpm install
cp .env.example .env     # then edit .env
pnpm dev                 # web on http://127.0.0.1:5173, API on 127.0.0.1:8787
```

For one process, run `pnpm build && pnpm start` and open http://127.0.0.1:8787.

`APP_SECRET` is required and must be at least 32 characters (generate one with `openssl rand -hex 32`). Keys saved in the UI are encrypted with it, so changing `APP_SECRET` makes them unreadable: clear them with De-escalate and enter them again.
Every provider key is optional. A channel without its key simulates. You can also paste keys into the
rung's key form in the UI instead of using `.env`.

## Provider keys

| Variable                                  | Used for                                                         | Where to get it                                                                                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`, `RESEND_FROM`           | Real email and email verification codes                          | [resend.com](https://resend.com) API keys. The sandbox sender `onboarding@resend.dev` only delivers to your own Resend account address until you verify a domain. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Phone verification (Twilio Verify), SMS and calls                | [twilio.com/console](https://console.twilio.com). Both are needed. A trial account only reaches numbers you verified there.                                       |
| `TWILIO_FROM_NUMBER`                      | Sender number for SMS and calls                                  | A Twilio phone number in your console. Without it, texts and calls stay simulated.                                                                                |
| `OPENAI_API_KEY`                          | Writing the neutral text, the live call voice, the finder search | [platform.openai.com/api-keys](https://platform.openai.com/api-keys)                                                                                              |

## Real calls: `PUBLIC_BASE_URL` and a tunnel

Twilio must reach your server to report call status and stream audio. On localhost that needs a tunnel.
Real calls turn on only when `PUBLIC_BASE_URL` and `TWILIO_FROM_NUMBER` are both set.

```sh
pnpm build && pnpm start          # server on 127.0.0.1:8787
ngrok http 8787                   # or: cloudflared tunnel --url http://127.0.0.1:8787
```

**Warning:** the tunnel publishes the whole app, not only the Twilio webhooks. Anyone with the tunnel URL can use the keys in `.env`, so keep the URL private and stop the tunnel when you are done.

Put the tunnel's https address in `.env` as `PUBLIC_BASE_URL=https://example.ngrok.app` and restart. The server uses:

- `POST {PUBLIC_BASE_URL}/twilio/status/:token`, with Twilio signature check
- `wss://…/twilio/media/:token`, for the call's audio stream

If the call never reports back, check that the tunnel points at the server port.

## Verifying a recipient

1. Click **Your stand-ins** and enter your email address or phone number (with country code).
2. Click **Send email code** or **Send phone code**. The code arrives by email (Resend) or SMS (Twilio Verify).
3. Enter the 6-digit code and click **Verify inbox** or the phone equivalent. The recipient is now verified for this session, and real-capable rungs (firm email, polite text, AI call) can send to it after you confirm the preview.

At most 5 codes per hour per session.

## Commands and checks

| Command                     | What it does                                                                 |
| --------------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`                  | Server and web app with reload                                               |
| `pnpm build` / `pnpm start` | Build everything / run the server (serves the built web app)                 |
| `pnpm typecheck`            | TypeScript in every package                                                  |
| `pnpm lint`                 | ESLint                                                                       |
| `pnpm format:check`         | Prettier (`pnpm format` fixes)                                               |
| `pnpm test`                 | Unit and API tests (providers are faked; no real sends)                      |
| `pnpm e2e`                  | Playwright browser tests (first run `pnpm exec playwright install chromium`) |

## Layout

- `apps/web`: React app
- `apps/server`: Hono API, SQLite (drizzle), Twilio voice bridge
- `packages/shared`: ladder, rules and API types shared by both
- `tests/parity`: fixtures recorded from the first, fully simulated version (commit `f5b9e78`, the old app's reference commit). `pnpm exec node tests/parity/export-fixtures.ts` rebuilds them from that commit.
