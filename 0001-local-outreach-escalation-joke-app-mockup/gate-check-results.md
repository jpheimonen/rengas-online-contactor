The factory ran 1 check in parallel in 34s: 0 passed, 1 failed.

### security: failed with exit status 1 after 34s

Command: `taiga static-checks`
Full log: /tmp/gate-checks-2ffv_iuk/security.log

````text
# Static security checks

Scope: branch; 14 files.
Base: origin/main; merge base: 82e490b6b6388e66fef0fabbdd60edaee551ff9b.

| Scanner | Status | Open | Ignored |
| --- | --- | ---: | ---: |
| gitleaks | completed | 0 | 0 |
| bandit | skipped | 0 | 0 |
| gosec | skipped | 0 | 0 |
| devskim | completed | 1 | 0 |
| pmd | skipped | 0 | 0 |
| psalm | skipped | 0 | 0 |
| checkov | completed | 0 | 0 |
| trivy | completed | 0 | 0 |
| zizmor | skipped | 0 | 0 |

## Model report

## Security report

- **Open finding:** **DevSkim — DS162092 (low)** at `vite.config.ts:4`: possible debug code left in production. This looks like a **possible real issue**, but the scanner result alone does not establish that debug behavior is enabled in production. Check what the code does and whether production builds include or activate it; remove it or document why it is safe. This open finding must be fixed or marked as a false positive with a reason.

## Coverage and status

- **Completed with no open findings:** Gitleaks, Checkov, and Trivy. These are clean only for the checks and files in scope.
- **Skipped:** Bandit, Gosec, PMD, Psalm, and Zizmor reported no applicable files in scope. These are coverage gaps, not clean results.
- **Scanner errors:** None reported.
- **Omitted findings:** None (`omitted_from_model: 0`).

## Open findings

- f37fa8074f02 · low · devskim DS162092 · vite.config.ts:4: Do not leave debug code in production

## Scanner notes

- bandit: No applicable files in scope
- gosec: No applicable files in scope
- pmd: No applicable files in scope
- psalm: No applicable files in scope
- zizmor: No applicable files in scope

## Next step

Open findings: 1. Fix each one. When a finding is a false positive, mark it with the reason it is safe, and later scans skip it:

    taiga static-checks --ignore ID [--ignore ID ...] --reason "why it is safe"

Each ignore is kept in the repository settings, outside the repository. Then run the check again.

Results: /home/jp/.local/state/taiga/static-checks/e2e8939f4ca94879ab771abec9886344
````

### code_review: 10 findings

Strength 3 of 6, Standard. The whole review, with each reviewer's summary and the findings they dropped, is in /home/jp/projects/taiga/factory-vm/.factory-debug/factory-vm/reviews/4c7483c7-0219-4cfd-b896-4648298d5085/review.json.

No model read these files:
- pnpm-lock.yaml: A generated file.

1. README says "Node 20+" but the pinned dev dependencies need Node 22 and no `engines` field states the minimum (README.md:30; criticality 25, confidence 95)

`README.md` says "Needs Node 20+ and pnpm." The versions in `pnpm-lock.yaml` need more: `vitest@5.0.5` needs `^22.12.0 || ^24.0.0 || >=26.0.0`, `jsdom@30.1.3` needs `^22.22.2 || ^24.15.0 || >=26.0.0`, `eslint@10.13.0` needs `^20.19.0 || ^22.13.0 || >=24`, and `vite@8.3.5` needs `^20.19.0 || >=22.12.0`. Someone on Node 20 gets engine warnings from `pnpm install`. `pnpm test` is outside what Vitest supports there, and on Node 20.0–20.18 `pnpm dev` and `pnpm lint` can fail too. `package.json` has no `engines` field, so nothing catches the mismatch.

