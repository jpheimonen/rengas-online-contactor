The factory ran 3 checks in parallel in 6m16s: 2 passed, 1 failed.

### build: passed in 13s

Command: `taiga runner build`
Full log: /tmp/gate-checks-r9otzonb/build.log

````text
Running `build` · output: /home/jp/.local/state/taiga/evidence/1-8f348892/runner/2026-10-29T22-32-59-205050-build-29a223f3119c42d4b5b0ed3ee81f9c68/output.log
`build` passed after 12 s. Output: /home/jp/.local/state/taiga/evidence/1-8f348892/runner/2026-10-29T22-32-59-205050-build-29a223f3119c42d4b5b0ed3ee81f9c68/output.log
````

### full_tests: passed in 6m16s

Command: `taiga runner e2e`
Full log: /tmp/gate-checks-r9otzonb/full_tests.log

````text
Waiting for project turn: allocation 3046aa36e72b45dc847fde0c6017996b (run d975e060-000c-4587-b54e-9e9cadb56400, checkout /home/jp/projects/taiga/factory-vm/rengas-online-contactor/1) running build. This is normal; keep this request running. It will start when its turn arrives.
Running `e2e` · output: /home/jp/.local/state/taiga/evidence/1-8f348892/runner/2026-10-29T22-33-10-889748-e2e-4aaedb0ee9694076b3a59880aa435831/output.log
`e2e` passed after 364 s. Output: /home/jp/.local/state/taiga/evidence/1-8f348892/runner/2026-10-29T22-33-10-889748-e2e-4aaedb0ee9694076b3a59880aa435831/output.log
````

### security: failed with exit status 1 after 32s

Command: `taiga static-checks`
Full log: /tmp/gate-checks-r9otzonb/security.log

````text
...

## Open findings

- ab8f98602730 · high · devskim DS126858 · apps/server/src/voice/twilio.test.ts:99: Weak/Broken Hash Algorithm
- 5848c89667c3 · high · devskim DS126858 · apps/server/src/voice/twilio.test.ts:100: Weak/Broken Hash Algorithm
- 9c9e37208f70 · high · devskim DS126858 · apps/server/src/voice/twilio.ts:123: Weak/Broken Hash Algorithm
- 2d6174f6ebd7 · medium · devskim DS137138 · apps/server/src/fake-provider-server.ts:115: Insecure URL
- bfed24d9e524 · medium · devskim DS137138 · apps/server/src/index.ts:81: Insecure URL
- ded89dd12029 · medium · gitleaks generic-api-key · apps/server/src/keys.test.ts:17: generic-api-key has detected secret for file /src/apps/server/src/keys.test.ts.
- 045259052159 · low · devskim DS162092 · apps/server/src/config.ts:12: Do not leave debug code in production
- 5892167f9295 · low · devskim DS162092 · apps/server/src/fake-providers-server.ts:164: Do not leave debug code in production
- cdc257ac4461 · low · devskim DS172411 · apps/server/src/routes/events.ts:48: Review setTimeout for untrusted data
- f2b5603a409e · low · devskim DS162092 · apps/server/src/test-client.ts:24: Do not leave debug code in production
- 252a74ca5b17 · low · devskim DS162092 · apps/web/vite.config.ts:7: Do not leave debug code in production
- 25bc361d13e7 · low · devskim DS162092 · apps/web/vite.config.ts:10: Do not leave debug code in production
- 4720e6d0556a · low · devskim DS172411 · e2e/call.fake.spec.ts:70: Review setTimeout for untrusted data
- 4720e6d0556a · low · devskim DS172411 · e2e/call.fake.spec.ts:134: Review setTimeout for untrusted data
- d8ff167b7683 · low · devskim DS172411 · e2e/case-closed.spec.ts:25: Review setTimeout for untrusted data
- d8ff167b7683 · low · devskim DS172411 · e2e/case-closed.spec.ts:47: Review setTimeout for untrusted data
- e53b455b917b · low · devskim DS172411 · e2e/climb.spec.ts:20: Review setTimeout for untrusted data
- d184fad2730e · low · devskim DS172411 · e2e/finder.fake.spec.ts:15: Review setTimeout for untrusted data
- dd303be7cc1d · low · devskim DS172411 · e2e/finder.spec.ts:47: Review setTimeout for untrusted data
- 8a6eab02e9ae · low · devskim DS172411 · e2e/real-send.spec.ts:210: Review setTimeout for untrusted data
- 8a6eab02e9ae · low · devskim DS172411 · e2e/real-send.spec.ts:237: Review setTimeout for untrusted data
- 7daeb79bb21b · low · devskim DS172411 · e2e/recon.spec.ts:16: Review setTimeout for untrusted data
- c5227153fe10 · low · devskim DS172411 · e2e/safety.recording.spec.ts:104: Review setTimeout for untrusted data
- 35877c53ac08 · low · devskim DS172411 · e2e/safety.recording.spec.ts:167: Review setTimeout for untrusted data
- 2875d6badd2f · low · devskim DS162092 · playwright.config.ts:25: Do not leave debug code in production
- 75e5ce8547f4 · low · devskim DS162092 · playwright.config.ts:49: Do not leave debug code in production
- 75e5ce8547f4 · low · devskim DS162092 · playwright.config.ts:58: Do not leave debug code in production
- a1b352863132 · low · devskim DS162092 · playwright.config.ts:68: Do not leave debug code in production
- a1b352863132 · low · devskim DS162092 · playwright.config.ts:79: Do not leave debug code in production
- 7ae99772ddcf · low · devskim DS162092 · playwright.config.ts:92: Do not leave debug code in production
- b0c2f6090b77 · low · devskim DS162092 · playwright.config.ts:108: Do not leave debug code in production

## Ignored findings

Count, rule, who ignored it and why:

- 2 · devskim DS162092 · built-in: Tests print and log on purpose.

## Scanner notes

- bandit: No applicable files in scope
- gosec: No applicable files in scope
- pmd: No applicable files in scope
- psalm: No applicable files in scope
- zizmor: No applicable files in scope

Omitted 7 deleted or non-regular paths; see results.json.

## Next step

Open findings: 31. Fix each one. When a finding is a false positive, mark it with the reason it is safe, and later scans skip it:

    taiga static-checks --ignore ID [--ignore ID ...] --reason "why it is safe"

Each ignore is kept in the repository settings, outside the repository. Then run the check again.

Results: /home/jp/.local/state/taiga/static-checks/cd9a02ee04f74ed1990e9577c530a8a0
````

### code_review: 104 findings

Strength 3 of 6, Standard. The whole review, with each reviewer's summary and the findings they dropped, is in /home/jp/projects/taiga/factory-vm/.factory-debug/factory-vm/reviews/6295ebb4-56b0-4033-8809-349bc22988d7/review.json.

No model read these files:
- .env.example: Sensitive path excluded from model analysis.
- index.html: Deleted.
- pnpm-lock.yaml: A generated file.
- src/ladder.test.ts: Deleted.
- src/ladder.ts: Deleted.
- src/main.ts: Deleted.
- src/style.css: Deleted.
- tests/parity/fixtures/screenshots/01-disclaimer-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/02-level-1-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/03-key-errors-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/04-verifying-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/05-level-2-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/06-level-3-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/07-level-4-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/08-level-5-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/09-level-6-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/10-level-7-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/11-level-8-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/12-run-streaming-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/13-after-de-escalate-desktop.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/14-level-1-mobile.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/15-after-de-escalate-mobile.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/16-disclaimer-mobile.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/17-level-1-mobile-full.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/18-key-errors-mobile.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/19-verifying-mobile.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/20-all-unlocked-mobile.png: Binary change; inspect it manually.
- tests/parity/fixtures/screenshots/21-run-streaming-mobile.png: Binary change; inspect it manually.
- vite.config.ts: Deleted.

1. Deleting a recipient cascades away its verification_codes rows, which resets the hourly cap on code sends (apps/server/src/db/schema.ts:205; criticality 60, confidence 95)

`verification_codes.recipientId` is declared `ON DELETE CASCADE` (schema.ts, `migration.sql` of `send_guard`, and its `snapshot.json`). The hourly cap in `recipients/recipients.ts` (around lines 127-139) counts `verification_codes` rows for the session with `sentAt` in the last hour. `DELETE /api/recipients/:id` (`Recipients.remove`) deletes the recipient and the cascade drops its code rows, so the count falls back to 0. A session can add an address, send 5 codes, delete it, add it again and repeat without limit. Each code goes out as a real email or SMS through the operator's Resend/Twilio account (`.env` preset keys are used by every session), to addresses nobody has verified. The schema comment ("`sentAt` stays after verification for the hourly cap") and the README ("At most 5 codes per hour per session") promise a limit this breaks. Reported four times (reviewers 5, 7, 13, 19).

Suggestion: Keep code history when a recipient is deleted: make `recipientId` nullable with `ON DELETE SET NULL`, or count sends from a separate log table that recipient deletes don't touch (or soft-delete recipients). Regenerate the migration and snapshot.

2. The tunnel the README tells you to open exposes the whole app and API, so strangers can use the operator's `.env` keys (README.md:59; criticality 60, confidence 72)

The README says to run `ngrok http 8787` (or `cloudflared`) for Twilio. `index.ts` serves `/api/*`, the web app and `/twilio/*` from one listener, so the tunnel publishes everything. A visitor gets a new session from `sessionMiddleware`, `sameOrigin` passes because their browser is on the tunnel origin, and `keyVault.credentials` falls back to the `.env` preset keys for every session. They can run `POST /api/finder` on the operator's OpenAI key (no rate limit), unlock rungs with the configured keys, verify their own inbox/phone and send real emails, texts and AI calls billed to the operator. Code limits (5/hour) are per session and a new cookie resets them, which makes phone-code requests through Twilio Verify an SMS-pumping path. This contradicts the README's "really sends, but only to you". Nobody ran it; it follows from reading the middleware, vault fallback and README (also reported at `apps/server/src/index.ts:657`).

Suggestion: Serve `/twilio/*` on its own listener, or refuse non-`/twilio` requests whose Host matches the `PUBLIC_BASE_URL` host, and say so in the README. At least warn that the tunnel URL gives full use of the configured keys.

3. Parallel adds all get past the hourly limit because the count happens before the awaited send (apps/server/src/recipients/recipients.ts:127; criticality 55, confidence 85)

`add` counts recent codes, then `await`s `sendEmailCode` / `startPhoneCode`, and only inserts the `verification_codes` row after that. N requests sent at the same time all read the same count (0..4), all pass, and all send a code before any row exists. The concurrent test in `recipients.test.ts` ("keeps one recipient when the same address is added twice at once") shows two sends going through at once. With different addresses there is no limit at all on a burst: one session can fire 100 POSTs and send 100 codes through the operator's Resend/Twilio account.

Suggestion: Reserve the slot before sending: insert the code row (or a pending marker) inside a transaction together with the count check, and remove or close it if the provider refuses.

4. On a first visit, `/api/state` and `/api/events` each create their own session, so the event stream can follow a different session than the cookie (apps/server/src/session.ts:59; criticality 55, confidence 65)

`sessionMiddleware` starts a new session for every `/api/*` request without a known cookie. On a first visit `AppShell`/`useAppState()` fetches `/api/state` while `ActivityProvider` opens `new EventSource("/api/events")` in the same commit, both without a cookie. Each gets its own session and `Set-Cookie`; the browser keeps the last one. If the state response's cookie wins, runs, unlocks and sends go to one session while the open stream shows another: no run lines, `done`/`failed` never arrive, buttons stay on "Running…", the live call view never opens. The stream only reconnects after an error. It usually works because the state response arrives first, which also hides it in e2e. Every first visit also leaves an orphan session row, and StrictMode in dev opens a second EventSource (a third session). Reviewers could not observe which response wins in a real browser.

Suggestion: Open the EventSource only after the first `/api/state` reply has set the cookie (gate the effect on loaded state), or establish the session in a single bootstrap request before the app mounts.

5. Anyone can start unlimited sessions, so the per-session send and code limits don't limit anything (apps/server/src/session.ts:46; criticality 50, confidence 60)

