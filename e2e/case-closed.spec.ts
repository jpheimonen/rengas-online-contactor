import { expect, test, type Page } from "@playwright/test";
import {
  climbTo,
  enter,
  expectNoAxeViolations,
  rungRow,
  runAction,
} from "./support/app.ts";

const TAKE_THE_JOB = "Take a job in their customer service";

/** Climbs to the top and lets Sisu answer its own ticket. */
async function closeTheCase(page: Page) {
  await enter(page);
  await climbTo(page, "singularity");
  await runAction(page, "take-the-job", TAKE_THE_JOB);
  const report = page.getByRole("dialog", { name: "Ticket #48213: CLOSED" });
  await expect(report).toBeVisible({ timeout: 20_000 });
  return report;
}

test("Case closed sums up the climb and closes with Escape", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const report = await closeTheCase(page);
  await expect(report).toContainText(
    "None. Everything this time was simulated.",
  );
  await expect(report).toContainText(TAKE_THE_JOB);
  await expect(report).toContainText(
    "Replies from Rengas Online: 0. Replies from Sisu: 1.",
  );
  await expect(report.locator(".mark-real")).toHaveCount(0);
  await expectNoAxeViolations(page);

  await page.keyboard.press("Escape");
  await expect(report).toBeHidden();
  await expect(
    rungRow(page, "singularity").getByRole("button", { name: /Current/ }),
  ).toBeVisible();
});

test("De-escalate and start over goes back to level 1 and keeps the ticket", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const report = await closeTheCase(page);
  await report
    .getByRole("button", { name: "😇 De-escalate and start over" })
    .click();
  await expect(report).toBeHidden();
  await expect(
    rungRow(page, "singularity").getByRole("button", { name: /Current/ }),
  ).toHaveCount(0);
  await expect(
    page.getByText("#48213 · Where are my winter tyres?"),
  ).toBeVisible();
});
