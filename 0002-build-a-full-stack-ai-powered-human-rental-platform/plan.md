# Plan

Written by the factory from Beads Rust. Do not edit.

## Asked for

ok seems u misunderstood the assignment. yes this is a joke project but for fucks sake do it properly and with much more effort! i cant show garbage like that

## Where it stands

Done:
- product-concept: Settle what "much more ambition" means for this product (register unknown ambition-shape) so the rebuild is something the user can proudly show.
- parity-fixtures: Record the old app's behaviour before it is rewritten, as the parity plan (parity-plan.md in the task folder) describes.
- workspace-setup: Set up the pnpm workspace from register decision stack-and-layout: apps/web (React 19, Vite 8), apps/server (Hono 4 on Node 24), packages/shared.
- ui-design: Design how the rebuilt app looks and behaves, following the product concept.
- shared-ladder: Build packages/shared.
- server-core: Build the server core in apps/server, following architecture/index.md and register decisions runs-and-sse and session-and-hosting.
- key-vault-server: Build the key vault from register decision provider-keys.
- send-guard-server: Build recipient verification and the send guard from register decision send-guard.
- web-foundation: Build the React app's foundation in apps/web from the UI design.
- email-sms-sending: Add the real email and SMS adapters to the run engine.
- voice-call-server: Build the real AI robocall from register decision voice-call-approach.
- finder-agent-server: Build the finder agent from register decision finder-agent: POST /api/finder calls OpenAI Responses with web_search as its only tool.
- real-send-ui: Build the real-send flow in the web app from the UI design.
- call-and-finder-ui: Build the live call view with its streaming transcript, the finder result cards (source links and a "Simulate booking" button that only plays a scripted run), and the remaining features from the product concept, all from the UI design.
- end-to-end-safety-tests: Add end-to-end tests of the whole app that run with fake providers.
- readme: Rewrite the README for the new app.

Back with the coordinator:
- remove-old-app: Delete the old browser-only app now that parity holds.

## Register

- safety-boundary [decision B, resolved, owner planner]: Real sends reach only the operator's verified recipients; abusive rungs always simulate
- stack-and-layout [decision B, resolved, owner planner]: TypeScript pnpm monorepo: React 19 SPA, Hono API on Node 24, SQLite through Drizzle
- channel-adapters [decision B, resolved, owner planner]: Each action runs through a channel adapter; only neutral email, SMS and voice have real adapters
- provider-keys [decision B, resolved, owner planner]: Keys are entered in the UI, checked live by the server and stored encrypted; they never return to the browser
- providers [decision B, resolved, owner planner]: Providers: Resend for email, Twilio for SMS, codes and calls, OpenAI for voice, writing and the finder
- send-guard [decision B, resolved, owner planner]: Every real send goes preview → confirm → send, and is checked again on the server
- runs-and-sse [decision B, resolved, owner planner]: Actions become server-side runs whose events stream to the activity log over SSE
- session-and-hosting [decision B, resolved, owner planner]: One operator per browser session, no accounts; one Node process serves the API and the built SPA
- voice-call-approach [decision B, resolved, owner planner]: Real robocall: Twilio dials the verified phone, a server bridge links its media stream to gpt-realtime
- finder-agent [decision B, resolved, owner planner]: The finder agent searches the web for blimp and rent-a-human options and only shows them
- no-data-to-migrate [fact, current, owner planner]: The old app keeps no data, so nothing migrates except the ladder content
- ambition-shape [unknown, open, owner planner]: What "much more ambition" looks like as a product is not settled yet
- rentahuman-lists-people [fact, current, owner worker-ce7d995ca298]: RentAHuman.ai lists individual people with profiles, not businesses
- twilio-trial-limits [fact, current, owner worker-ce7d995ca298]: Twilio trial accounts reach only verified numbers, prefix SMS, and need a key press on calls
- resend-sandbox-limit [fact, current, owner worker-ce7d995ca298]: Resend without a verified domain sends only to the account owner's own address
- sisu-writes-on-simulated-rungs [decision A, resolved, owner planner]: Let Sisu's text writer run on simulation-only rungs, which narrows the zero-provider-calls safety test
- ladder-of-ten [decision B, resolved, owner worker-ce7d995ca298]: The ladder has 10 rungs: Rent-a-Human at 8, the blimp moves to 9, The Singularity at 10
- unlock-modes [decision D, noted, owner worker-ce7d995ca298]: Rungs unlock with a real, pretend or configured key; preset keys make a rung one-click instead of unlocking it
- finder-two-kinds [decision D, noted, owner worker-ce7d995ca298]: The finder runs on levels 8 (humans) and 9 (aircraft) and shows businesses and platforms, never individual people
- de-escalate-scope [decision B, resolved, owner worker-ce7d995ca298]: De-escalate keeps the log, the ticket and verified recipients, and hangs up a live call
- ui-workshop-direction [decision B, resolved, owner worker-e1286323fd73]: Use a warm workshop interface with an illustrated HQ and a steady dark activity panel
- drizzle-release-candidate [decision C, resolved, owner worker-2e29cb5486e1]: The server pins Drizzle 1.0.0-rc.5 because only it ships the node:sqlite driver
- vault-credentials-for-send-guard [decision B, resolved, owner worker-51a874867fb4]: The send guard gets provider keys from the key vault through KeyVault.credentials(sessionId, provider)

