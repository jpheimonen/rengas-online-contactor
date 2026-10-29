# Parity plan: old simulated ladder → new full-stack app

## Where the old system's evidence lives
- **The old app at commit `f5b9e78`.** It runs with `git worktree add ../old f5b9e78 && cd ../old && pnpm install && pnpm dev`. This commit stays reachable on `main` after the old code is deleted.
- **Recorded outputs, captured by the first implementation job before anything is deleted.** They are committed under `tests/parity/fixtures/`:
  - `ladder.json`: the old `RUNGS` data with every title, tagline, threat label, key spec, action label, script line and the robocall speech text, exported from `src/ladder.ts`.
  - `rules.json`: the old rule functions' outputs (`isUnlocked`, `canAttemptUnlock`, `currentLevel`, `validateKey`) over every unlock subset and a set of key strings.
  - Screenshots of the old app at desktop (1280 px) and mobile (390 px) sizes in its states: disclaimer, level 1, a key form with errors, verifying, each level unlocked, a run streaming, and after De-escalate. These are a reference for comparing journeys, not pixel targets.

## Behaviours to compare and how

| # | Behaviour (from the users' flows) | How it is compared |
|---|---|---|
| 1 | The 8 rungs, in the same order, with their keys and actions. Every old action is still present, or it is replaced by a richer one named in the product design. | Data check: a test loads `ladder.json` and checks that every old rung id, level, threat label and action id exists in `packages/shared` (or is mapped in an explicit table of renames). Wording may improve, but the order may not change. |
| 2 | Next-rung-only unlocking: level 1 needs no keys, rungs can't be skipped, and `currentLevel` works as before. | Same inputs through both: replay `rules.json` against the new shared rules and the server's unlock endpoint. |
| 3 | Key form errors for empty keys, keys with spaces and keys shorter than 8 characters. Simulation-only keys keep the shape check. | Replay `rules.json` for the key-shape cases. API contract test on `POST /api/rungs/:id/unlock` for the error messages each field returns. |
| 4 | Unlock flow: a "Verifying keys…" state with the inputs disabled, then the rung opens, the log says so and the page scrolls to the rung. | Whole journey in Playwright on the new app, compared with the old screenshots. |
| 5 | A simulated run: the button shows "Running…" and is disabled, the scripted lines stream into the log tagged SIMULATED, the run ends with a done line, the same action can't run twice at once, different actions run in parallel, and typing in another form is not wiped. | API contract test (`POST /api/runs` rejects a duplicate run, SSE event order) plus a Playwright journey. |
| 6 | Mood meter and escalating theme: the threat label and fill follow the current level. | Playwright check of the label and the level marker for every level. |
| 7 | De-escalate: forgets unlocks (and now the stored keys), cancels running scripts and pending verifications so no late lines appear, stops speech, logs the de-escalate line and keeps the log. | API test: reset while a run is in flight, then assert no further events for it. Playwright journey. |
| 8 | Disclaimer gate: the modal can't be dismissed until the box is ticked, Escape is blocked, it reopens if force-closed, and the acknowledgement lasts for the tab. | Playwright journey. |
| 9 | Robocall preview through the browser's own speech synthesis, with the "no speech support" fallback line. | Playwright with a stubbed `speechSynthesis`. |
| 10 | Disclaimers visible in the banner, the modal and the footer. Staff recon results are labelled invented. | Playwright text checks. A content review against the new copy. |
| 11 | Accessibility: the log is a polite live region with the newest line first, key inputs are password fields with autocomplete off, invalid fields get `aria-invalid`, and the meter and ladder have labels. | Playwright with axe, plus explicit attribute checks. |
| 12 | The whole climb from level 1 to level 8 with no keys works entirely as a simulation and makes no outbound network calls. | Whole journey in Playwright on desktop and mobile. The server runs with fake provider clients that fail the test if they are called. |

## Differences the new system is meant to have (not parity failures)
- **Real sending when keys are given.** Email, SMS and the AI voice call go only to verified recipients, after a preview and confirmation, within rate limits (register `send-guard` and `safety-boundary`). The old copy that says "nothing is ever sent" is replaced.
- **Keys are checked live and stored encrypted on the server** instead of being checked for shape and thrown away (`provider-keys`).
- **New flows:** managing recipients and verifying them by code, send previews and confirmations, rate limits shown in the UI, the real robocall, and the finder agent's results.
- **Persistence.** Unlocks, keys, recipients and run history survive a reload within the session. The old app lost them. The log replays from the server.
- **React UI, new visual design and the product's added ambition** (unknown `ambition-shape`). The rungs and actions it adds are not covered by parity. Their own tests cover them.
- **Wording may improve.** Parity holds on the meaning and the order of the content, not on exact strings, except for the safety labels (SIMULATED, invented staff, the disclaimers).

## Safety checks beyond parity
- Every simulation-only action is run with all keys set and a verified recipient. Each one must produce zero provider calls.
- A real send without a valid confirmation token, to an unverified recipient, over the rate limit or after De-escalate is refused by the server.
- The finder agent's tool list contains only web search.

## When it is done
Rows 1–12 pass on the new app. The fixtures and screenshots are committed. The safety checks pass. Then the old `src/`, the root `index.html` and the single-package config are deleted. `f5b9e78` stays the runnable reference.
