# CI test failures

## Initial release review — 2026-10-30

Reviewed the forge evidence for [PR #2](https://github.com/jpheimonen/rengas-online-contactor/pull/2), head `f176e8e793adfb9be5cb72726eddd39acd878b81`, base `f5b9e78b6090705228c64bb5d42ab46c76ba3edf`:

- `pull_request.read`: draft, open, mergeable, no reviews and empty status check rollup.
- `workflow_runs.list`, limit 100, without a commit filter so earlier attempts are included: empty list.
- `check_runs.list` and `commit_statuses.list` for the head: both empty lists.
- Local [gate results](gate-check-results.md), [gate selection](gate-checks.json), and the accumulated Work, Evaluation and Gates reports supplied to release.

No CI test failures or failed CI checks have been observed in the available evidence. **This does not mean CI passed.** The forge returned no CI runs, so there are no earlier CI attempts, test diagnostics or matching base failures to classify. No failed-test entries have been invented from local reports.

## Local check history, separate from CI

The initial local `taiga static-checks` gate exited 1 with 31 scanner findings. The Gates report says each was reviewed and ignored as a false positive, and the final security check passed. This was a scanner check, not a failed test or a CI attempt. See [gate results](gate-check-results.md) and the Gates contribution in [the release summary](implementation_summary.md).

The evaluator deliberately ran a new call-dialog assertion against the unfixed code and observed failure before fixing it in `469bfb7`. This is local regression-test evidence, not a CI failure. Final local e2e passed after evaluation and again after gates fixes.

Future release rounds must retain diagnosed CI failures here, with test file, full parameterized name, check, commit, attempt URL or ID, error, category and counterfactual, and outcome. Failed checks without test diagnostics belong separately under unclassified checks.

The release screenshot request also exited 1: three browser operations unlocking level 8 timed out at 30 seconds and reset the page to about:blank. Initial desktop and mobile captures succeeded; a blimp capture did not. The helper reported that backend pretend-key unlocks succeeded through level 9. Cause remains unresolved. This is a local browser capture failure, not a CI check or a named failed test, and is not classified as flaky.