## product-concept — design

Status: accepted
Specialist: product_design
Model: sota, xl effort
Thinking: deep

Settle what "much more ambition" means for this product (register unknown ambition-shape) so the rebuild is something the user can proudly show. Define the concept, the agent persona and how it plans and writes with an LLM, the final ladder (the old 8 rungs in order, plus any new rungs or features worth their cost), all the rung content and jokes, the neutral wording for real messages, and the disclaimers and SIMULATED labels. Stay inside register decision safety-boundary and the architecture in project knowledge architecture/index.md. If a feature needs a new server capability, list it plainly. Resolve ambition-shape with your answer and save the concept as a task document.

Result: ## Product concept: done The full concept is in `artifacts/product-concept/concept.md` in task 0002 (about 780 lines). It covers every rung's content, the real-message wording, the labels and disclaimers, the journeys, what the server needs and a parity rename table. There is also a short product page in project knowledge at `business/index.md`. **What "much more ambition" means.** The rebuild sh…

## parity-fixtures — implementation

Status: accepted
Specialist: test_engineer
Model: light_weight, s effort
Checks: self

Record the old app's behaviour before it is rewritten, as the parity plan (parity-plan.md in the task folder) describes. Export the old RUNGS data to tests/parity/fixtures/ladder.json. Record the outputs of isUnlocked, canAttemptUnlock, currentLevel and validateKey over every unlock subset and a set of key strings to rules.json. Take screenshots of the old app's states at 1280 px and 390 px into tests/parity/fixtures/screenshots/. Leave the old app unchanged.

Result: ## Parity fixtures: done and checked **Delivered on the job branch (commits 18904cb, 3917c66, 6727422):** - `tests/parity/export-fixtures.ts`: a Node script that records the old app's behaviour from `src/ladder.ts`. It writes both JSON files. Run it, then `pnpm format`. - `tests/parity/fixtures/ladder.json`: the 8 rungs, with titles, taglines, threat labels, key specs, action labels, scripts and…

## workspace-setup — implementation

Status: accepted
Specialist: infrastructure_engineer
Model: medium, m effort
Checks: delegate

Set up the pnpm workspace from register decision stack-and-layout: apps/web (React 19, Vite 8), apps/server (Hono 4 on Node 24), packages/shared. Add strict TypeScript, ESLint with typescript-eslint, react-hooks and jsx-a11y, Prettier, Vitest and Playwright. Root scripts: dev (web and server together, with a Vite proxy to /api), build, start (one Node process serving the API and the built app on 127.0.0.1), typecheck, lint, format:check, test and e2e. Add a config loader that Zod checks at startup and a .env.example. Each app gets a minimal hello page or route. Keep the old app at the root building and passing its checks until it is removed later.

Result: The pnpm workspace is built and checked. Nothing is committed in this checkout. **Delivered** - The pnpm workspace has apps/web (React 19, Vite 8), apps/server (Hono 4 on Node 24) and packages/shared (Zod schemas, consumed as TS source). - There is a strict `tsconfig.base.json`, and ESLint with typescript-eslint, react-hooks and jsx-a11y. Prettier, Vitest and Playwright are set up. - Root scripts…

## ui-design — design

Status: accepted
Depends on: product-concept
Specialist: ui_design
Model: sota, l effort
Thinking: standard

Design how the rebuilt app looks and behaves, following the product concept. Render desktop and mobile views of these screens: the disclaimer gate, the ladder with its escalating mood and theme, the key forms (empty, with errors, verifying), the live activity log, recipients and code verification, send preview and confirmation, the real versus simulated marking, the live call view with transcript, and the finder result cards. Make it funny and polished enough to demo. Save the renders and notes the UI engineers can follow.

