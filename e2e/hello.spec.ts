import { expect, test } from "@playwright/test";

test("the built app shows the server status", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Rengas Online Contactor" }),
  ).toBeVisible();
  await expect(page.getByText("Server status: ok")).toBeVisible();
});