Every request without a known cookie creates a new session row. The only things standing in the way are `sameOrigin` checks, and a non-browser client passes them by sending `sec-fetch-site: same-origin` or a matching `Origin`. Send limits (`SendGuard`) and verification-code limits ("At most 5 codes per hour per session") are all counted per session. Keys set in `.env` (`presetKeys`) are shared by every session. The README tells users to expose the server through `ngrok http 8787` to get real calls. Anyone who finds the tunnel URL can drop the cookie, get a fresh session, and request 5 more verification emails or SMS to any address or number. That spends the operator's Resend/Twilio credit and can flood a victim with messages, with no global limit.

Suggestion: Add a limit across all sessions (per IP, or overall) for code sends and real sends that use preset keys, or rate-limit session creation.

6. A stored key that can't be decrypted (changed `APP_SECRET`) makes `credentials()` throw everywhere, including `GET /api/state` (apps/server/src/keys.ts:235; criticality 40, confidence 75)

`credentials()` calls `cipher.decrypt(...)`, which throws when the row was written under another `APP_SECRET` (rotation, mistyped secret, database restored next to a new `.env`). Nothing catches it. `state.ts` line 41 calls `keyVault.credentials(sessionId, "openai")` in every `buildState`, so every session with a stored key gets 500 from `/api/state`, and the writer, neutral writer, message adapters, voice calls, finder and recipient code sends fail too, until the user clicks De-escalate. `list()` meanwhile keeps reporting `source: "stored"`. When no row exists the function falls back to the preset key, so an unreadable row should be treated the same way. The README doesn't warn that changing `APP_SECRET` breaks stored keys.

Suggestion: In `credentials()` catch the decrypt failure, delete the row and return the preset or null, so the session falls back to simulated and the user re-enters the key. Optionally document it in the README.

7. Real-key unlock checks any key against Resend, Twilio or OpenAI with no limit, so the server works as a free key-testing service (apps/server/src/keys.ts:151; criticality 40, confidence 60)

`checkAndStore` sends whatever the client types to the provider's live check (`liveKeyCheckers`) and answers with a different message for a valid key (200, unlocked) than for a refused one (422, `keyRejected`). A refused key leaves the rung locked (`routes/rungs.ts` only blocks retries once the rung is unlocked). Nothing limits attempts: there is no rate limit on `POST /api/rungs/:id/unlock`, and a new session costs only a cookie. On a public deployment (the app is meant to be reachable for Twilio webhooks through `PUBLIC_BASE_URL`), anyone can check lists of leaked API keys through this server's IP. The send guard and the code checks have limits (`MAX_CODE_ATTEMPTS`, `SEND_LIMIT_*`), but key checks have none.

Suggestion: Limit live key checks per session and per IP, for example a few per hour, the same way the recipients code applies `rate-limited`.

8. The "no keys, no network calls" tests run against apps that don't wire any real provider, so they can't catch a network call (apps/server/src/no-keys-climb.test.ts:303; criticality 35, confidence 85)

`no-keys-climb.test.ts` stubs `fetch` and `net.Socket.prototype.connect`, but `testApp()` (`test-client.ts:79`) builds the app without `keyVault`, `realAdapters`, `writer`, `neutralWriter`, `finder` or `voice`; `expect(fetch).not.toHaveBeenCalled()` holds only because nothing in that app can call `fetch`. The e2e `climb.spec.ts` (parity row 12) has the same shape: it runs against `src/fake-provider-server.ts`, which swaps every provider for an in-memory stand-in, passes no `writer`/`neutralWriter`/`finder`/`voice`, and its loop skips the `finder` actions, the ones most likely to go online. Production `index.ts` wires `createOpenAiWriter`, `createNeutralWriter`, `createMessageAdapters`, `liveKeyCheckers()` and `liveFinder()`. A missing-key check regression in any of those, or the engine picking a real adapter for a pretend unlock, would pass both tests.

Suggestion: Build the app the way `index.ts` does (key vault with an empty preset, live writers, adapters and finder created after the stubs). For e2e, run the climb against `src/index.ts` with no provider keys and include the finder actions, or narrow the test titles to what they prove.

9. A failed background refetch of the state replaces the whole working page, including a live call view, with the error screen (apps/web/src/shell/LadderPage.tsx:25; criticality 35, confidence 80)

`LadderPage` checks `error` before `state`. React Query sets `error` whenever a refetch fails and keeps the old `data`. With the defaults in `main.tsx` (`retry: 1`, refetch on window focus and reconnect), and with the many `invalidateQueries({ queryKey: stateKey })` calls (unlock and de-escalate events, real runs, recipient changes), one failed background refetch is enough. That happens on a short server restart or a network blip. The ladder, an open `LiveCallView` during a real call, or an open `CaseClosed` report is then replaced by "Couldn’t reach the server". `Page` unmounts and loses its `viewing`/`opened`/`reportOpen` state, even though the cached state is still usable.

Suggestion: Show the full-page error only when there is no data (`if (!state) return error ? <Error/> : <Loading/>`). Show a refetch failure as a small notice above the page.

10. The SSE route unsubscribes twice, and a second unsubscribe can remove another connection's listeners (apps/server/src/routes/events.ts:58; criticality 35, confidence 30)

The route calls `unsubscribe()` in `stream.onAbort` (line 29) and again in `finally` (line 58). `EventLog.subscribe`'s unsubscribe closes over its own `listeners` set and runs `this.#listeners.delete(sessionId)` whenever that set is empty, even if the map entry is now a different set. Sequence: connection A is the session's only listener, the first call empties A's set and deletes the map entry, connection B (an EventSource reconnect or another tab) subscribes and gets a new set, then A's second call finds its old set empty and deletes B's entry. B stays open but stops getting live events until it reconnects. The window is short (the second call is waiting on a pending write or a wake), so this is rare, but the double call is what makes it possible.

Suggestion: Call `unsubscribe` once (in `finally` only, keeping `wake()` in `onAbort`), or make the unsubscribe in `EventLog` delete the map entry only when it still holds its own set.

11. Send preview calls OpenAI and Twilio before the guard checks the recipient and the limits (apps/server/src/routes/sends.ts:44; criticality 30, confidence 85)

The comment on line 44 says the guard refuses an unverified recipient or a used-up limit, but the code under it first calls `neutralWriter.write` (a paid OpenAI chat request when an OpenAI key is held, including the configured `.env` key) and, for `ai-call`, `voice.isTrial` (a Twilio API request). Only after both does `guard.preview` check that the recipient exists, belongs to the channel, is verified and that the hourly or daily limit has room. So a preview with a made-up `recipientId`, an unverified recipient or a used-up limit still spends an OpenAI request and a Twilio round trip before it gets a 404/409/429. Previews have no rate limit of their own, so repeating them keeps costing money and adds latency to every refusal. The comment also reads as if the guard runs at that point, which it doesn't.

Suggestion: Run the guard's recipient and limit checks (for example a `guard.check(sessionId, action, recipientId)` split out of `preview`) before writing the content, or move the comment to the `guard.preview` call.

12. "Send new code" disappears once the stand-ins dialog is closed and reopened (apps/web/src/sends/StandIns.tsx:82; criticality 30, confidence 85)

`sentTo` is local state in `RecipientSection`, and the button at line 246 only renders when `sentTo` is set. `Modal` renders `{open && children}`, so closing the dialog unmounts `RecipientSection` and `sentTo` goes back to `null`. A page reload does the same. The browser only gets the masked address (`pending.masked`), so the address can't be recovered. When the operator reopens the dialog with a pending recipient, the only actions left are Verify and "Change address/number". If the 10-minute code has expired, or De-escalate cancelled it (codes are cancelled but pending recipients stay), the server answers "That code has expired or was cancelled. Send a new one." The UI offers no way to do that. The operator has to remove the recipient and type the address again.

Suggestion: Let the server resend a code by recipient id (for example `POST /api/recipients/:id/code`), or keep the typed address above the modal, so "Send new code" works whenever a pending recipient exists.

13. Provider fetches parse the JSON body with no catch (and some have no timeout), so non-JSON or failed replies become a generic "stopped unexpectedly"/500 (apps/server/src/recipients/code-sender.ts:79; criticality 30, confidence 75)

Several provider calls have the same weakness. `runs/message-adapters.ts:147` runs `await response.json()` before checking `response.status !== 201`, so an empty or HTML 502/503 from Twilio throws a `SyntaxError` and the run says "This run stopped unexpectedly." `recipients/code-sender.ts` (`sendEmailCode`, the `twilio` helper) calls `fetch` with no timeout and `response.json()` with no `.catch`, so a DNS failure (`TypeError`), a hung request or a 5xx HTML page never becomes an `ApiProblem` and reaches `app.onError` as plain `Internal Server Error`. A hung request hangs recipient-add/verify with no limit. `voice/twilio.ts` `request` has the same uncaught `response.json()`. `resendRefused` (`.catch(() => ({}))`) and `askForJson` (15 s timeout) already do it right. `voice/twilio.ts` also copies the Twilio refusal mapping (`TRIAL_UNVERIFIED`, ternary at lines 75-80, fallback `status N`) that `code-sender.ts` already exports as `twilioRefused`, so the two will drift (SMS knows 21608 only, calls also 21219).

Suggestion: Parse with `.catch(() => ({}))` and then check the status; add `signal: AbortSignal.timeout(...)` to the fetches; map network and parse failures to `providerRefused(...)`. Reuse and extend `twilioRefused` in `voice/twilio.ts` instead of the inline copy.

14. `validateKey` accepts keys with surrounding spaces, but the raw value is what reaches the provider check (packages/shared/src/rules.ts:13; criticality 30, confidence 75)

`validateKey` trims before checking, so `" re_abcdefgh "` or a pasted key with a trailing space passes. Neither `KeyForm.submit` (it sends `values` as typed) nor `routes/rungs.ts` / `keyVault.checkAndStore` (it passes `keys[field]` unchanged to the checkers) trims the value. A real key pasted with a stray space therefore passes the shape check and then fails at Resend/Twilio/OpenAI with "key rejected", which points the user at the wrong cause. With real keys now in scope, this case is reachable.

Suggestion: Trim the values once at the boundary, either in the schema (`z.string().trim()` in `keyValuesSchema`) or before `validateKeys`, so the checked key and the stored key are the same.

15. Unlock and finder don't re-check the session after their awaits, so De-escalate can be undone or followed by late lines (apps/server/src/routes/rungs.ts:47; criticality 30, confidence 65)