Result: UI design is complete. The handoff is saved at artifacts/ui-design/handoff.md, with a short entry point at artifacts/ui-design/design.md. The full design pack is in project knowledge: /home/jp/projects/taiga/factory-vm/tmp/repositories/8f348892baf7737f2d07bfc4/material/knowledge/ui/index.md. It contains eleven desktop/mobile screen boards covering the disclaimer, ladder at levels 1/5/9/10, empty/…

## shared-ladder — implementation

Status: accepted
Depends on: parity-fixtures, workspace-setup, product-concept
Specialist: backend_engineer
Model: strong, m effort
Checks: self

Build packages/shared. It holds the ladder content from the product concept, with every action typed real-capable or simulation-only as register decisions channel-adapters and safety-boundary require. It also holds the next-rung-only unlock rules, the key specs and shape check, and the Zod schemas for every API request, response and run event in architecture/index.md. Add parity rows 1 to 3 from parity-plan.md: replay tests/parity/fixtures/ladder.json and rules.json against the new rules, with an explicit rename table for anything the concept changed.

Result: ## packages/shared is built (commit 47c05dd) **What it delivers** - **The ladder (`ladder.ts`).** All 10 rungs with the product concept's content: titles, taglines, staff and Sisu moods, scenes, keys with made-up values, reactions, and each action's thought, lines and after line. - Each action has a type: - `real-capable`: only `firm-email`, `polite-sms` and `ai-call`, each with the providers it…

## server-core — implementation

Status: accepted
Depends on: shared-ladder
Specialist: backend_engineer
Model: strong, l effort
Checks: self

Build the server core in apps/server, following architecture/index.md and register decisions runs-and-sse and session-and-hosting. It covers the session cookie with a same-origin check, the Drizzle schema and migrations over node:sqlite, GET /api/state, the unlock and reset endpoints, a run engine that picks a channel adapter (simulated adapters only for now, with a clear seam for real ones), and GET /api/events over SSE with Last-Event-ID replay. Reset cancels runs in flight so no late events appear, and a duplicate run of the same action is rejected. Add API tests for parity rows 2, 3, 5 and 7, plus a test that a climb with no keys makes zero provider calls.

Result: ## Server core: done and checked (commits f9c75b1 and 32e9094) The server core in apps/server is finished. A climb with no keys now works end to end: unlock rungs with made-up keys, run every action, stream the log live, replay it after a reconnect, and De-escalate in the middle of a run with no late lines. It also leaves seams for the real adapters, the Sisu writer and the key vault that the lat…

## key-vault-server — implementation

Status: accepted
Depends on: server-core
Specialist: backend_engineer
Model: strong, m effort
Checks: self

Build the key vault from register decision provider-keys. Keys are encrypted with AES-256-GCM under APP_SECRET and stored per session. Only masked hints go back to the browser. Keys preset in .env unlock the rungs they cover. Each real-capable key is checked live with a cheap call to its provider (Resend, Twilio, OpenAI) through small client modules that tests can fake. Simulation-only keys keep the shape check. Reset deletes the keys.

Result: ## Key vault: done and checked (commit 4dbbc2b) The server now has a real key vault, so typed provider keys work for real. On a rung with real actions, a typed key is checked live with its provider (Resend, Twilio or OpenAI). The key is stored encrypted for that session, and only a masked hint such as `re_…a1b2` goes back to the browser. Keys preset in `.env` make their rung one click to unlock,…

## send-guard-server — implementation

Status: accepted
Depends on: server-core
Specialist: backend_engineer
Model: strong, l effort
Checks: self

Build recipient verification and the send guard from register decision send-guard. Email codes are sent with Resend and stored hashed, with a 10-minute expiry and 5 attempts. Phone codes go through Twilio Verify. Send previews return a single-use confirmation token that lasts 5 minutes. Configurable per-channel and daily rate limits apply, every real send is recorded, and De-escalate cancels pending previews. Add the safety tests from parity-plan.md: the server refuses a real send with no or a reused token, to an unverified recipient, over the limit or after reset.

Result: ## Send guard and recipient verification: done and checked (commits 1c326d3 and 3a3253f) The server now refuses every real send unless the operator has verified the recipient, confirmed a preview, and has limit left. All the parity-plan safety tests pass. Two pieces from other jobs are still needed before anything is really sent: the key vault's `credentials()`, and the real adapters (see "Not do…

## web-foundation — implementation

Status: accepted
Depends on: server-core, ui-design
Specialist: ui_engineer
Model: strong, l effort
Checks: self

