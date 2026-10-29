# CI test failures

Initial release review: 2026-10-29. Head: `a138014384f2cbba1909f4d53175a81a3c873bed`; base: `82e490b6b6388e66fef0fabbdd60edaee551ff9b`.

Reviewed the available forge evidence for [PR #1](https://github.com/jpheimonen/rengas-online-contactor/pull/1): `pull_request.read`, `workflow_runs.list` (up to 50 recent runs, without a commit filter so earlier attempts are included), `check_runs.list`, and `commit_statuses.list`. The PR's status rollup, workflow list, check runs and commit statuses were all empty. No earlier failed CI attempts were available in this evidence.

No CI test failures have been observed. This does **not** establish that CI passed or ran. There are no failed tests to categorize, matching base failures to compare, or unclassified CI checks to record yet.

Also reviewed the accumulated Gates report and [gate-check-results.md](gate-check-results.md). Those describe local verification, including an initial static security scan failure for DevSkim DS162092 and its subsequent false-positive disposition. That was a local scanner finding, not a failed CI test. The Gates report records nine passing local tests on the final commit.

Future diagnosed failures will retain one entry per test and distinct cause, with file, full parameterized name, check, commit, attempt link, error, category and counterfactual reason, outcome, and matching base evidence where available. Failures before test execution or missing diagnostics will be kept separately as unclassified checks.
