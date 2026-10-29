import { expect, test } from "@playwright/test";
import {
  climbTo,
  enter,
  logList,
  runAction,
  showActivity,
} from "./support/app.ts";

const RECON = "Run staff recon (all results invented)";

// Parity row 10: staff recon results are labelled invented.
test("staff recon lines are marked INVENTED and SIMULATED", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await enter(page);
  await climbTo(page, "osint");
  const done = await runAction(page, "recon", RECON);
  await done();

  await showActivity(page);
  const invented = logList(page)
    .getByRole("listitem")
    .filter({ hasText: RECON })
    .filter({ has: page.locator(".mark-invented") });
  // The recon script has four invented lines (packages/shared ladder.ts, inventedLines).
  await expect(invented).toHaveCount(4);
  for (const line of await invented.all())
    await expect(line).toContainText("SIMULATED");
});
