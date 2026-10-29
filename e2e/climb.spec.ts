import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { SYSTEM_LINES } from "../packages/shared/src/index.ts";
import {
  RUNGS,
  enter,
  logList,
  makeOneUp,
  runAction,
  showActivity,
  showLadder,
} from "./support/app.ts";
import { OUTBOUND_LOG } from "./support/paths.ts";

// Parity row 12: the whole climb with no keys is a simulation and makes no outbound calls.
test("the whole climb with no keys simulates everything and calls nothing outside", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(240_000);
  const foreign: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(baseURL ?? "")) foreign.push(request.url());
  });

  await enter(page);
  let runs = 0;
  for (const rung of RUNGS) {
    if (rung.level > 1) await makeOneUp(page, rung.id);
    const finished = [];
    for (const action of rung.actions) {
      if (action.mode === "finder") continue;
      finished.push(await runAction(page, action.id, action.label));
      runs += 1;
    }
    for (const done of finished) await done();
  }

  await showActivity(page);
  const log = logList(page);
  await expect(
    log.getByRole("listitem").filter({ hasText: SYSTEM_LINES.simulatedDone }),
  ).toHaveCount(runs);
  await expect(log.locator(".mark-real")).toHaveCount(0);
  await showLadder(page);

  expect(foreign).toEqual([]);
  expect(readFileSync(OUTBOUND_LOG, "utf8")).toBe("");
});
