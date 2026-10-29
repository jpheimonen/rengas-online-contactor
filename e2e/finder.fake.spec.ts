import { expect, test } from "@playwright/test";
import {
  actionRow,
  climbTo,
  enter,
  expectNoAxeViolations,
  logList,
  showActivity,
} from "./support/app.ts";

// Runs against the fake-provider server, whose finder returns two made-up web results.
test("web results link to their source in a new tab and only simulate hiring", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await enter(page);
  await climbTo(page, "rent-a-human");

  const row = actionRow(page, "find-humans");
  await expect(row.locator(".mark-webSearch")).toBeVisible();
  await row.getByRole("button", { name: "Find humans for hire" }).click();
  await expect(row.getByRole("status")).toContainText(
    "Found 2 options. Sisu read about them and contacted none of them.",
  );
  const cards = row.getByRole("article");
  await expect(cards).toHaveCount(2);

  const first = cards.filter({ hasText: "Fake Errand Platform" });
  await expect(first).toContainText(
    "Found on the web · not contacted · not booked",
  );
  await expect(first).toContainText("Price not stated");
  const link = first.getByRole("link", {
    name: "View source www.fake-result.test (opens in a new tab)",
  });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(cards.filter({ hasText: "Fake Sign Holders" })).toContainText(
    "€120 an hour",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expectNoAxeViolations(page);

  await first.getByRole("button", { name: "Simulate hiring" }).click();
  await showActivity(page);
  const line = logList(page).getByRole("listitem").filter({
    hasText:
      "Pretending to post a gig on Fake Errand Platform. Nothing is posted.",
  });
  await expect(line).toHaveCount(1, { timeout: 20_000 });
  await expect(line).toContainText("SIMULATED");
});