Build the React app's foundation in apps/web from the UI design. It covers the app shell and TanStack Router, a typed API client with TanStack Query, the SSE activity log, the disclaimer gate, the ladder with key forms, the mood meter and escalating theme, De-escalate and the browser speech preview. Keep the old app's behaviours listed in parity-plan.md and add Playwright tests for parity rows 4 to 12 at desktop and mobile sizes, with axe checks. Compare the result with the design renders in a browser.

Result: ## web-foundation: done and checked (commit b8f9c49) **What it delivers.** The server-status scaffold in `apps/web` is gone. In its place is the real React app: - a TanStack Router shell; - a typed API client using TanStack Query, which checks every reply with the shared Zod schemas; - the live activity log over SSE, newest first, as a polite live region with SIMULATED, REAL, INVENTED and AI-writ…

## email-sms-sending — implementation

Status: accepted
Depends on: key-vault-server, send-guard-server, sisu-writes-on-simulated-rungs
Specialist: backend_engineer
Model: medium, m effort
Checks: self

Add the real email and SMS adapters to the run engine. Email goes through Resend and SMS through Twilio Messaging, only to a verified recipient after a confirmed preview, as register decisions send-guard and safety-boundary require. OpenAI writes the neutral message text and is shown in the preview, with fixed neutral text when there is no OpenAI key. Run events carry the provider status and the REAL tag. Test with faked providers, following register decision sisu-writes-on-simulated-rungs. Even with all keys set, a simulation-only action must never call Resend or Twilio, and any such call fails the test. The only OpenAI call it may make is Sisu's writer, with no tools, and threat-sms and recon make no writer call.

Result: ## email-sms-sending: done and checked (committed) The server can now send real email through Resend and real SMS through Twilio Messaging. It sends only to a verified recipient, after a confirmed preview. OpenAI writes the neutral text. Without an OpenAI key, the preview shows fixed neutral text. It fulfills the email-sms-sending assignment. ### What it delivers - **Adapters** (`runs/message-ada…

## voice-call-server — implementation

Status: accepted
Depends on: key-vault-server, send-guard-server
Specialist: backend_engineer
Model: sota, l effort
Checks: self

Build the real AI robocall from register decision voice-call-approach. Twilio places an outbound call to the operator's verified phone after a confirmed preview. Its Media Stream WebSocket is bridged to the OpenAI Realtime API (gpt-realtime) with a neutral persona, and the server hangs up when the 90-second cap runs out. Call status and transcript lines become run events. PUBLIC_BASE_URL supplies the address for webhooks. Switch to OpenAI's native SIP connection only if a probe shows it is simpler and reliable, and record that in the register. Test the bridge with faked sockets.

Result: ## Real AI call: done and checked (commit 5d706ba) With keys and a tunnel set up, Place a live AI call now really rings the operator's verified phone. This follows register decision `voice-call-approach`. - Twilio places the call after a confirmed preview. - Its media stream is bridged to OpenAI gpt-realtime, where Sisu talks with the neutral persona from `CALL_INSTRUCTIONS`. - The server hangs u…

## finder-agent-server — implementation

Status: accepted
Depends on: key-vault-server
Specialist: backend_engineer
Model: strong, m effort
Checks: self

Build the finder agent from register decision finder-agent: POST /api/finder calls OpenAI Responses with web_search as its only tool. It finds real blimp or airship advertising, banner-plane and rent-a-human options (such as RentAHuman.ai) near Finland, and returns name, offer, price if stated and source URL, validated by Zod. It books nothing and contacts no one, and the server never fetches the sites it finds. Without a key, it returns canned example results labelled as examples. Add a test that the tool list holds only web search.

Result: ## The finder endpoint is built and checked (commit 706c5e3) `POST /api/finder` works as the assignment and register decisions `finder-agent` and `finder-two-kinds` describe. Nothing has been checked against a real OpenAI key, because there isn't one here. **What it does** - **With an OpenAI key:** the server makes one OpenAI Responses call, with `FINDER_TOOLS = [{ type: "web_search" }]` as its o…

## real-send-ui — implementation

Status: accepted
Depends on: web-foundation, send-guard-server
Specialist: ui_engineer
Model: strong, m effort
Checks: self

Build the real-send flow in the web app from the UI design. It covers adding recipients and verifying them by code, the send preview and its explicit confirmation, a clear REAL or SIMULATED mark on every rung, action and log line, the remaining rate limits, and the status of each key with its masked hint. Add Playwright journeys with faked providers.

