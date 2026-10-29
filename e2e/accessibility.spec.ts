import { expect, test } from "@playwright/test";
import {
  enter,
  expectNoAxeViolations,
  logList,
  rungRow,
  runAction,
  showActivity,
  showLadder,
} from "./support/app.ts";

// Parity row 11: live log newest first, password key fields, labelled meter and ladder.
test("the log, key fields, meter and ladder are accessible", async ({
  page,
}) => {
  await enter(page);
  await expectNoAxeViolations(page);

  await expect(
    page.getByRole("meter", { name: /Level 01 \/ 10/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: /Escalation ladder/ }),
  ).toBeVisible();

  const key = rungRow(page, "email").getByLabel("Resend API key");
  await expect(key).toHaveAttribute("type", "password");
  await expect(key).toHaveAttribute("autocomplete", "off");
  await expect(key).not.toHaveAttribute("aria-invalid");
  await rungRow(page, "email")
    .getByRole("button", { name: "Unlock level 2" })
    .click();
  await expect(key).toHaveAttribute("aria-invalid", "true");
  const describedBy = (await key.getAttribute("aria-describedby")) ?? "";
  await expect(page.locator(`[id="${describedBy.split(" ")[0]}"]`)).toHaveText(
    /Enter a key\./,
  );

  const done = await runAction(
    page,
    "contact-form",
    "Fill in the website contact form",
  );
  await done();

  await showActivity(page);
  const log = logList(page);
  await expect(log).toHaveAttribute("aria-live", "polite");
  // Newest first: the run's closing line sits above its start line.
  const items = log.getByRole("listitem");
  const texts = await items.allTextContents();
  // Every line of the run names its action; the oldest one is where it started.
  const start = texts.findLastIndex((t) =>
    t.includes("Fill in the website contact form"),
  );
  const end = texts.findIndex((t) =>
    t.includes("Done. Nothing was actually sent."),
  );
  expect(end).toBeGreaterThanOrEqual(0);
  expect(end).toBeLessThan(start);
  await expect(items.last()).toContainText("Sisu is ready.");
  await expectNoAxeViolations(page);
  await showLadder(page);
});
