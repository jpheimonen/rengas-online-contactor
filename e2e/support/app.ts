import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { RUNGS } from "../../packages/shared/src/index.ts";

export { RUNGS };

export const isMobile = (page: Page) =>
  (page.viewportSize()?.width ?? 0) < 1024;

export const rungRow = (page: Page, id: string) => page.locator(`#rung-${id}`);

export const actionRow = (page: Page, actionId: string) =>
  page.locator(`li.action[data-action="${actionId}"]`);

export const logList = (page: Page) =>
  page.getByRole("list", { name: "Activity log" });

export const staffMood = (page: Page) => page.getByTestId("staff-mood");

/** Opens the app and accepts the disclaimer. */
export async function enter(page: Page) {
  await page.goto("/");
  const gate = page.getByRole("dialog");
  await gate.getByRole("checkbox").check();
  await gate.getByRole("button", { name: "Enter the ladder" }).click();
  await expect(gate).toBeHidden();
  await expect(rungRow(page, "polite")).toBeVisible();
}

/** On small screens the log and the ladder are separate tabs. */
export async function showActivity(page: Page) {
  if (isMobile(page)) await page.getByRole("tab", { name: /Activity/ }).click();
  await expect(logList(page)).toBeVisible();
}

export async function showLadder(page: Page) {
  if (isMobile(page)) await page.getByRole("tab", { name: "Ladder" }).click();
}

/** Unlocks the next rung with "Make one up" and waits until it is the current rung. */
export async function makeOneUp(page: Page, rungId: string) {
  const row = rungRow(page, rungId);
  await row.getByRole("button", { name: "🎲 Make one up" }).click();
  await expect(row.getByRole("button", { name: /Current/ })).toBeVisible();
}

/** Unlocks every rung up to and including `rungId`. */
export async function climbTo(page: Page, rungId: string) {
  const target = RUNGS.findIndex((r) => r.id === rungId);
  for (const rung of RUNGS.slice(1, target + 1)) await makeOneUp(page, rung.id);
}

/** Runs an action and waits for its button to come back. */
export async function runAction(page: Page, actionId: string, label: string) {
  const row = actionRow(page, actionId);
  await row.getByRole("button", { name: label }).click();
  await expect(row.getByRole("button", { name: "Running…" })).toBeDisabled();
  return async () =>
    expect(row.getByRole("button", { name: label })).toBeEnabled({
      timeout: 20_000,
    });
}

export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    ),
  ).toEqual([]);
}
