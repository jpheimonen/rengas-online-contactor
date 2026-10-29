import { expect, test } from "@playwright/test";
import { RUNGS, enter, makeOneUp, staffMood } from "./support/app.ts";

// Parity row 6: the mood label and the level marker follow the current level.
test("the mood meter and theme follow every level", async ({ page }) => {
  await enter(page);
  const meter = page.getByRole("meter", { name: /Level/ });
  for (const rung of RUNGS) {
    if (rung.level > 1) await makeOneUp(page, rung.id);
    await expect(staffMood(page)).toHaveText(rung.staffMood);
    await expect(page.getByTestId("sisu-mood")).toHaveText(rung.sisuMood);
    await expect(meter).toHaveAttribute("aria-valuenow", String(rung.level));
    await expect(page.locator(".app")).toHaveAttribute(
      "data-level",
      String(rung.level),
    );
  }
});