Suggestion: Add an `engines.node` field to `package.json` (e.g. `>=22.12`, or the strictest dependency's floor, `>=22.22.2` while `jsdom` stays) and change the README to match. Or pick dependency versions that run on Node 20.

2. De-escalate does not cancel pending key verification or running action scripts, so the old state keeps changing after the reset (src/main.ts:206; criticality 20, confidence 92)

The `#reset` handler (line 254) clears only `unlocked`. It does not cancel asynchronous work that is still waiting. (a) `unlockRung` awaits `sleep(VERIFY_DELAY_MS)` and then calls `unlocked.add(rung.id)` without checking for a reset. If the user clicks De-escalate within 900 ms of submitting keys for a level, the log shows "De-escalated. All keys forgotten" and then "Level 4 ... unlocked", and the rung stays unlocked. It then opens later with no keys entered once the lower levels are unlocked again. `verifying` is also not cleared, so a re-rendered form can show "Verifying keys…" disabled. (b) `runAction` loops over `action.script` with `await sleep(...)`. After a reset it keeps printing SIMULATED lines and "✔ Done" for an action whose rung was just locked again. Both come from the same missing cancellation on reset.

Suggestion: Add a reset generation counter. Capture it before each await in `unlockRung` and in the `runAction` loop, and drop the result or stop when it changed. Also clear `verifying` and `running` in the reset handler.

3. `jsdom` and `test.environment: "jsdom"` are set up but no test needs a DOM (vite.config.ts:5; criticality 15, confidence 90)

`vite.config.ts` sets `test: { environment: "jsdom" }` and `package.json` lists `jsdom` as a dev dependency. The only test, `src/ladder.test.ts`, imports only `./ladder`, and `src/ladder.ts` has no imports and never uses `document` or `window`. No test loads `main.ts`. So every `vitest run` builds a jsdom window for nothing, and the lockfile gets a large dependency tree. `jsdom@30.1.3` also has the strictest Node requirement of all dependencies (`^22.22.2`), which is stricter than vitest's own floor.

Suggestion: Remove `jsdom` from `devDependencies` and drop `environment: "jsdom"` from `vite.config.ts`. If DOM tests come later, set the environment per file with `// @vitest-environment jsdom`.

4. The desktop log panel's `top: 3.5rem` is shorter than the banner when the banner text wraps, so the banner covers the top of the log (src/style.css:268; criticality 15, confidence 60)

`.log-panel` sticks at `top: 3.5rem` (56px) to sit under the sticky `.banner` (`z-index: 5`). On one line the banner is about 52px tall: 2×0.6rem padding, about a 20px line, 2×0.2rem span padding, 4px span border and the 3px bottom border. The banner text in `src/main.ts` (`⚠️ JOKE PROJECT — PLEASE DON'T ACTUALLY USE IT. Nothing here is ever sent to anyone. ⚠️`) is bold with `letter-spacing: 0.02em`, which makes it roughly 850–900px wide, so the inline-block span wraps to two lines at widths up to about 930px. The two-column desktop layout (and this `top: 3.5rem`) applies from 821px up. Between 821px and about 930px the banner is about 72px tall. When the page is scrolled, the banner paints over the top ~16px of the log panel, partly hiding the `Agent activity log` heading. A larger default font or a longer string makes it worse. I estimated the text width; I could not render the page in this read-only session.

Suggestion: Don't hard-code the offset. Let the banner text shrink (`font-size: clamp(...)`), set the offset with a CSS variable that matches a fixed banner height, or give the log panel enough top margin for two lines of banner.

5. `tseslint.config()` is deprecated in the installed typescript-eslint (eslint.config.js:5; criticality 10, confidence 95)

The lockfile pins `typescript-eslint@8.72.1`, and its `node_modules/typescript-eslint/dist/config-helper.d.ts` marks `config()` with `@deprecated ESLint core now provides this functionality via defineConfig(), which we now recommend instead.` The project also uses `eslint@10.13.0`, which ships `defineConfig` from `eslint/config`. A brand-new config is being built on an API its own dependency has already deprecated. It still works today, but editors will strike it through, and a later typescript-eslint major may remove it.

Suggestion: `import { defineConfig } from "eslint/config";` and `export default defineConfig(...)` with the same entries.

6. UI text says keys are not checked and are kept in memory, but they are shape-checked and never kept (src/main.ts:71; criticality 10, confidence 90)

The disclaimer says "The API keys you type are not checked, stored or sent anywhere" (line 71). The form says "It isn't checked or sent anywhere" (line 119). The unlock log says "Keys accepted without checking" (line 208). But `validateKey` rejects empty, spaced and short keys, and shows error messages for them. The hero text says "Keys are kept in memory only" (line 42), yet `unlockRung` reads the values and throws them away: only the rung id goes into `unlocked`. The text contradicts itself and the code. That matters a little in an app whose whole point is honest disclaimers about what happens to keys.

Suggestion: Say what really happens: keys are only checked for shape (8+ characters, no spaces), then discarded, and never stored or sent.

7. The disclaimer can still be dismissed without ticking the checkbox in Chromium (src/main.ts:272; criticality 10, confidence 50)

The dialog blocks Escape with `cancel` + `preventDefault()`. Current Chromium (the CloseWatcher rules) ignores `preventDefault` on `cancel` when there was no user activation since the last one. So pressing Escape twice closes the modal without the acknowledgement, and the ladder is usable. The ack is not saved, so it shows again on reload, but the "must acknowledge" gate is not enforced. I could not check this in a browser here.

Suggestion: Also listen for `close` and call `showModal()` again unless the ack was saved, or show the disclaimer as a non-dialog overlay.

8. `typescript: ^6.0.3` allows versions that `typescript-eslint@8.72.1` doesn't support (package.json:25; criticality 8, confidence 60)

The lockfile shows that `@typescript-eslint/parser@8.72.1` and `@typescript-eslint/utils@8.72.1` declare peer `typescript: '>=4.8.4 <6.1.0'`. The caret range `^6.0.3` accepts TypeScript 6.1 and later. A fresh resolve or a `pnpm update` can therefore pick a TypeScript that typescript-eslint doesn't support, and you get peer warnings and possibly lint breakage. The current lockfile pins 6.0.3, so this doesn't happen today.

Suggestion: Use `~6.0.3` until typescript-eslint supports 6.1.

9. Test name says robocalls and robo-emails come right after first contact, but it only checks they come before social (src/ladder.test.ts:40; criticality 5, confidence 95)

`puts robocalls and robo-emails right after the first contact attempts` only asserts `indexOf("roboemail") < indexOf("social")` and `indexOf("robocall") < indexOf("social")`. Robocall is level 5, after email, robo-emails and SMS. The test would still pass if both moved to level 6 right before social. The name claims more than the test checks.

Suggestion: Rename it, for example 'puts robocalls and robo-emails before the social media rungs', or assert the actual levels.

10. `button:disabled` shows a busy `progress` cursor on the disclaimer button, which is disabled because the box is unchecked, not because anything is running (src/style.css:237; criticality 5, confidence 90)

`button:disabled { cursor: progress; }` fits buttons that are disabled while an action runs (`running.has(...)`, the busy key form). But `#ack-btn` in the disclaimer dialog starts with `disabled` and only turns on once the checkbox is ticked. Before that, pointing at it shows a spinner cursor, which says the app is working when it is really waiting for the user to acknowledge.

Suggestion: Use `cursor: progress` only for buttons that are disabled while busy (for example `.action:disabled` and `.keys .primary:disabled`), and `not-allowed` or the default cursor for the others.

Places outside their files the reviewers suggest checking:
- README.md: It says keys are 'only checked for shape, kept in memory and forgotten on reload', but `main.ts` never keeps them. Make it match whatever wording is chosen for finding 3.
- README.md: It says "Needs Node 20+", but the lockfile's vitest 5.0.5 needs Node `^22.12.0` and jsdom 30.1.3 needs `^22.22.2`, so `pnpm test` will not work on Node 20. Correct the stated Node version, or add an `engines` field to `package.json`.
- package.json: `pnpm-lock.yaml` resolves `typescript@6.0.3`, but the checkout's `node_modules/.pnpm` holds `typescript-eslint@8.72.1_eslint@10.13.0_typescript@7.0.2`. Check whether the installed tree matches the lockfile, and whether `^6.0.3` is the TypeScript version that was meant.
- README.md: "Needs Node 20+" is wrong for the pinned toolchain (`vitest` 5 needs 22.12+, `jsdom` 30 needs 22.22.2+). Update it to whatever minimum `package.json` ends up declaring.
- vite.config.ts: `test: { environment: "jsdom" }` isn't needed, because the only test (`src/ladder.test.ts`) tests pure logic. Drop it together with the `jsdom` dependency.
- package.json: There is no `engines` field, but the locked tools need Node 22.12+ (Vitest 5). Consider adding `"engines": {"node": ">=22.12"}` so a too-old Node is reported at install time.
