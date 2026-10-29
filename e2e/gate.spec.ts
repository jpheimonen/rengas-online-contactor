import { expect, test } from "@playwright/test";
import {
  BANNER,
  DISCLAIMER_GATE,
  FOOTER,
} from "../packages/shared/src/index.ts";
import { enter, expectNoAxeViolations } from "./support/app.ts";

// Parity row 8: the disclaimer gate.
test("the gate stays until the box is ticked, and the acknowledgement lasts for the tab", async ({
  page,
}) => {
  await page.goto("/");
  const gate = page.getByRole("dialog", { name: DISCLAIMER_GATE.title });
  await expect(gate).toBeVisible();
  await expect(
    gate.getByRole("heading", { name: DISCLAIMER_GATE.title }),
  ).toBeFocused();
  await expectNoAxeViolations(page);

  const enterButton = gate.getByRole("button", {
    name: DISCLAIMER_GATE.button,
  });
  await expect(enterButton).toBeDisabled();

  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(gate).toBeVisible();

  // Force-closed before acknowledgement: it opens again.
  await page.evaluate(() => document.querySelector("dialog")?.close());
  await expect(gate).toBeVisible();

  await gate.getByRole("checkbox", { name: DISCLAIMER_GATE.checkbox }).check();
  await enterButton.click();
  await expect(gate).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Escalating, respectfully." }),
  ).toBeFocused();

  await page.reload();
  await expect(
    page.getByRole("button", { name: /Polite Customer Inquiry/ }),
  ).toBeVisible();
  await expect(gate).toBeHidden();
});

// Parity row 10: disclaimers in the banner, the modal and the footer.
test("the disclaimers are in the banner, the gate and the footer", async ({
  page,
}) => {
  await page.goto("/");
  const gate = page.getByRole("dialog");
  await expect(gate).toContainText(DISCLAIMER_GATE.text);
  for (const point of DISCLAIMER_GATE.points)
    await expect(gate).toContainText(point);
  await enter(page);
  await expect(
    page.getByRole("alert").filter({ hasText: BANNER }),
  ).toBeVisible();
  await expect(page.getByRole("contentinfo")).toHaveText(FOOTER);
});