`rungRoutes` checks `canAttemptUnlock` and then awaits `keyVault.checkAndStore` (a live provider check that can take up to 8 s). If `POST /api/reset` runs during that wait, it clears the unlocks and forgets the keys. When the check returns, `checkAndStore` stores the key again, `addUnlock` unlocks the rung again and the unlock lines are logged after "😇 De-escalated. All keys forgotten.". For level 2 (only keyless level 1 below it) the rung ends up fully unlocked with a stored real Resend key right after the user pressed De-escalate. Two concurrent unlocks of the same rung both pass the check, and both log the unlock and reaction lines (`addUnlock` ignores the conflict, the log doesn't). `routes/finder.ts` line 64 has the same shape: a web search in flight (up to 90 s) isn't cancelled by reset, so its "found N" line appears after the de-escalate lines and the results are returned for a rung that is locked again. `reset.ts` and `reset.test.ts` promise that no late lines appear after De-escalate, but only runs are covered.

Suggestion: After the await, check again that the rung can still be unlocked (or keep a per-session reset generation and drop the result if it changed), and give finder searches an abort signal that reset triggers.

16. The polite live region announces the whole replayed history on every page load (apps/web/src/activity/ActivityPanel.tsx:65; criticality 30, confidence 60)

The `<ol aria-live="polite" aria-relevant="additions">` is in the DOM from the first render with no items. `ActivityProvider` then fills it from the SSE replay, which is the session's whole log: the server keeps it across De-escalate and never trims it. On desktop the panel is visible, so a screen reader queues every past line (ready line, unlocks, set pieces, transcripts) as fresh additions each time the page loads or the stream reconnects without `Last-Event-ID`. Only lines that arrive live are meant to be announced.

Suggestion: Turn on `aria-live` only after the first replay has been applied (for example, once the state's `lastEventId` has been reached), or render the replayed history before the live region mounts.

17. The time-nearly-up nudge sends `response.create` even while Sisu is still answering, which the Realtime API refuses (apps/server/src/voice/bridge.ts:203; criticality 30, confidence 55)

`nudge()` runs at the 80 s mark with no regard to whether a response is in progress. At that point Sisu is often mid-sentence. The Realtime API answers a second `response.create` during an active response with an `error` event (`conversation_already_has_active_response`). `fromOpenAI` passes that to `openaiError`, so the operator's log shows a red line like `OpenAI · error: OpenAI: Conversation already has an active response`, and no new response starts. Sisu only says the closing line if a later turn picks up the system item, and the cap may hang up first. The bridge never tracks `response.created`/`response.done`, so it can't tell when a response is active. Confidence is moderate because it depends on timing within the call and on the API's documented behaviour, which I couldn't observe here.

Suggestion: Track whether a response is active (`response.created` → `response.done`). Add the system item at once, but send `response.create` only when no response is running; otherwise send it after the next `response.done`.

18. The running state comes from two unordered channels, so a late HTTP reply can mark a finished run as running again (apps/web/src/activity/ActivityProvider.tsx:53; criticality 30, confidence 25)

`runningActionIds` in the query cache is written by SSE (`setRunning(false)` on `done`/`failed`/`cancelled`) and also by HTTP replies: `useStartRun` calls `setRunning(true)` in `onSuccess`, and every state mutation calls `setQueryData(state)`. Nothing orders the two. Two cases: a run fails or is cancelled before the `POST /api/runs` reply is handled, or a `PUT /api/ticket` reply built while the run was active arrives after the run's `done` event. In both, the stale value lands last and the action stays on `Running…` until something else refetches the state. With 550 ms steps this is rare, but a run that fails on its first step, or the fake servers' 50 ms steps, make it easier to hit.

Suggestion: Ignore running flags older than the last finished event seen. For example, keep finished run ids in the provider and have `setRunning(true)` skip them, or compare the reply's `lastEventId` with the event's id.

19. The scripted-lines notice and `writerEnabled` depend on whether a writer object exists, and production always passes one (apps/server/src/runs/engine.ts:186; criticality 25, confidence 90)

`start` logs `SYSTEM_LINES.scriptedMode` only when `!this.#writer`, and `writerEnabled` (line 87, sent in `GET /api/state` from `state.ts:44`) returns `this.#writer !== undefined`. `index.ts:59` always passes `writer: createOpenAiWriter({ credentials: openAiKey })`, whether or not any OpenAI key exists. The writer only gets an OpenAI key per session when `write` runs, and returns null when there is none. So in the real server, a session with no OpenAI key never sees "Sisu is running on scripted lines. Give it an OpenAI key at level 5…", and the state reports `writerEnabled: true` while every line is scripted. The test in `runs.test.ts` ("logs once, on the first run…") only passes because `testApp()` builds the app without a writer, so it doesn't match how the server is actually wired.

Suggestion: Decide per session: e.g. give `Writer` an `enabled(sessionId)` method (it has an OpenAI key) and use it for both the notice and `writerEnabled`.

20. After the rename, no tsconfig covers `e2e/`, `playwright.config.ts` or `tests/parity`, so `pnpm typecheck` never checks them (tsconfig.base.json:1; criticality 25, confidence 90)

The root `tsconfig.json` (which included `src` and `vite.config.ts`) became `tsconfig.base.json`, which has no `include`. Only `apps/server`, `apps/web` and `packages/shared` extend it, and each includes only its own `src` (plus its own config file). Root `typecheck` runs `pnpm -r ... run typecheck` over those packages only.

That leaves about 1,000 lines of TypeScript unchecked: `e2e/*.spec.ts`, `e2e/support/*.ts`, `playwright.config.ts` and `tests/parity/export-fixtures.ts`. Playwright strips types without checking them. Editors also fall back to default compiler options for these files, so their `.ts`-extension imports get flagged. Yet the README says `pnpm typecheck` covers "TypeScript in every package".

Suggestion: Add a root `tsconfig.json` that extends the base and includes `e2e`, `playwright.config.ts` and `tests`, with `types: ["node"]`. Run it from the root `typecheck` script.

21. An unknown start error is shown under the heading "Not sent." (apps/web/src/sends/SendPreview.tsx:114; criticality 25, confidence 85)

When `start.mutate` fails with something other than an `ApiProblem` (network drop, timeout, a response that doesn't parse), the body correctly says `SEND_COPY.unknown`: "We couldn't confirm what happened. Check Activity before trying again." The heading above it is still `REAL · FAILED` / `SEND_COPY.failed` ("Not sent."). The request may have reached the server and started a real run that sent the email or text, so the heading states something the app doesn't know and contradicts the text below it.

Suggestion: Use a neutral heading for the unknown case (for example "REAL · UNKNOWN"), and keep "Not sent." for `ApiProblem` refusals.

22. Focus is lost when the focused control disappears: ticket Edit, Save and Cancel, and the log's Jump to latest button (apps/web/src/stage/TicketCard.tsx:25; criticality 25, confidence 85)

`TicketCard`: clicking `Edit` calls `setDraft(ticket)`, which unmounts the focused button and mounts the form, and nothing moves focus into the form. Save (`onSuccess: () => setDraft(null)`) and Cancel (`onClick={() => setDraft(null)}`) unmount the form the same way, and nothing moves focus back to `Edit`. In each case keyboard and screen-reader focus drops to `<body>`. `ActivityPanel.tsx` line 49 has the same problem: `Jump to latest` scrolls to the top, `onScroll` sets `leftTopAt` to null, `unseen` becomes 0, and the focused button unmounts. The rest of the app manages focus on purpose (the gate focuses `stage-title`, and the live call's Back button refocuses it), so these places stand out.

Suggestion: Focus the first field when the form opens and return focus to `Edit` when it closes. After jumping, move focus to the log scroller (it already has `tabIndex={0}`).

23. Two adds of the same address at once send two codes, and only the last one saved works (apps/server/src/recipients/recipients.ts:161; criticality 25, confidence 75)

In the concurrent case both requests generate and email different codes. Then the transactions run one after the other: the second one closes the first code and inserts its own. The user gets two emails, and the code from one of them (which may be the one that arrived first) is answered with `code-invalid`. The test for this case only checks that one recipient row is left. It does not check which code still verifies, so it misses this. A double-click on "Send code" is enough to trigger it.

Suggestion: Before sending, check for a fresh open code for the same recipient and reuse or skip it, or claim the row before the send so the second request does not send.

24. A failed Twilio trial-account lookup fails the whole call preview with a bare 500, though it only toggles a notice (apps/server/src/voice/calls.ts:84; criticality 25, confidence 70)

`routes/sends.ts` (line 52) awaits `voice!.isTrial(sessionId)` with no catch while building the preview, and `isTrial` in `voice/calls.ts` returns `twilio.isTrial(...)` directly. It does a live `GET /Accounts/{sid}.json` through `request` in `voice/twilio.ts` with a 10 s timeout and throws on a timeout, network error or non-JSON body. These errors are not `ApiProblem`s, so `app.onError` answers a plain-text `500 Internal Server Error` that the web client can't parse as an API error. The result only decides whether a trial notice is shown, yet the operator can't preview or confirm the call when Twilio is slow or unreachable.

Suggestion: Treat a failed lookup as unknown: catch it in `isTrial`, log it and return `false` (or show the notice), or turn it into a `provider-refused`/`not-configured` problem. Don't fail the preview.

25. A busy, unanswered or cancelled call ends the run as a success: "Sent for real" and "Sisu enjoyed that call" (apps/server/src/voice/calls.ts:274; criticality 25, confidence 70)

For `busy`, `no-answer` and `canceled`, `status()` resolves `ended` with `answered: false`. `run()` then returns normally, so the engine emits `done` with `SYSTEM_LINES.realDone` ("✔ Done. Sent for real, to you only.") and the action's `after` line ("Sisu enjoyed that call. Sisu would like to make more calls."). `voice-call.test.ts` ("ends without a duration line when nobody answers") locks this in by expecting the last event to be `after`. Nobody picked up, yet the activity log says the call happened and went well. The web call view (`call.ts`) marks the same call as `failed`, so the two views disagree.

Suggestion: Treat an unanswered end as a failed or cancelled run with its own line, for example by rejecting with an `ApiProblem` that carries the Twilio status text. Or have the engine skip `realDone`/`after` when nothing was answered.

26. The "Add a real Resend key at level 2" link often doesn't reach the rung (apps/web/src/sends/StandIns.tsx:157; criticality 25, confidence 70)

`onClose()` and `scrollIntoView` run in the same click. React then commits the close, and `Modal`'s effect calls `opener.current?.focus()` without `preventScroll`. When the dialog was opened from the header's "Your stand-ins" button, that button is in `header.top`, which is not sticky (only `.warning` and `.activity` are). Focusing it scrolls the page back to the top, undoing the jump to `rung-email`/`rung-sms`. There are also cases where `getElementById` finds nothing and the click only closes the dialog: on mobile, rungs above the next one sit behind the "higher rungs" disclosure (`grouped` in `Ladder.tsx`, rendered only when `showHigher`), and when the Activity tab is selected the ladder panel is `hidden`.

Suggestion: Focus the opener with `{ preventScroll: true }`, or scroll after the dialog has closed. Make sure the target rung is rendered and expanded before scrolling to it.

27. The call view's heading almost never gets focus on a real call, so keyboard and screen reader focus is left on the page body (apps/web/src/call/LiveCallView.tsx:67; criticality 25, confidence 65)

A real call can only start from the send preview, and `SendsProvider` renders that preview at app level, so it stays open over the page. The server emits the `started` event before it answers `POST` (`engine.ts` calls `#execute`, which runs `emit({ type: "started" })` synchronously, before `start()` returns). So the SSE event usually reaches the page first, `LadderPage` swaps the ladder for `LiveCallView`, and `heading.current?.focus()` runs while the modal `<dialog>` makes everything outside it inert, so nothing happens. Then `start.isSuccess` closes the preview, and `Modal` calls `opener.current?.focus()` on the rung button that opened it. That button was in the ladder, which is now unmounted, so focus falls to `<body>`. The comment on lines 65–66 describes this as intended ("Focus is skipped while the send preview is still open"), but on the main path the result is that the view never announces itself and keyboard users start from the top of the document. Before #469bfb7 the dialog stayed open, so the problem was less visible.

Suggestion: Move focus to the heading after the preview closes. For example, focus it when the view mounts and again when no modal dialog is open, or have `Modal` skip refocusing an opener that is no longer connected (`opener.current?.isConnected`) and let the call view take focus.

28. An empty SEND_LIMIT_* value means a limit of 0 instead of the default (apps/server/src/config.ts:8; criticality 25, confidence 60)

`limit` is `z.coerce.number().int().min(0).default(fallback)`. `.default` applies only to `undefined`, and `Number("")` is 0, so a line like `SEND_LIMIT_EMAIL_PER_HOUR=` in `.env` (loaded with `--env-file-if-exists`, which gives an empty string) quietly sets the limit to 0 and every real email simulates with "this hour's limit is used up". The same file treats empty keys as missing (`optionalSecret`), so the two kinds of setting behave differently, and `config.test.ts` checks the empty case only for keys.

Suggestion: Map "" to `undefined` before coercing, as `optionalSecret` does, and add the empty case to `config.test.ts`.

29. Under StrictMode in dev, the Case closed report closes itself right after it opens (apps/web/src/report/CaseClosed.tsx:185; criticality 25, confidence 50)

`main.tsx` wraps the app in `<StrictMode>`, so React mounts, cleans up and re-runs this effect in development. The first run calls `showModal()`. The cleanup removes the `close` listener and calls `element.close()`, which queues a `close` event as a separate task. The second run calls `showModal()` again and re-adds `onClose`. The queued `close` event then fires on the reopened dialog and calls `onClose` → `setReportOpen(false)`, so the report disappears under `pnpm dev`. The e2e suite runs `pnpm build` output, where effects run once, so it does not catch this. `DisclaimerGate` follows the same pattern, but its handler only calls `showModal()` again, which does nothing on an already-open modal.

Suggestion: Ignore stale close events, for example by checking `element.open` in the handler before calling `onClose`. Or close the dialog through state instead of reacting to the native `close` event fired by the cleanup.

30. Web counts a call as answered only on Twilio's `in-progress` callback; the server's cap starts at that callback or the media stream (apps/web/src/call/call.ts:70; criticality 25, confidence 50)

`latestCall` sets `answeredAt` only from a Twilio `provider-status` event whose status is `in-progress` (line 70). It returns `ringing` whenever that is missing (line 87), even if transcript lines have arrived. On the server, `LiveCall.#answered()` in `apps/server/src/voice/calls.ts` runs from both `status("in-progress")` and `attach()`, and starts the cap timer on whichever comes first. Twilio's status callback is a separate HTTP POST from the media WebSocket, so the media stream can attach and Sisu can start talking before the `answered` callback lands. If the callback is slow or lost, the live view shows "Calling your phone…" with no countdown while transcript lines stream in. `LiveCallStrip` shows "Ringing…". When the callback does arrive, the countdown starts from a later `at` than the server's cap, so it shows more time left than the call really has. The doc comment on line 15 ("the 90-second cap counts from here") repeats the same wrong assumption.

Suggestion: Treat the first transcript line, or a server event for the media attach, as answered when no `in-progress` status has been seen. Better still, have the server emit one explicit "answered" event at the moment it starts the cap.

31. The dialog ignores the run mode from `POST /api/runs` and labels any started run REAL (apps/web/src/sends/SendPreview.tsx:81; criticality 25, confidence 40)

`useStartRun` returns `{ runId, mode }`, but `PreviewFlow` only reads `runId`. On the server, `chooseMode` runs before the token is checked. If the action has switched to simulated by the time Send for real is pressed (for example the rung was re-unlocked with a pretend key in another tab), `start` returns `mode: "simulated"` without using the token. The dialog would still show `REAL · SENDING`, then `REAL · ACCEPTED` / "Provider accepted · REAL" for a simulated run. That is the REAL/SIMULATED mark the feature exists to get right.

Suggestion: If `start.data.mode !== "real"`, show that the send simulated instead of the REAL states.

32. On phones, the stand-ins header button can't wrap its label and may spill over the De-escalate button (apps/web/src/styles.css:1626; criticality 25, confidence 40)

Under 1024px, `.top-actions` becomes a `minmax(0, 1fr) auto` grid, and `.top-actions .button` gets `width: 100%` and `white-space: nowrap`. The first button's label is "🪪 Your stand-ins · none yet" (the icon is hidden on mobile). That is about 200px of 15px semibold text plus 24px of padding. At the 390px viewport the Playwright config uses, the row is about 346px wide. After the De-escalate button ("😇 De-escalate", about 150–160px, `auto` column) and the 12px gap, the first column has about 185px. A `minmax(0, …)` track lets the button shrink below its content, and nowrap stops the label wrapping, so the text overflows the button and runs under or over De-escalate. The e2e overflow checks only compare `documentElement.scrollWidth` to the viewport, so they would not catch overflow inside the row. These widths are estimates; I could not render the page.

Suggestion: Allow the label to wrap, or let the first column size to its content (for example `auto auto` or stacked buttons) instead of forcing `nowrap` inside a `minmax(0, 1fr)` track.

33. No test checks that Sisu's written lines actually replace the scripted ones (apps/server/src/message-sending.test.ts:339; criticality 20, confidence 90)

The only tests that hit `createOpenAiWriter` count OpenAI calls (line 368) or check that no OpenAI call happens (line 174). No test checks that the `thought`, `after` and `setPiece` from the model show up in the log with `aiWritten: true`. No test checks that an invalid answer (an overlong line, too many set-piece lines, a missing `after`) falls back to the scripted lines with `aiWritten: false`. The run-text validation in `openai-writer.ts` (lines 372-391) and the engine's use of `written` (`engine.ts` 304-334, the `set-piece` slot in `adapters.ts` 306-311) are never tested. The file's header says it covers "the OpenAI writers", but only the neutral writer gets tested on its output.

Suggestion: Add a test that runs `email-storm` with a valid writer answer and checks the thought, set piece and after lines and their `aiWritten` flags, and one with an invalid answer that checks the scripted fallback.

34. Comment says `SYSTEM_LINES` are filled with `fillTemplate`, but its type can't take their placeholders, so callers wrote four other fillers (packages/shared/src/copy.ts:86; criticality 20, confidence 90)

The doc comment on `SYSTEM_LINES` says "Placeholders are filled with `fillTemplate`". But `fillTemplate` takes `TemplateValues = Partial<Record<Placeholder, string>>`, and `PLACEHOLDERS` in `template.ts` lists only the script placeholders (`ticket`, `complaint`, `n`, …). The copy in this file uses `{label}`, `{reason}`, `{provider}`, `{sends}`, `{time}`, `{level}`, `{title}`, `{hint}`, `{key}`, `{keys}`, `{seconds}`, `{hourLeft}`, `{code}` and more, none of which `fillTemplate` accepts. In practice only `SYSTEM_LINES.ready` goes through `fillTemplate`. The rest are filled by a `line()` helper in `apps/server/src/routes/rungs.ts`, a `format()` helper in `apps/web/src/format.ts`, and raw `String.replace` calls in `recipients/code-sender.ts` and `sends/guard.ts`. Those fillers behave differently: `format` uses `name in values`, so it reads inherited properties, which `template.test.ts` guards against for `fillTemplate`. Raw `.replace` with a string replacement treats `$&`/`$'` in a provider's error text as patterns, and it only replaces the first match. Nothing checks that copy placeholders match the values passed, the way `ladder.test.ts` does for script lines.

Suggestion: Either make `fillTemplate` accept any `Record<string, string | number>` (keeping `Object.hasOwn`) and use it everywhere, or fix the comment. Then drop the ad-hoc fillers.

35. Test "only streams the session's own events" checks only the replay, not the live stream (apps/server/src/events.test.ts:259; criticality 20, confidence 85)

`mine.makeUpKeys("email")` finishes before `theirs` connects, so `theirs.log()` reads only the replay from the database (`events.after`, filtered by `sessionId`). The live path, `EventLog.subscribe` with its per-session listener map, which is what "streams" refers to, is never exercised across sessions: no event is appended for `mine` while `theirs` is connected. A bug that sent live events to every listener would pass this test.

Suggestion: Open `theirs`'s event stream first, then trigger events for `mine`, then check that `theirs` received only its own events.

36. `lastSeenAt` is written on every API request but nothing reads it, and old sessions are never removed (apps/server/src/session.ts:54; criticality 20, confidence 85)

The middleware runs an `UPDATE sessions SET lastSeenAt` on every `/api/*` request, including each SSE reconnect. Nothing reads `lastSeenAt`. A search finds it only in the schema, the migrations and this file. Sessions are never deleted, so every session ever created stays in SQLite forever, along with its rows that cascade from it: encrypted provider keys, recipients, events. That includes the orphan sessions from first visits and cookie-less clients.

Suggestion: Either remove the write, or use it in a cleanup that deletes sessions idle longer than `SESSION_DAYS`.

37. Call failure messages are written for the operator, but only reach the server console (apps/server/src/voice/calls.ts:242; criticality 20, confidence 85)

`LiveCall` fails the run with plain `Error`s: "Twilio never reported the end of the call. Check that PUBLIC_BASE_URL reaches this server." (line 242), "Twilio could not place the call." (line 276) and "The OpenAI Realtime socket closed mid-call." (line 317). The engine's catch shows only `ApiProblem` messages and turns every other error into "✖ This run stopped unexpectedly." The setup hint about `PUBLIC_BASE_URL`, the most likely fix when calls hang, never reaches the person using the app. It is only printed by `console.error`.

Suggestion: Throw these as `ApiProblem`s (like `providerRefused`) so the run's `failed` line carries the reason. The giveup case most of all.

38. No test covers the give-up timer or Twilio's `failed` status, which are the safety net when callbacks never arrive (apps/server/src/voice-call.test.ts:344; criticality 20, confidence 85)

`LiveCall` hangs up and fails the run after `giveUpMs` when Twilio never reports the call's end, for example when `PUBLIC_BASE_URL` is wrong. It also fails the run on a Twilio `failed` status. `CallTiming.giveUpMs` can be overridden in this file's `setup`, yet neither path is tested. A regression here would leave a real call's run hanging, with the action marked as running.

Suggestion: Add a test with a small `giveUpMs` and no status callback that expects a hang-up and a `failed` run, plus one for `CallStatus: failed`.

39. The "goes back to level 1" test never checks level 1 (e2e/case-closed.spec.ts:56; criticality 20, confidence 80)

After "De-escalate and start over", the test only checks that the singularity row has no `Current` button (`toHaveCount(0)`) and that the ticket text is visible. On the mobile project the higher rungs are folded behind the "N higher rungs · Show" disclosure (see `e2e/de-escalate.spec.ts`), so that count is 0 whatever the level is. On desktop it would also pass if the reset stopped at any level other than 10. The ticket line `#48213 · Where are my winter tyres?` is shown all the time, so it proves little about "keeps the ticket".

Suggestion: Assert the meter (`getByRole("meter", { name: /Level 01 \/ 10/ })`) and that `rungRow(page, "polite")` is current.

40. The session cookie isn't renewed, so active users lose their session 30 days after their first visit (apps/server/src/session.ts:60; criticality 20, confidence 70)

`setCookie` runs only when a new session starts. For a known session the middleware updates `lastSeenAt` but sends no new cookie, so `maxAge` counts from the first visit. A user who comes back every day still loses the cookie on day 30, and with it their stored keys, verified recipients and climb progress. Updating `lastSeenAt` on each request suggests the session was meant to slide.

Suggestion: Send the cookie again with a fresh `maxAge` for known sessions, at most once a day for example.

41. The check that skips replayed history doesn't work while the state is still loading, so replays trigger repeated refetches (apps/web/src/activity/ActivityProvider.tsx:49; criticality 20, confidence 70)

The comment says replayed history is already in the loaded state, and `known` comes from `client.getQueryData(stateKey)?.lastEventId ?? 0`. The EventSource opens at the same time as the first `/api/state` fetch, though, so the replay usually arrives before the state is cached. Then `known` is 0 and every replayed event counts as new. Each replayed `unlock`, `de-escalate` or real `done`/`failed`/`cancelled` calls `invalidateQueries(stateKey)`, which cancels and restarts the in-flight state fetch. A returning user whose log holds many unlocks and De-escalates (the log is never cleared) makes one refetch per such line on every page load. Replayed finished events also call `setRunning(false)` against an empty cache. The result is correct in the end, but the comment states something the code doesn't guarantee.

Suggestion: Wait for the state to load before opening the stream (see the session finding), or record the state's `lastEventId` once it arrives and compare against that.

42. Every Resend 403 is reported as the sandbox/unverified-domain case, including an invalid or revoked API key (apps/server/src/recipients/code-sender.ts:66; criticality 20, confidence 60)

`resendRefused` maps any `403` to `SYSTEM_LINES.resendNoDomain` ("Resend only sends to your own Resend account address until you verify a domain…"). Resend also answers 403 for `invalid_api_key` ("API key is invalid"). If a stored key is revoked later, both verification emails and real sends (`runs/message-adapters.ts:118` uses this function too) tell the operator to verify a domain or change the stand-in inbox, and the real cause is thrown away.

Suggestion: Choose the sandbox wording only when Resend's message or `name` shows the testing/domain restriction. Otherwise fall back to the provider's message.

43. A run cancelled after the provider accepted the message is shown as "Not sent." (apps/web/src/sends/SendPreview.tsx:379; criticality 20, confidence 55)

`outcomeOf` lets the latest event win. A `cancelled` (or `failed`) event that comes after a `provider-status` event turns the outcome into `failed`, and the dialog shows `REAL · FAILED` / "Not sent." `playReal` keeps emitting steps with `pause()` after the provider call, and the engine's own comment says "The provider may have accepted a cancelled send, so it keeps counting." So a De-escalate from another tab, or any later error, after Resend/Twilio accepted the message tells the operator nothing was sent, even though it went out.

Suggestion: Once a `provider-status` event has been seen, show a later cancel or failure as "accepted, then stopped" instead of "Not sent."

44. Two test servers, `fake-provider-server.ts` and `fake-providers-server.ts`, differ by one letter and share a copy of the phone code (apps/server/src/fake-provider-server.ts:1; criticality 18, confidence 90)

`playwright.config.ts` starts `src/fake-provider-server.ts` (fake key checks, email codes, `/__fake/*`, fake send adapters; port 8797) and `src/fake-providers-server.ts` (fake Twilio call bridge, finder, vault; port 8798). Both describe themselves as the app with fake providers. Specs refer to "the fake-provider server" without saying which (`e2e/finder.fake.spec.ts:11`, `e2e/call.fake.spec.ts:10`, `e2e/support/paths.ts:7`). The phone code `246810` is written in four places (both servers, `e2e/support/app.ts` `PHONE_CODE`, `e2e/support/record-providers.mjs`, also `test-client.ts`). It is easy to edit the wrong server or change the code in one place only. The second server also depends on the first one's `pnpm build` output.

Suggestion: Merge them into one fake server, or name them by what they fake (e.g. `fake-sends-server.ts`, `fake-calls-server.ts`), and share the phone code constant from one module.

45. The test 'stores nothing for a missing key' never checks that nothing was stored (apps/server/src/parity-unlock.test.ts:120; criticality 15, confidence 95)

The test named "checks shape before anything else, and stores nothing for a missing key" only compares `fieldErrors` to `{ resend: "Enter a key." }`. It never checks the response status, and it never checks state afterwards, for example that `currentLevel` is still 0 and `unlocks` is empty. So the "stores nothing" part of the title isn't tested.

Suggestion: Check `response.status` (422), then check `(await client.state()).unlocks` is empty and `currentLevel` is 0.

46. The day-limit refusal says "for today … until tomorrow" and is ungrammatical for a limit of 1, but the limit is a rolling 24-hour window (apps/server/src/sends/guard.ts:284; criticality 15, confidence 92)

`#used(sessionId, DAY_MS)` counts sends from the last 24 hours (line 302), so sends free up 24 hours after each one, not at midnight. The message `That's all N real sends for today. Everything simulates until tomorrow.` is therefore wrong, and the shared reason `"day-limit": "today's limit is used up"` has the same calendar-day wording. Someone who used the limit at 10:00 is still refused after midnight. The message also gives no time, unlike the hourly one. The text puts `this.#limits.day` into a fixed plural, so with `SEND_LIMIT_PER_DAY=1` it reads "That's all 1 real sends" (`send-guard.test.ts:355` asserts this wording). The text is hard-coded here while the hourly text comes from `SYSTEM_LINES`.

Suggestion: Reword it around the last 24 hours (or say when the oldest send stops counting, as `#freesUpAt` does), avoid the count or handle the singular, and move the text into the shared copy next to `limitReached`.

47. When both limits are used up, the hourly message gives a free-up time that is wrong (apps/server/src/sends/guard.ts:271; criticality 15, confidence 90)

`#overLimit` returns `hour-limit` before it checks the day (lines 293-296). If both the channel's hourly limit and the daily limit are used up, the operator gets `This action simulates until 14:05.` At 14:05 the daily limit still blocks the action, so the promised time is wrong.

Suggestion: Check the daily limit first, or give the later of the two free-up times.

48. Phone masking assumes a 3-digit country code and 2-digit area code (apps/server/src/recipients/recipients.ts:30; criticality 15, confidence 90)

`maskAddress` always returns `slice(0,4) slice(4,6) ••• slice(-2)`. That is right for `+358 40…`, but a US number `+12025550123` shows as `+120 25 ••• 23`, which splits the number in the wrong places. A 7-digit number the schema accepts (`+1234567`) shows as `+123 45 ••• 67`, which reveals 6 of 7 digits. The docstring describes the format as general.

Suggestion: Show only the last 2–4 digits (e.g. `+•••••••12`), or format with a phone library.

49. The SPA fallback returns `index.html` with 200 for unknown `GET /api/*` and `/twilio/*` paths (apps/server/src/index.ts:654; criticality 15, confidence 90)

`app.get("*", serveStatic({ root, path: "index.html" }))` matches every GET that no route answered. A typo'd or removed API path such as `GET /api/stat` returns 200 with the HTML page instead of a JSON 404. Clients that parse JSON then fail with a confusing parse error, and the same happens for `/twilio/*` when voice is off.

Suggestion: Limit the fallback to paths outside `/api` and `/twilio`, or put `app.all("/api/*", c => c.json(..., 404))` before it.

50. `simulateReason` is typed as any string though it must be a `SIMULATE_REASONS` key (packages/shared/src/events.ts:32; criticality 15, confidence 90)

The comment says `simulateReason` is "the SIMULATE_REASONS key", but the schema is `z.string().optional()`. `api.ts` already defines `simulateReasonSchema` as an enum of those keys (and uses it for `actionModes[].reason`), but the event schema doesn't. As a result `RunEvent['simulateReason']` is `string`, and the consumer has to check at runtime and cast: `apps/web/src/activity/ActivityPanel.tsx` does `event.simulateReason in SIMULATE_REASONS && SIMULATE_REASONS[event.simulateReason as keyof typeof SIMULATE_REASONS]`. If the server emits a typo'd reason, the web app silently drops the "Simulating: …" note instead of failing validation. `provider` on `provider-status` similarly repeats the provider enum inline instead of sharing it.

Suggestion: Build the enum from `Object.keys(SIMULATE_REASONS)` here (or move `simulateReasonSchema` to a module both can import) and use it for `simulateReason`.

51. `.button.outline` and `.button.hang-up` override the `.button:disabled` look, so these buttons still look clickable when disabled (apps/web/src/styles.css:258; criticality 15, confidence 90)

`.button:disabled` (line 241) has specificity 0,2,0. `.button.outline` (line 258) and `.button.hang-up` (line 1294) have the same specificity and come later, so they win. A disabled outline button keeps its transparent background and dark ink border; only the text turns grey. A disabled hang-up button stays bright red with white text. This shows up in several places:
- `FinderCard`: while a booking simulation runs, every other card's "Simulate booking" button is disabled (`buttonDisabled={busy}`) but keeps its normal label, so a greyed label is the only sign it can't be clicked.
- `DeEscalate` in `AppShell.tsx`, while `reset.isPending`.
- Both hang-up buttons in `LiveCallView.tsx`, while `control.ending`.
`.button.primary:disabled` has its own rule, which shows the problem was handled for one variant and missed for the others.

Suggestion: Add `.button.outline:disabled` and `.button.hang-up:disabled` rules, or write the variant rules as `:not(:disabled)`, so every variant gets the muted disabled look.

52. No test that a real send cancelled by De-escalate still counts toward the limits (apps/server/src/send-guard.test.ts:365; criticality 15, confidence 85)

`SendGuard.record` saves each send as `pending`, and `#used` counts `pending` the same as `sent`. When De-escalate cancels a real run, `RunEngine.#execute` returns before `markFailed()` ("The provider may have accepted a cancelled send, so it keeps counting"). The send stays `pending` and keeps using up the limit. That is a deliberate safety choice, but no test in this file covers it. The De-escalate test (line 365) only checks that an unused preview token stops working. A later change that marks cancelled sends as failed, or counts only `sent`, would pass every test here and let cancelled sends free up their limit. The documented rule that a refusal at confirm burns the token (`confirm` docstring) is not tested either.

Suggestion: Add a test that cancels a real run in progress with `POST /api/reset` and checks that `limits.hour.email.used` is 1. In the hour-limit test, also check that the refused second token can't be used later.

53. Email addresses are matched case-sensitively, so `JP@example.com` and `jp@example.com` become two recipients (apps/server/src/recipients/recipients.ts:121; criticality 15, confidence 85)

`add` looks the address up and upserts it on `(sessionId, address)` exactly as typed. A verified `jp@example.com` re-entered as `Jp@example.com` creates a new unverified recipient and sends another code, which also uses up the hourly limit. The HMAC also uses the raw address.

Suggestion: Lowercase (and trim) email addresses before storing and looking them up.

54. The static check uses a path relative to the module, but `serveStatic` resolves `root` from the working directory (apps/server/src/index.ts:652; criticality 15, confidence 85)

`webDist` comes from `import.meta.url`, so the `existsSync` check is right wherever the process starts. But `serveStatic({ root: "../web/dist" })` in @hono/node-server 2.1.5 does `join(root, filename)`, which resolves against `process.cwd()`. `pnpm start` runs with cwd `apps/server`, so that works. Start it from anywhere else, for example `tsx apps/server/src/index.ts` from the repo root, and the check passes but every page returns 404, while serveStatic only logs "root path not found".

Suggestion: Pass a root derived from `webDist` (for example `relative(process.cwd(), webDist)`), so the check and the server use the same directory.

55. When preparing the first preview fails, the dialog offers no way to try again (apps/web/src/sends/SendPreview.tsx:204; criticality 15, confidence 85)

If the first `prepare.mutate` fails (for example a timeout or error from the OpenAI neutral writer, a 429 limit, or a network error), the body shows `prepare.error.message` and the Send button stays disabled because `preview` is undefined. "Rewrite" only renders when `preview` exists, and "Prepare a new preview" only when `expired`. The only way to try again is to Cancel and reopen the preview from the rung.

Suggestion: Show the prepare-again button whenever `prepare.isError`, not only when the preview has expired.

56. Preview refusal tells the user to unlock with a real key when the real adapter is missing (apps/server/src/routes/sends.ts:40; criticality 15, confidence 80)

`chooseMode` returns `simulated()` with no reason both when the rung isn't unlocked and when `realAdapters[action.channel]` is missing, for example `ai-call` when `PUBLIC_BASE_URL`/`TWILIO_FROM_NUMBER` aren't set. In the second case the rung may already be unlocked with a real or configured key, but the 409 still says "Unlock this level with a real key to send for real.", which points the operator at the wrong fix. The comment on line 34 itself lists "no real adapter" as a separate case.

Suggestion: Give the missing-adapter case its own reason or message, such as "Real calls are off on this server."

57. `maskKey` shows a short configured key in full (apps/server/src/keys.ts:100; criticality 15, confidence 70)

`maskKey` returns the prefix (up to 5 characters, or the first 2) plus the last 4 characters. For any value of 6 characters or fewer, that is the whole key. Keys set in `.env` are never checked: `presetKeys` takes `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID` and `OPENAI_API_KEY` as given, and `config.ts` only requires a non-empty string. `list()` then sends the hint to every visitor in `state.keys`. A short placeholder or a truncated key from `.env` ends up visible in full in the browser. Real provider keys are long, so the harm is small.

Suggestion: Mask only when the value is long enough, for example at least 12 characters, and otherwise show only the prefix.

58. Focus is lost inside the dialog when Send for real switches to the sending view (apps/web/src/sends/SendPreview.tsx:108; criticality 15, confidence 70)

Pressing "Send for real" replaces the whole preview tree with the confirmed view. The focused button and the heading are new elements, and nothing moves focus, so keyboard and screen reader users end up on `body` while the modal is open. `Modal` only focuses the heading when the dialog opens. The disabled spinner button that replaces the send button can't take focus either.

Suggestion: Focus the `h2` (it already has `tabIndex={-1}`) when the view changes to the confirmed state.

59. One 1675-line global stylesheet for every component, with the mobile breakpoint split across two blocks (apps/web/src/styles.css:1620; criticality 15, confidence 60)

Every component's styles (shell, ladder, finder, activity, gate, live call, stand-ins, send preview, HQ scene) live in one 1675-line file. The same `@media (max-width: 1023px)` breakpoint appears twice: once at line 1325, where it holds the call view, shell, stage, ladder and gate overrides, and again at line 1620 for the stand-ins and send preview. To change one component's mobile layout you have to search two blocks that sit far from that component's base rules. The breakpoint is also repeated in `useMediaQuery.ts` (`min-width: 1024px`). The task asked for "mega clean code", and the project owner has said files around 1000 lines are too long.

Suggestion: Split the stylesheet per area (for example `shell.css`, `ladder.css`, `call.css`, `sends.css`, `hq.css`), each imported by its component or by `main.tsx`, with each area's mobile overrides next to its base rules.

60. Preview expiry compares the server's `expiresAt` with the browser clock (apps/web/src/sends/SendPreview.tsx:173; criticality 15, confidence 35)

`expired = now >= Date.parse(preview.expiresAt)`, where `expiresAt` is server time (`Date.now() + 5 min`) and `now` is the browser's `Date.now()`. If the browser clock is more than 5 minutes ahead of the server's, every preview shows as expired the moment it arrives, and "Prepare a new preview" always produces another expired one. Real sends become impossible. If the browser clock is behind, the button stays enabled after the server has expired the token. This is only likely when the app is opened from another machine.

Suggestion: Work out the deadline from when the preview arrived, plus the TTL (or a `expiresInMs` field), instead of the absolute server timestamp.

61. The e2e test waits for exactly 3 transcript lines while the fake call keeps adding lines every 900 ms (e2e/call.fake.spec.ts:85; criticality 15, confidence 30)

`FAKE_CALL_SCRIPT` in `apps/server/src/fake-providers-server.ts` plays 5 lines, 900 ms apart. `toHaveCount(3)` only passes if a poll happens in the roughly 0.9 s after line 3 appears and before line 4 does. Playwright polls every 500 ms at most, so this normally works. But under CI load, or if SSE delivery or rendering is delayed, the list can go from 2 to 4 lines between polls. The assertion then times out after 20 s. Nothing in the test needs the count to be exactly 3; the checks after it only read the first three lines.

Suggestion: Wait for the third line's text, or assert at least 3 lines, instead of an exact count of an intermediate state.

62. Call copy hardcodes "90 seconds" next to `CALL.maxSeconds`, and `previewNote`/`trialNote` are never used (packages/shared/src/messages.ts:57; criticality 12, confidence 90)

`CALL.maxSeconds` is 90, and the server timer (`voice/calls.ts`) and web countdown (`LiveCallView.tsx`, `call.ts`) read it. But `CALL.capReached` ("⏱ 90 seconds are up. Sisu hangs up.", logged by `voice/calls.ts:362`) and `CALL.previewNote` ("talk for up to 90 seconds") hardcode the number. Changing `maxSeconds` leaves the log line wrong. `SEND_COPY.callCap` already shows the right way with `{seconds}`. Also, nothing in `apps/` reads `CALL.previewNote` or `CALL.trialNote`. The preview uses `SEND_COPY.callCap` and `SEND_COPY.trialNotice` instead, so there are two different trial notices and one is dead. `SYSTEM_LINES.runStart` in `copy.ts` is also unused.

Suggestion: Build `capReached` from `maxSeconds` (or add a `{seconds}` placeholder), and delete `previewNote`, `trialNote` and `runStart`.

63. The answer check doesn't enforce the rules the comment says it enforces: phone numbers, bare links and links in the subject get through (apps/server/src/sends/neutral-writer.ts:76; criticality 12, confidence 80)

The doc comment says that "when the answer breaks the rules below, it gives the fixed text", and `RULES` asks for "no links, no phone numbers". The check only rejects `https?://` in the email body or SMS text. A phone number, a bare `www.example.com` or `example.fi` link, or a URL in the email subject all pass, and the server sends them for real once the operator confirms. The operator does see the preview first, so the harm is limited, but the code promises more than it checks.

Suggestion: Either check for phone numbers and bare domains (subject included), or change the comment so it lists only what is checked.

64. The expected writer calls are hardcoded by action id instead of read from `action.writer` (e2e/safety.recording.spec.ts:145; criticality 12, confidence 70)

`const writes = action.id === "threat-sms" || action.id === "recon" ? 0 : 1;` repeats what `packages/shared/src/ladder.ts` already records as `writer: false` on exactly those two actions. If someone changes an action's `writer` flag, or adds a simulation-only action with `writer: false`, this test fails or expects the wrong thing. The data that decides the server's behaviour (`mayWrite(action)` in `runs/engine.ts`) is right there in `RUNGS`.

Suggestion: Use `const writes = action.writer ? 1 : 0;`.

65. A success reply that does not match the schema throws a raw `ZodError`, and its JSON dump is shown to the user as the error message (apps/web/src/api/client.ts:64; criticality 12, confidence 70)

`request` handles refusals as `ApiProblem` with a readable message, but `schema.parse(body)` on a 2xx reply throws a `ZodError`. Its `message` is the pretty-printed JSON of the issues. Callers show `error.message` directly: `LadderPage` shows "Couldn’t reach the server: [ { "code": … } ]", `KeyForm` uses `setFormError(error.message)`, and `DeEscalate` shows "De-escalate failed: …". This happens when the client and server versions differ, or when the server returns a value outside the shared limits.

Suggestion: Use `safeParse`, log the issues, and throw an `ApiProblem`/`Error` with the same readable "Something went wrong on the server" message.

66. Any Twilio 429 is read as an expired code, so a passing rate limit closes the operator's pending verification (apps/server/src/recipients/code-sender.ts:153; criticality 12, confidence 50)

`checkPhoneCode` returns `"expired"` for both `404` and `429`. Recipients then calls `#close(pending.id)` and answers "That code has expired or had too many tries. Send a new one." Twilio uses 429 for 60202 (max check attempts) but also for its general rate limit (20429). A short throttle therefore throws away a valid pending code, and the user has to spend one of the hourly codes again. The comment above the line names only 404, though the code also treats 429 as expired.

Suggestion: Treat 429 as expired only when `body.code === 60202`. Report other 429s through `twilioRefused`, and update the comment.

67. Web results with the same name share a React key and both show as running (apps/web/src/finder/FinderPanel.tsx:107; criticality 12, confidence 50)

Cards use `key={option.name}`, and `chosen === option.name` decides which card shows "running". Web search results are not deduplicated by name: `parseResults` in `apps/server/src/finder.ts` only filters and slices. If the model returns two listings with the same name, for example the same company on two platforms, React gets duplicate keys, which can reuse the wrong card, and both buttons show the running label.

Suggestion: Key and track the chosen card by index, or by `name` plus `sourceUrl`, or deduplicate on the server.

68. The per-folder `globals` blocks have no effect (eslint.config.js:19; criticality 10, confidence 90)

Line 19 still gives every file both `globals.browser` and `globals.node`. ESLint flat config merges `languageOptions.globals` across matching blocks, so the later `apps/web` block (browser only) and `apps/server`/`packages` block (node only) narrow nothing: web code still sees `process`, and server code still sees `window`. Also, `typescript-eslint`'s recommended config turns `no-undef` off for `.ts`/`.tsx`, and those blocks only match `.ts`/`.tsx` files, so their globals are never read at all. A reader would think lint catches browser globals in server code, and it does not.

Suggestion: Drop the two per-folder `languageOptions` entries. Keep only the react-hooks and jsx-a11y `extends` for `apps/web`.

69. Comment says two verification codes have gone out and no call was placed, but the code counts one and checks neither (e2e/safety.recording.spec.ts:131; criticality 10, confidence 90)

At the `sms` rung, the comment `// Only the two verification codes have gone out, and no call has been placed.` sits above `sentBefore = messages().length`. `messages()` only counts `/emails` and `/Messages.json`. The phone code goes through Twilio Verify (`/v2/Services/.../Verifications`, see `code-sender.ts`), so it is not counted, and `sentBefore` is 1 (the email code), not 2. The line also asserts nothing: it only records a baseline. Neither "two codes" nor "no call placed" is checked there. A reader will think the test verifies something it does not.

Suggestion: Reword the comment to say this records the baseline (the one email code; the phone code goes through Verify), or add the assertions it describes.

70. "Checking with {provider}…" shows for a configured-key unlock, which is never checked with the provider (apps/web/src/ladder/KeyForm.tsx:33; criticality 10, confidence 90)

`checkingReal = busy && unlock.variables.body.mode !== "pretend"` is also true for `{ mode: "configured" }`. So pressing "Unlock with the configured key" changes the submit button to e.g. "Checking with Twilio…". But `acceptKeys` in `apps/server/src/routes/rungs.ts` just returns `keyVault.configured(rung)` and never calls the provider. The label describes a check that does not happen.

Suggestion: Compare with `=== "real"` instead of `!== "pretend"`.

71. A call that was never answered shows Ringing, Connecting Sisu and In call as completed steps (apps/web/src/call/LiveCallView.tsx:131; criticality 10, confidence 90)

When `status === "failed"`, `current` is the index of `ended` (3), so every earlier step gets the class `done`. A busy, no-answer or cancelled call (`UNANSWERED` in `call.ts`) never connected, yet the progress list shows "Connecting Sisu" and "In call" as done, followed by "Failed". This contradicts the call's actual history.

Suggestion: For a failed call, mark only the steps the call actually reached as done, for example by using `answeredAt` and whether a transcript exists.

72. The "newest call only" test doesn't give the old call's transcript line to the old run (apps/web/src/call/call.test.ts:101; criticality 10, confidence 90)

`said()` has no `runId` parameter, so `said(1, "sisu", "Old call.")` gets the default runId `run-call` instead of `first`. The test is meant to show that the previous call's transcript is not mixed into the newest one. As written, the line belongs to neither call, so the test never checks that an earlier real call's own events are filtered out.

Suggestion: Let `said` take a `runId` and pass `"first"`.

73. The test named "ends on done or a hang-up" never checks an answered call that ends with `done` (apps/web/src/call/call.test.ts:78; criticality 10, confidence 90)

The only `done` case is the no-answer call, which is expected to be `failed`. The only `ended` case is `cancelled`. The normal path, where the call is answered, Twilio reports `completed` and the run ends with `done`, is never checked to give status `ended` with the done text as `endText`.

Suggestion: Add the answered and `done` case to the test.

74. The README never says Playwright browsers must be installed before `pnpm e2e` (README.md:89; criticality 10, confidence 85)

The commands table lists `pnpm e2e` as "Playwright browser tests", but `pnpm install` does not download Chromium. On a fresh clone `pnpm e2e` fails with Playwright's "Executable doesn't exist" error until someone runs `pnpm exec playwright install chromium`.

Suggestion: Add `pnpm exec playwright install chromium` to the setup or next to `pnpm e2e`.

75. In development, the preview request runs twice on open, with two AI writes and two tokens (apps/web/src/sends/SendPreview.tsx:78; criticality 10, confidence 80)

`useEffect(preparePreview, [])` calls `prepare.mutate`, which posts to `/api/sends/preview`. `main.tsx` wraps the app in `StrictMode`, so in dev every open sends two previews. Each one calls `neutralWriter.write` (an OpenAI request when a key is held) and stores a confirmation row. This only happens in dev, but it costs real API calls during local testing.

Suggestion: Guard the first prepare with a ref, or prepare from the `openPreview` click instead of a mount effect.

76. De-escalate stops the browser's robocall speech only when the reset request succeeds (apps/web/src/shell/AppShell.tsx:74; criticality 10, confidence 80)

`reset.mutate(undefined, { onSuccess: stopSpeech })` calls `stopSpeech` only after `POST /api/reset` succeeds. The robocall speech plays locally in the browser through `speechSynthesis`. If the server refuses the reset or can't be reached, which is exactly when De-escalate shows "De-escalate failed", the speech keeps talking, even though stopping it needs no server at all.

Suggestion: Call `stopSpeech()` right away in the click handler, before or alongside `reset.mutate()`.

77. A refused call shows Twilio's reason twice in the activity log (apps/server/src/voice/calls.ts:131; criticality 10, confidence 75)

When `place` rejects with an `ApiProblem`, `run()` emits a `provider-status` event with `text: error.message`, then rethrows. The engine's catch then emits a `failed` event whose text is the same `error.message`, because it is an `ApiProblem`. The test "shows Twilio's reason, fails the run and doesn't count the call" shows both events back to back (`at(-2)` refused, `at(-1)` failed). The log reads `Twilio · refused: Twilio refused: …` followed by the same sentence again. The engine's comment "A provider's refusal already reads as a log line" assumes one line.

Suggestion: Drop the extra `provider-status` emit and let the engine's `failed` line carry the message, as the SMS and email adapters do. Or emit the status and throw something the engine doesn't repeat.

78. The real-keys test doesn't check what its name says (packages/shared/src/ladder.test.ts:75; criticality 10, confidence 75)

The test is named "real keys belong only to the rungs with real-capable actions", but it only compares the rungs that have real keys with the hard-coded list `["email", "sms", "robocall"]`. It never looks at which rungs hold the `real-capable` actions. Suppose `polite-sms` moved to another rung while the Twilio keys stayed on `sms`. This test and the "only the neutral email, SMS and call can run for real" test, which checks only ids and channels, would both still pass, even though the key and the action it unlocks no longer sit on the same rung.

Suggestion: Work out the rungs that have `real-capable` actions and compare them with the rungs that have real keys. Don't use a hard-coded list.

79. Email prompt says "no greeting-less sign-off", which is unclear and invites a duplicate sign-off (apps/server/src/sends/neutral-writer.ts:69; criticality 10, confidence 70)

The system prompt says `no greeting-less sign-off: the signature is added for you.` What it means is "don't add a sign-off", but "greeting-less sign-off" doesn't say that, and a model can read it as permission to add one. `EMAIL.footer` always appends "Kind regards,\nSisu, …", so an AI body that ends with its own "Best regards, Sisu" gives a doubled signature in the preview and in the real email. The validator does not check for this.

Suggestion: Say it plainly, e.g. "Don't end with a sign-off or signature; one is added for you."

80. The De-escalate test's title says the call is hung up, but it never checks that (e2e/call.fake.spec.ts:133; criticality 10, confidence 70)

The fake server's `hangUp` does nothing (`hangUp: async () => {}`), and the test only checks that the live-call strip disappears and the robocall rung is no longer current. It would still pass if De-escalate stopped showing the call while leaving it connected. The server unit test covers the hang-up itself, so this is only a misleading title.

Suggestion: Rename the test to describe what it checks (the call strip and rung reset), or have the fake record hang-ups and assert on them.

81. The e2e servers inherit the shell's environment, so exported provider keys or limits change what the tests see (playwright.config.ts:94; criticality 10, confidence 60)

Playwright starts each `webServer` with `process.env` plus the `env` given here. The recording server runs the production `src/index.ts`, so `presetKeys(loadConfig())` picks up any `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` or `SEND_LIMIT_*` exported in the developer's shell, and the first server reads `SEND_LIMIT_SMS_PER_HOUR` and the other `SEND_LIMIT_*` values from there too. Then rungs start out unlocked and limits change, and the journeys fail or test something else. The "No .env here" comment suggests these servers are isolated, but only the `.env` file is left out.

Suggestion: Set the provider variables to empty strings (and the limits explicitly) in each server's `env`.

82. `TestClient.log()` hangs when more events arrive after the state read (apps/server/src/test-client.ts:210; criticality 10, confidence 50)

`log()` reads `lastEventId` from `/api/state`, then reads SSE until the last event's id is exactly `lastEventId`. If a run is still emitting, the stream chunk that contains `lastEventId` can also carry later events, so `events.at(-1)?.id` skips past it, `until` never matches, and the test blocks until vitest's timeout instead of failing with a clear message. The doc comment says it returns the log "so far", but in that case it would also return later events.

Suggestion: Stop at `>= lastEventId` and drop the events after it.

83. The client's choice of recipient doesn't match the server's "latest verified" rule that the comment says it copies (apps/web/src/sends/SendPreview.tsx:67; criticality 10, confidence 50)

The comment says this is "The verified recipient the server would send to: the latest one on this channel." The server's `Recipients.latestVerified` orders by `verifiedAt desc`, and that recipient is what the rung's REAL mark shows (`choice.recipient`). `state.recipients` is ordered by `createdAt`, so `findLast(verified)` picks the most recently created verified recipient. With two verified recipients on one channel (for example two pending addresses verified in the opposite order, from two tabs), the preview targets a different recipient than the one named on the rung.

Suggestion: Have the state expose which recipient is the default (for example the recipient id in `actionModes`) and use that, instead of guessing from list order.

84. The free-up time uses the server's time zone, not the operator's (apps/server/src/sends/guard.ts:338; criticality 10, confidence 45)

`#freesUpAt` formats the time with `Date.prototype.toTimeString()`, so it uses the server process's local time zone. The text goes into the 429 message the browser shows. If the server runs in UTC, for example in a container or on a host, a Finnish operator sees a time 2-3 hours off. Since this mostly runs locally on the operator's own machine, the times usually match.

Suggestion: Return the ISO instant and let the web app format it in local time, or format it with the client's time zone.

85. The mobile Activity tab can count the whole replayed history as "new" (apps/web/src/shell/LadderPage.tsx:124; criticality 10, confidence 45)

`MobileTabs` sets `seen` from `items.length` when it mounts. It mounts as soon as `/api/state` answers, but `ActivityProvider` fills `items` from the SSE replay of the whole log, which can arrive later. Every replayed line then shows as "· N new" on the Activity tab, even though the user has not missed anything. The same happens whenever `MobileTabs` remounts, for example when switching back from the desktop layout or after the error screen.

Suggestion: Count unseen items by event id against the `lastEventId` the page loaded with (as the report logic does), not by list length when the component mounts.

86. The key-vault migration keeps drizzle-kit's random name `yellow_imperial_guard` (apps/server/drizzle/20261029181204_yellow_imperial_guard/migration.sql; criticality 8, confidence 90)

The other two migrations have names that describe them (`init`, `send_guard`). This one creates `provider_keys` but kept the random name drizzle-kit generates. Next to `send_guard`, the word "guard" suggests it belongs to the send guard. Anyone reading the migrations folder has to open the file to learn that it adds the provider key vault.

Suggestion: Rename it before the first release, for example to `20261029181204_provider_keys` (rename the folder and leave `snapshot.json` ids as they are), or generate it with `--name provider_keys`.

87. `useMediaQuery` passes a new subscribe function on every render, so it re-subscribes every time (apps/web/src/useMediaQuery.ts:4; criticality 8, confidence 90)

`useSyncExternalStore` re-subscribes whenever the `subscribe` argument changes. The inline arrow is new on each render, so every render of `LadderPage` (which happens on each SSE event) removes and re-adds the `matchMedia` listener and creates a new `MediaQueryList`. It works, but it is wasted work, and it goes against the documented use of the hook.

Suggestion: Wrap `subscribe` in `useCallback` keyed on `query`, or build it once per query outside the render.

88. Provider messages that already end with a period are shown with a double period (apps/server/src/recipients/code-sender.ts:55; criticality 8, confidence 80)

`twilioRefused` builds `${body.message}.` and `resendRefused` builds `${body.message ?? statusText}.`. Many Twilio and Resend messages already end with a period, e.g. Twilio 21211 "The 'To' number … is not a valid phone number." or Resend's "Invalid `to` field. … format.". The log then shows `✖ Twilio refused: … phone number.. Nothing was sent.` The test fixture message "The number is unverified." has a trailing period too, but it goes through the 21608 branch, so no test covers this case.

Suggestion: Add the period only when the message doesn't already end with `.`, `!` or `?`, the same way `ticketValues` does for the complaint.

89. `keysFor` doc says tests run in parallel, but the file is serial and the OpenAI key is shared (e2e/safety.recording.spec.ts:40; criticality 8, confidence 75)

The docstring `Each test signs in with its own keys, so parallel tests can read their own calls.` contradicts `test.describe.configure({ mode: "serial" })` further down, and the config's `dependencies: ["desktop-recording"]` that makes the two recording projects take turns. The per-test keys can't separate the tests' OpenAI calls anyway: `mine` always includes the shared `RECORDING_OPENAI_KEY`. The tests are correct only because they run one at a time, and this comment suggests the opposite.

Suggestion: Say the per-test Resend and Twilio keys separate each test's sends, and that OpenAI calls are only told apart because the tests run serially.

90. `FinderOption` is written by hand next to `finderOptionSchema`, which describes the same shape (packages/shared/src/finder.ts:4; criticality 8, confidence 70)

`api.ts` defines `finderOptionSchema` (with length limits and a URL check), while `finder.ts` declares a separate `FinderOption` interface for the same card. The server already uses a third version (`type FinderOption = FinderResponse["results"][number]` in apps/server/src/finder.ts). Nothing checks the `FINDER_EXAMPLES` against the schema at compile time, so the two definitions can drift. For example, an example with a 90-character name would type-check but then fail `finderResponseSchema.parse` in the client.

Suggestion: Export `type FinderOption = z.infer<typeof finderOptionSchema>` from `api.ts` and use it in `finder.ts` and on the server.

91. Key status copy is hardcoded in components while the rest of the UI copy lives in `@rengas/shared` copy (apps/web/src/ladder/KeyForm.tsx:117; criticality 8, confidence 70)

`KeyForm.tsx:117` hardcodes "Any key-shaped text works. Shape check only. Nothing stored." `RungActions.tsx:48-49` hardcodes "Shape check only. Nothing stored." and " This rung simulates.", and `RungActions.tsx:64-65` hardcodes `${name} key accepted` and `${name} key from server config`. The sibling strings in the same elements come from `UNLOCK_COPY` and `LABELS` in `packages/shared/src/copy.ts`, and `UNLOCK_COPY.configuredHint` already says "{provider} key from server config". With the same sentence written in two places, it will drift when someone edits the copy.

Suggestion: Move these strings into `UNLOCK_COPY` and use `format` like the neighbouring copy.

92. Doc comment says `SisuMark` is used on narration lines, but narration lines don't use it (apps/web/src/shell/SisuMark.tsx:1; criticality 5, confidence 95)

The comment reads "used in the header and on narration lines". Only two places render `<SisuMark />`: the app header (`apps/web/src/shell/AppShell.tsx:20`) and the live call header (`apps/web/src/call/LiveCallView.tsx:83`). Narration lines in `apps/web/src/activity/ActivityPanel.tsx:180` show a CSS `<span className="sisu-chip">` instead. Anyone who changes `SisuMark` and trusts the comment would expect narration lines to change too, and they won't.

Suggestion: Change the comment to "used in the app header and the live call header".

93. Mobile disclosure reads "1 higher rungs" when only one rung is hidden (apps/web/src/ladder/Ladder.tsx:107; criticality 5, confidence 95)

The label is always `{grouped.length} higher rungs · …`. On a narrow screen with the blimp rung (index 8) as the next rung, `grouped` holds only `singularity`, so the button says "1 higher rungs · Show". The e2e test only checks the plural case (`8 higher rungs · Show`).

Suggestion: Use `rung` when `grouped.length === 1`.

94. Dead `started.type === "system"` check exists only to work around a too-wide type guard (apps/web/src/call/call.ts:48; criticality 5, confidence 95)

The `find` callback already requires `item.type === "started"`, yet its guard is declared as `item is RunEvent`. TypeScript therefore still thinks `started` could be the `system` variant, which has no `runId`. Line 48 adds `started.type === "system"` to narrow it, but that condition can never be true at runtime. Readers may wonder which case it handles.

Suggestion: Declare the guard as `item is Extract<RunEvent, { type: "started" }>` and drop the `system` check.

95. The e2e SQLite files are never removed, and the log paths and ports are fixed, so two runs at once collide (playwright.config.ts:96; criticality 5, confidence 85)

Each run creates `rengas-e2e-<pid>.db`, `rengas-e2e-fake-<pid>.db` and `rengas-e2e-recording-<pid>.db` (WAL mode, so `-wal`/`-shm` files as well) in the system temp folder. Nothing deletes them, so they pile up with every run. The ports (8797, 8798, 8811) and `OUTBOUND_LOG`/`PROVIDER_LOG` (`e2e/support/paths.ts`) are fixed. With `reuseExistingServer: false`, a second `pnpm e2e` on the same machine fails to start. If it did reach the logs, it would truncate the first run's logs.

Suggestion: Use `:memory:` or a per-run temp directory that is removed in global teardown, and put the logs in that same directory.

96. Field errors from an earlier attempt stay up during and after a configured-key unlock (apps/web/src/ladder/KeyForm.tsx:44; criticality 5, confidence 85)

`submit` and `makeOneUp` reset `errors`, but `send({ mode: "configured" })` from `ConfiguredKey` only clears `formError`. If a real key was rejected (the server returned `fieldErrors`) and the user then presses "Unlock with the configured key" and that fails (for example `not-configured`), the old per-field errors and `aria-invalid` stay next to the new form error, even though no typed value was sent.

Suggestion: Call `setErrors({})` in `send` or in the configured handler.

97. `FOUND_LINE` says "Found 1 options" when the web search keeps one result (packages/shared/src/ladder.ts:133; criticality 5, confidence 85)

`FOUND_LINE` is `"Found {n} options. Sisu read about them. Sisu contacted none of them."`, and `apps/server/src/routes/finder.ts:82` fills `{n}` with `String(response.results.length)`. In web-search mode, `parseResults` in `apps/server/src/finder.ts` drops every result that has no `sourceUrl` and then slices to `MAX_RESULTS`, so 1 result (or 0) is a normal outcome. With 1 result the log reads "Found 1 options. Sisu read about them." With 0 it reads "Found 0 options. Sisu read about them.", which contradicts itself.

Suggestion: Pick singular or plural text based on the count, or reword the line so it reads correctly for any number (for example "Options found: {n}."). Give zero results its own line.

98. The `end_call` test doesn't check the run's outcome or wait for the run to finish (apps/server/src/voice-call.test.ts:250; criticality 5, confidence 80)

The test checks that the hang-up happens only after the goodbye mark. It never checks that `CALL.sisuHangsUp` is logged or that the run ends with `done`. It also posts `completed` without awaiting `s.client.events(runEnded(...))`, so the run's closing steps can still be running after the test ends. The neighbouring tests do wait for the run to end.

Suggestion: Await `runEnded(runId)` and assert that the `sisuHangsUp` step and `done` are in the log.

99. Rungs get two scroll offsets: `html` scroll-padding plus `.rung` scroll-margin (apps/web/src/styles.css:633; criticality 5, confidence 70)

`html { scroll-padding-top: 120px }` (line 90; 72px on mobile, line 1388) already keeps scrolled-to elements clear of the sticky warning, as its comment says. `.rung { scroll-margin-top: 96px }` adds to it, because browsers apply both scroll-padding and scroll-margin. When `Ladder.tsx` calls `scrollIntoView({ block: "nearest" })` on a rung while scrolling up, the rung stops about 216px below the top of the viewport (168px on mobile, where the warning is not even sticky). That is roughly three times the height of the warning band. The result is wasted space, and two rules are doing one job.

Suggestion: Keep one of the two offsets.

100. Provider-status texts repeat the provider name that the activity panel already prints (apps/server/src/voice/calls.ts:307; criticality 5, confidence 55)

`ActivityPanel` renders a `provider-status` event as `${PROVIDER_NAMES[provider]} · ${status}: ${text}`. `openaiError` sets `text` to `OpenAI: ${message}`, and the Twilio fallback at line 271 is `📞 Twilio: ${status}`. So lines read `OpenAI · error: OpenAI: Bad audio` and `Twilio · foo: 📞 Twilio: foo`. The shared `CALL.statuses` texts have the same prefix, so every Twilio status line reads like `Twilio · ringing: 📞 Twilio: ringing`.

Suggestion: Leave the provider name out of `text` in `calls.ts` (and in `CALL.statuses`), or have the panel show only `text` for these events.

101. The header says the script writes the JSON "next to this file", but it writes into `fixtures/` (tests/parity/export-fixtures.ts:4; criticality 3, confidence 100)

`outDir = join(here, "fixtures")`, so the files go to `tests/parity/fixtures/ladder.json` and `rules.json`, not to `tests/parity/`. Someone following the comment would look in the wrong directory.

Suggestion: Say "into fixtures/ next to this file".

102. Second import from `./messages.ts` instead of one merged import (packages/shared/src/schemas.test.ts:14; criticality 3, confidence 100)

Line 12 imports `{ CALL_INSTRUCTIONS, SMS }` from `./messages.ts`, and line 14 imports `{ GSM_TEXT }` from the same module again, after the `./template.ts` import. This is a leftover from a later edit.

Suggestion: Merge `GSM_TEXT` into the import on line 12.

103. The doc comment says every old key is mapped, but unchanged keys are left out of `KEY_RENAMES` (tests/parity/renames.ts:10; criticality 3, confidence 80)

The comment says "old keys map to new keys, or to null when dropped". `KEY_RENAMES` only lists renamed or dropped keys (`smtp`, `sms-sid`, `sms-token`, `voice`, `tts`). Unchanged keys such as `bulkmail`, `meta`, `scraper`, `blimp` and `pigeon` are missing, and `parity.test.ts` treats a missing key as "kept under the same id" (`key.id in KEY_RENAMES ? … : key.id`). The comment should state that rule, or a reader may think the table is incomplete.

Suggestion: Say: "Old keys not listed keep their id; listed keys map to the new id, or to null when dropped."

104. Each run leaves a temp directory with the old `ladder.ts` behind (tests/parity/export-fixtures.ts:22; criticality 2, confidence 100)

`mkdtempSync(join(tmpdir(), "old-ladder-"))` creates a new directory on every run and nothing removes it after the import.

Suggestion: Remove it with `rmSync(oldDir, { recursive: true })` after the import.

Places outside their files the reviewers suggest checking:
- apps/server/src/voice/calls.ts: When Twilio refuses a call, `run` logs a `provider-status` event with `error.message` and then throws the same `ApiProblem`. `RunEngine.#execute` then logs a `failed` event with the same text, so the refusal probably appears twice in the log.
- apps/server/src/state.ts: `buildState` calls `keyVault.credentials` just to decide `finderMode`, so a stored key that fails to decrypt makes the state endpoint fail. Check whether it should check that a key exists instead of decrypting it.
- apps/server/src/sends/guard.ts: Keys set in `.env` are offered to every session, and send limits are counted per session. A new session costs only a cookie, so check whether the operator's Resend and Twilio keys need a limit across all sessions.
- apps/server/src/sends/guard.ts: Check that its real-send rate limits (around lines 270-285) don't have the same race: a count read before an awaited provider call, with the row written afterwards.
- apps/server/src/routes/sends.ts: The call preview awaits `voice!.isTrial()` without handling errors. Decide whether a failed Twilio account lookup should block the preview or just leave out the trial notice.
- apps/server/src/runs/engine.ts: The engine always emits `realDone` ("Sent for real") and the action's `after` line when an adapter returns. Check whether real runs that ended without delivery, such as an unanswered call, need a different ending.
- apps/server/src/routes/finder.ts: `POST /api/finder` has no rate limit, and it spends the operator's `.env` OpenAI key for any session. Check whether it should go through the send guard or have its own per-hour cap.
- apps/server/src/recipients/recipients.ts: The hourly code cap is per session, and a new cookie starts a new session, so codes to unverified addresses have no real global limit. Consider a cap per address or per server.
- README.md: The tunnel section should say that the tunnel exposes the whole app and the configured keys. It should also say that changing `APP_SECRET` breaks keys stored in the UI.
- apps/web/src/activity/ActivityProvider.tsx: The EventSource opens at mount, at the same time as the first `/api/state` request. Check whether it should wait for the state query to succeed, so both use the same session cookie on a first visit.
- apps/server/src/recipients/recipients.ts: Verification codes are limited per session only, and they can be sent with keys set in `.env`. Consider a limit across all sessions (per IP or overall) before code sends that use the operator's keys.
- apps/server/src/events.ts: `subscribe`'s unsubscribe isn't idempotent: it deletes `#listeners[sessionId]` whenever its own captured set is empty, even if a newer set has replaced it. Make it check that the map still holds its own set.
- .env.example: Check whether it lists `SEND_LIMIT_*` (or `PORT`) with empty values. If it does, copying it sets the send limits to 0 because of how `config.ts` coerces numbers.
- apps/server/src/routes/finder.ts: Finder searches have no per-session limit and no in-progress guard. With a configured `OPENAI_API_KEY`, any visitor can start many 90 s paid web searches in parallel.
- apps/server/src/app.ts: When `PUBLIC_BASE_URL` is set, check whether requests arriving through the tunnel host should only reach `/twilio/*`. Right now `/api/*` and the web app are open to anyone with the tunnel URL, and every new session gets the `.env` preset keys (`keys.ts` `presetKeys`).
- apps/server/src/fake-provider-server.ts: This test-only server exposes `/__fake/codes` and `/__fake/sends` and lives in `src` next to the production entry. Check that no production path or build can start it, and consider merging it with `fake-providers-server.ts`.
- apps/server/src/runs/message-adapters.ts: This file reuses `resendRefused` and `twilioRefused` for real sends. Check that its fetches have a timeout and turn network or non-JSON failures into a provider-refused event, not a crashed run.
- e2e/finder.fake.spec.ts: This comment and the one in `e2e/call.fake.spec.ts` call `fake-providers-server.ts` "the fake-provider server", which is the name of the other test server. Fix the wording along with any rename.
- apps/server/src/no-keys-climb.test.ts: It covers parity row 12 through `testApp()` rather than the `index.ts` wiring (live writer, neutral writer, finder, key checkers). Check whether any test runs the production wiring with no keys and confirms that nothing goes out, including the finder.
- apps/server/src/recipients/recipients.ts: The hourly cap on code sends (around line 128) counts `verification_codes` rows, and `remove()` deletes them through the cascade. Fix the schema or count codes somewhere a recipient delete doesn't touch, then add a test for the add → remove → add loop.
- apps/server/drizzle/20261029184213_send_guard/snapshot.json: Not in my share. Check that it matches the final `schema.ts` and that its `prevIds` points to `6f13e97d-257f-45bf-ac0a-fdfb1a041121`.
- apps/server/src/session.ts: A fix could also go on the server: set the session cookie when `index.html` is served, or stop concurrent cookieless requests from each starting a session. Then every client gets one session per visit, whatever the request order.
- apps/web/src/shell/LadderPage.tsx: `MobileTabs` counts unseen items from `items.length` at mount. If the replay arrives after mount (it usually does), the Activity tab shows the whole history as "N new". Check whether that is intended.
- apps/server/src/session.ts: `sessionMiddleware` starts a new session for every request that arrives without a cookie, so parallel first requests (`/api/state` and `/api/events`) get separate sessions. Check whether the server should set the cookie when the page loads or otherwise avoid this.
- apps/server/src/routes/rungs.ts: Unlock keys go to `keyVault.checkAndStore` without being trimmed, even though `validateKeys` trims them for its check. Trim them here or in `unlockRequestSchema`.
- apps/server/src/runs/engine.ts: When a request carries `confirmToken` but `chooseMode` picks simulated, the token is silently ignored and a simulated run starts. Check whether it should refuse instead, so a confirmed real send never quietly becomes a fake one.
- apps/server/src/routes/recipients.ts: There is no way to resend a code to a pending recipient by id. The client never has the full address, so after a reload it can't ask for a new code (see finding 1).
- apps/web/src/ladder/KeyForm.tsx: I couldn't run the type checker in this read-only session. Check that `unlock.variables.body` (line 33) and `choice.recipient` in `RungActions.tsx` compile under strict mode: they rely on TypeScript narrowing through the `busy` and `real` variables.
- apps/server/src/voice/calls.ts: To keep the web countdown and the report in step with the cap, consider emitting one explicit 'answered' event when `#answered()` starts the cap (from either the callback or the media attach).
- apps/web/src/report/summary.ts: It depends on `latestCall(...).answeredAt`, so a call that only connected through the media stream is left out of the real call count and call seconds. Recheck it if finding 1 is fixed.
- apps/server/src/db/schema.ts: `verificationCodes.recipientId` uses `onDelete: "cascade"`. Change it, for example to nullable with `set null`, or keep a separate code-send log so recipient deletion can't reset the hourly cap, then regenerate the migration.
- apps/server/src/recipients.test.ts: Add a test that sends 5 codes, deletes the recipient, adds it again and expects a 429.
- apps/web/src/sends/Modal.tsx: It gives focus back to the element that opened it even when that element is no longer on the page. Check this when a preview closes after the call view has replaced the ladder.
- apps/server/src/finder.ts: `parseResults` does not remove duplicate result names, but the web finder cards rely on names being unique.
- apps/server/src/recipients/code-sender.ts: `providerRefused` fills `{reason}` with the provider's own error text through `String.replace`, which treats `$&`/`$'` in that text as replacement patterns. It also appends `.` to messages that often already end with one ("... number.. Nothing was sent."). Use a function replacement, and only add the full stop when it's missing.
- apps/web/src/format.ts: `format` checks `name in values`, so a template placeholder like `{constructor}` would print an inherited function. `apps/server/src/routes/rungs.ts` `line()` has the same issue. Consider replacing both with a shared `fillTemplate` that uses `Object.hasOwn`.
- e2e/: The mobile overflow checks only compare `documentElement.scrollWidth` with the viewport. A screenshot or element-overlap check of the header at 390px would show whether the stand-ins button label overflows.