Result: ## real-send-ui: done and checked (commit 363b123) **Delivered.** The web app now has the real-send flow from the UI design. - **Your stand-ins dialog:** you add your own inbox and phone and verify each with a 6-digit code. You can resend the code, change the address and remove a recipient. Errors appear next to the field. If a provider key is missing, it links to the rung that takes it. - **Send…

## call-and-finder-ui — implementation

Status: accepted
Depends on: web-foundation, voice-call-server, finder-agent-server
Specialist: ui_engineer
Model: strong, m effort
Checks: self

Build the live call view with its streaming transcript, the finder result cards (source links and a "Simulate booking" button that only plays a scripted run), and the remaining features from the product concept, all from the UI design. Add Playwright journeys at desktop and mobile sizes.

Result: ## call-and-finder-ui: done and checked (commits f37dedf, c12726d, 6c2a388) ### What it delivers - **Finder cards (levels 8 and 9).** "Find humans for hire" and "Find a real blimp" now call `POST /api/finder`. - The panel shows Searching…, then web results, examples, an empty result ("No suitable businesses found.") or a failure with Try again. It never falls back to examples silently. - Web card…

## end-to-end-safety-tests — implementation

Status: accepted
Depends on: real-send-ui, call-and-finder-ui, email-sms-sending, sisu-writes-on-simulated-rungs
Specialist: test_engineer
Model: medium, m effort
Checks: self

Add end-to-end tests of the whole app that run with fake providers. The full climb from level 1 to the top with no keys must simulate everything and make zero network calls. With all keys and a verified recipient, email, SMS and the call must go through preview and confirmation. Every simulation-only rung must follow register decision sisu-writes-on-simulated-rungs: no Resend or Twilio calls, only tool-less writer calls to OpenAI, and no writer call for threat-sms and recon. Cover desktop and mobile. Fix any test gaps against parity-plan.md and report app defects you find.

Result: **Delivered:** `e2e/safety.recording.spec.ts`, with two journeys on desktop and mobile. They run the production server (`src/index.ts`) with its real adapters and writers. A preload, `e2e/support/record-providers.mjs`, answers and logs every Resend, Twilio and OpenAI HTTP call. 1. **Climb with all keys:** the climb has an OpenAI key from the server env, real Resend and Twilio keys, and a verified…

## readme — implementation

Status: accepted
Depends on: real-send-ui, call-and-finder-ui, email-sms-sending
Specialist: documentation_writer
Model: medium, s effort
Checks: self

Rewrite the README for the new app. Explain what it is (a joke that really sends neutral messages to your own verified recipients only), the safety rules, setup with Node 24 and pnpm, each provider key and where to get it, PUBLIC_BASE_URL and a tunnel for calls, how to verify recipients, and the commands and checks. Keep .env.example in step with it.

Result: Delivered a rewritten README.md for the new app and a one-line header fix in .env.example. The README covers what the app is, the safety rules, Node 24 and pnpm setup, a provider key table, PUBLIC_BASE_URL with a tunnel, recipient verification, commands and checks, and the repo layout. The other env vars already matched apps/server/src/config.ts, so I left them alone. Checked: - Prettier passes o…

## remove-old-app — implementation

Status: returned
Specialist: refactoring_engineer
Model: medium, m effort
Checks: delegate

Delete the old browser-only app now that parity holds. Remove src/ (ladder.ts, main.ts, style.css, ladder.test.ts), the root index.html, vite.config.ts and tsconfig.json, and the untracked dist/. In the root package.json, drop the legacy:* scripts and their use in build, typecheck and test. Replace the stale description ("fully simulated… Nothing is ever sent") with one that matches the new app, and drop devDependencies only the old app used. First check that eslint, prettier, Playwright and the workspace configs don't rely on the deleted files. Keep tests/parity/fixtures and renames.ts. Change tests/parity/export-fixtures.ts so it still works without src/, for example by reading the old ladder from commit f5b9e78, or remove it and note in the README how the fixtures were made from f5b9e78. Mention f5b9e78 in the README as the old app's reference commit. Typecheck, lint, format, tests, build and e2e must still pass.

Result: ## What was delivered The old browser-only app is removed: - `src/` (ladder.ts, main.ts, style.css, ladder.test.ts), the root `index.html`, `vite.config.ts` and `tsconfig.json`, and the untracked `dist/` are deleted. - In the root `package.json`, the `legacy:*` scripts are gone and so is their use in `build`, `typecheck` and `test`. The description now matches the new app. The root `vite` and `vi…
