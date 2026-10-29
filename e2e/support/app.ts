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

/** Unlocks the next rung with real keys; the e2e server's fake providers accept them. */
export async function unlockReal(
  page: Page,
  rungId: string,
  keys: Record<string, string>,
) {
  const row = rungRow(page, rungId);
  for (const [label, value] of Object.entries(keys))
    await row.getByLabel(label).fill(value);
  await row.getByRole("button", { name: /^Unlock level/ }).click();
  await expect(row.getByRole("button", { name: /Current/ })).toBeVisible();
}

/** An address no other test uses, so the fake's records can be told apart. */
export const uniqueEmail = () =>
  `op-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
export const uniquePhone = () =>
  `+35840${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

/** The stand-ins dialog, opened from the header. */
export async function openStandIns(page: Page) {
  await page.getByRole("button", { name: /Your stand-ins/ }).click();
  const dialog = page.getByRole("dialog", {
    name: "Your stand-in inbox and phone",
  });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Reads the last email code the fake Resend "sent" to this address. */
export async function emailCode(page: Page, address: string): Promise<string> {
  const response = await page.request.get(
    `/__fake/codes?to=${encodeURIComponent(address)}`,
  );
  const { code } = (await response.json()) as { code: string | null };
  if (!code) throw new Error(`No code was sent to ${address}`);
  return code;
}

/** The fake Twilio Verify accepts this code for any phone. */
export const PHONE_CODE = "246810";

/** Every real send the fake adapters made to this address. */
export async function fakeSends(page: Page, to: string) {
  const response = await page.request.get("/__fake/sends");
  const all = (await response.json()) as {
    channel: string;
    to: string;
    content: Record<string, unknown>;
  }[];
  return all.filter((send) => send.to === to);
}

/** Adds and verifies an inbox or phone through the stand-ins dialog, then closes it. */
export async function verifyStandIn(
  page: Page,
  address: string,
  readEmailCode: (address: string) => Promise<string> | string = (to) =>
    emailCode(page, to),
) {
  const email = !address.startsWith("+");
  const dialog = await openStandIns(page);
  const section = dialog.getByRole("region", {
    name: email ? "Inbox" : "Phone",
  });
  await section
    .getByLabel(email ? "Your email address" : "Your phone number")
    .fill(address);
  await section
    .getByRole("button", {
      name: email ? "Send email code" : "Send phone code",
    })
    .click();
  await expect(section.getByText("Waiting for code")).toBeVisible();
  const code = email ? await readEmailCode(address) : PHONE_CODE;
  await section.getByLabel("Verification code").fill(code);
  await section
    .getByRole("button", { name: email ? "Verify inbox" : "Verify phone" })
    .click();
  await expect(section.getByText(/Verified$/)).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
}
