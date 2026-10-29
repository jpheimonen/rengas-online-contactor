import { expect, test } from "@playwright/test";
import { SYSTEM_LINES } from "../packages/shared/src/index.ts";
import {
  climbTo,
  enter,
  isMobile,
  logList,
  rungRow,
  runAction,
  showActivity,
  staffMood,
} from "./support/app.ts";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const record = { cancelled: 0 };
    Object.assign(window, { __speech: record });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { speak: () => {}, cancel: () => (record.cancelled += 1) },
    });
  });
});

// Parity row 7: De-escalate cancels runs with no late lines, relocks, stops speech and keeps the log.
test("De-escalate cancels a run with no late lines and keeps the log", async ({
  page,
}) => {
  await enter(page);
  await climbTo(page, "roboemail");
  await runAction(page, "email-storm", "Launch the email storm");

  await page.getByRole("button", { name: "😇 De-escalate" }).click();
  await expect(staffMood(page)).toHaveText("Calm");
  await expect(
    rungRow(page, "email").getByRole("button", { name: /Next/ }),
  ).toBeVisible();
  // On small screens the relocked rungs wait behind the higher-rungs disclosure.
  if (isMobile(page)) {
    await page.getByRole("button", { name: "8 higher rungs · Show" }).click();
  }
  await expect(
    rungRow(page, "roboemail").getByRole("button", { name: /Locked/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __speech: { cancelled: number } }).__speech
          .cancelled,
    ),
  ).toBeGreaterThan(0);

  await showActivity(page);
  const log = logList(page);
  await expect(log).toContainText(SYSTEM_LINES.cancelled);
  await expect(log).toContainText(SYSTEM_LINES.deEscalated);
  // The log is kept: the first line of the session is still there.
  await expect(log).toContainText("Sisu is ready.");

  const stormLines = log
    .getByRole("listitem")
    .filter({ hasText: "Launch the email storm" });
  const count = await stormLines.count();
  await page.waitForTimeout(2_000);
  await expect(stormLines).toHaveCount(count);
  await expect(log.getByRole("listitem").first()).toContainText(
    SYSTEM_LINES.deEscalatedSisu,
  );
});
