import { expect, test } from "@playwright/test";
import { UNLOCK_COPY } from "../packages/shared/src/index.ts";
import {
  enter,
  expectNoAxeViolations,
  logList,
  makeOneUp,
  rungRow,
  showActivity,
  showLadder,
} from "./support/app.ts";

// Parity rows 3 and 4: key errors, then "Verifying keys…" and the rung opens.
test("a key form shows shape errors, verifies, opens the rung and logs it", async ({
  page,
}) => {
  await enter(page);
  await makeOneUp(page, "email");

  const row = rungRow(page, "roboemail");
  const input = row.getByLabel("Bulk mailing API key");
  const submit = row.getByRole("button", { name: "Unlock level 3" });
  await expect(input).toHaveAttribute("type", "password");
  await expect(input).toHaveAttribute("autocomplete", "off");

  await submit.click();
  await expect(row.getByText("Enter a key.")).toBeVisible();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toBeFocused();
  await expectNoAxeViolations(page);

  await input.fill("has a space");
  await submit.click();
  await expect(row.getByText("Keys don't have spaces in them.")).toBeVisible();

  await input.fill("short");
  await submit.click();
  await expect(
    row.getByText("Keys are at least 8 characters long."),
  ).toBeVisible();

  // Hold the request so the verifying state can be seen.
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/rungs/*/unlock", async (route) => {
    await held;
    await route.continue();
  });
  await input.fill("mk-a-perfectly-fine-key");
  await submit.click();
  await expect(
    row.getByRole("button", { name: UNLOCK_COPY.verifying }),
  ).toBeDisabled();
  await expect(input).toBeDisabled();
  release();

  await expect(row.getByRole("button", { name: /Current/ })).toBeVisible();
  await expect(row).toBeInViewport();
  await expect(
    row.getByRole("button", { name: "Launch the email storm" }),
  ).toBeVisible();

  await showActivity(page);
  await expect(logList(page).getByRole("listitem").first()).toBeVisible();
  await expect(logList(page)).toContainText(
    '🔓 Level 3 "Robo-Emails" unlocked',
  );
  await showLadder(page);
});

// The e2e server's fake Resend refuses any key containing "refused".
test("a real key the provider refuses shows the reason and the rung stays locked", async ({
  page,
}) => {
  await enter(page);
  const row = rungRow(page, "email");
  await row.getByLabel("Resend API key").fill("re_refused_key_123");
  await row.getByRole("button", { name: "Unlock level 2" }).click();
  await expect(row.locator(".field-error")).toHaveText(
    /Resend says this key isn't valid\./,
  );
  await expect(row.getByRole("button", { name: /Next/ })).toBeVisible();
});
