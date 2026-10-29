import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { SYSTEM_LINES } from "../packages/shared/src/index.ts";
import {
  actionRow,
  emailCode,
  enter,
  expectNoAxeViolations,
  fakeSends,
  logList,
  makeOneUp,
  openStandIns,
  rungRow,
  showActivity,
  showLadder,
  uniqueEmail,
  uniquePhone,
  unlockReal,
  verifyStandIn,
} from "./support/app.ts";
import { OUTBOUND_LOG } from "./support/paths.ts";

// These journeys run against the e2e server's fake providers: key checks,
// verification codes and real sends never leave the machine.

const RESEND = { "Resend API key": "re_e2e_fake_key_1234" };
const TWILIO = {
  "Twilio Account SID": "AC_e2e_fake_sid_9f3e",
  "Twilio Auth Token": "e2e_fake_token_5678",
};

const outbound = () => {
  try {
    return readFileSync(OUTBOUND_LOG, "utf8").trim();
  } catch {
    return "";
  }
};

test.afterEach(() => {
  expect(outbound()).toBe("");
});

/** Opens the action's preview and returns the dialog. */
async function openPreview(page: Page, actionId: string, label: string) {
  await actionRow(page, actionId).getByRole("button", { name: label }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("REAL · PREVIEW")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Send for real" }),
  ).toBeEnabled();
  return dialog;
}

test("a real key shows its masked hint; a stand-in inbox is verified by code", async ({
  page,
}) => {
  await enter(page);
  await unlockReal(page, "email", RESEND);
  const email = rungRow(page, "email");
  await expect(email).toContainText("Resend key accepted");
  await expect(email).toContainText("re_…1234");
  await expect(email).not.toContainText("re_e2e_fake_key_1234");

  // Without a verified inbox the real-capable action simulates and says why.
  const action = actionRow(page, "firm-email");
  await expect(action).toContainText("Simulating: no verified inbox.");
  await expect(action.locator(".mark-simulated")).toBeVisible();
  await action
    .getByRole("button", { name: "Verify an inbox to send this for real" })
    .click();

  const dialog = page.getByRole("dialog", {
    name: "Your stand-in inbox and phone",
  });
  const inbox = dialog.getByRole("region", { name: "Inbox" });
  const address = uniqueEmail();
  await inbox.getByLabel("Your email address").fill(address);
  await inbox.getByRole("button", { name: "Send email code" }).click();
  await expect(inbox.getByText("Waiting for code")).toBeVisible();
  await expect(inbox).toContainText("•••@example.com");

  // A wrong code keeps the address and says how many tries are left.
  const code = await emailCode(page, address);
  const wrong = code === "000000" ? "111111" : "000000";
  await inbox.getByLabel("Verification code").fill(wrong);
  await inbox.getByRole("button", { name: "Verify inbox" }).click();
  await expect(inbox.getByLabel("Verification code")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(inbox).toContainText("That code isn't right. 4 tries left.");

  // Pasted codes with spaces still work.
  await inbox
    .getByLabel("Verification code")
    .fill(`${code.slice(0, 3)} ${code.slice(3)}`);
  await inbox.getByRole("button", { name: "Verify inbox" }).click();
  await expect(inbox.getByText(/Verified$/)).toBeVisible();
  await expectNoAxeViolations(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Now the action is REAL and names the masked inbox.
  await expect(action.locator(".mark-real")).toContainText("REAL →");
  await expect(action).toContainText("Opens a preview first.");

  // Removing the inbox makes it simulate again.
  const again = await openStandIns(page);
  await again.getByRole("button", { name: "Remove inbox" }).click();
  await expect(
    again.getByRole("button", { name: "Send email code" }),
  ).toBeVisible();
  await again.getByRole("button", { name: "Close" }).click();
  await expect(action).toContainText("Simulating: no verified inbox.");
});

test("an email is previewed, confirmed and sent for real to the verified inbox only", async ({
  page,
}) => {
  await enter(page);
  await unlockReal(page, "email", RESEND);
  const address = uniqueEmail();
  await verifyStandIn(page, address);

  // Cancel sends nothing.
  let dialog = await openPreview(
    page,
    "firm-email",
    "Send a firmly worded email",
  );
  await expect(dialog).toContainText("Nothing sent yet.");
  await expect(dialog).toContainText(
    "Ticket #48213: a firm but friendly follow-up",
  );
  await expect(dialog).toContainText("2 of 2 emails left this hour");
  await expectNoAxeViolations(page);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  expect(await fakeSends(page, address)).toEqual([]);

  // Send for real is the confirmation.
  dialog = await openPreview(page, "firm-email", "Send a firmly worded email");
  const subject = await dialog.locator(".preview-box").first().textContent();
  await dialog.getByRole("button", { name: "Send for real" }).click();
  await expect(dialog.getByText("REAL · ACCEPTED")).toBeVisible();
  await expect(dialog).toContainText("Provider accepted · REAL");
  const sends = await fakeSends(page, address);
  expect(sends).toHaveLength(1);
  expect(sends[0]?.channel).toBe("email");
  expect(sends[0]?.content.subject).toBe(subject);

  await dialog
    .getByRole("button", { name: /Follow delivery in Activity/ })
    .click();
  await expect(dialog).toBeHidden();
  await showActivity(page);
  const lines = logList(page)
    .getByRole("listitem")
    .filter({ hasText: "Send a firmly worded email" });
  await expect(
    logList(page)
      .getByRole("listitem")
      .filter({ hasText: SYSTEM_LINES.realDone }),
  ).toHaveCount(1);
  for (const line of await lines.all())
    await expect(line.locator(".mark-real")).toBeVisible();
  await showLadder(page);

  // The limit shown in the preview went down.
  dialog = await openPreview(page, "firm-email", "Send a firmly worded email");
  await expect(dialog).toContainText("1 of 2 emails left this hour");
  await dialog.getByRole("button", { name: "Close preview" }).click();
});

test("Simulate instead runs the simulation and sends nothing", async ({
  page,
}) => {
  await enter(page);
  await unlockReal(page, "email", RESEND);
  const address = uniqueEmail();
  await verifyStandIn(page, address);

  const dialog = await openPreview(
    page,
    "firm-email",
    "Send a firmly worded email",
  );
  await dialog.getByRole("button", { name: "Simulate instead" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    actionRow(page, "firm-email").getByRole("button", {
      name: "Send a firmly worded email",
    }),
  ).toBeEnabled({ timeout: 20_000 });

  await showActivity(page);
  const log = logList(page);
  await expect(log).toContainText("Simulating: you chose Simulate instead.");
  await expect(
    log.getByRole("listitem").filter({ hasText: SYSTEM_LINES.simulatedDone }),
  ).toHaveCount(1);
  await expect(log.locator(".mark-real")).toHaveCount(0);
  expect(await fakeSends(page, address)).toEqual([]);
});

test("once the hourly limit is used up, the action simulates and says so", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await enter(page);
  await unlockReal(page, "email", RESEND);
  const address = uniqueEmail();
  await verifyStandIn(page, address);

  const label = "Send a firmly worded email";
  for (let sent = 0; sent < 2; sent++) {
    const dialog = await openPreview(page, "firm-email", label);
    await dialog.getByRole("button", { name: "Send for real" }).click();
    await expect(dialog.getByText("REAL · ACCEPTED")).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(
      actionRow(page, "firm-email").getByRole("button", { name: label }),
    ).toBeEnabled({ timeout: 20_000 });
  }
  const action = actionRow(page, "firm-email");
  await expect(action).toContainText(
    "Simulating: this hour's limit is used up. 2 of 2 emails used this hour.",
  );
  await expect(action.locator(".mark-simulated")).toBeVisible();
  expect(await fakeSends(page, address)).toHaveLength(2);
});

test("a verified phone receives a real text after its preview", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await enter(page);
  await unlockReal(page, "email", RESEND);
  await makeOneUp(page, "roboemail");
  await unlockReal(page, "sms", TWILIO);
  await expect(rungRow(page, "sms")).toContainText("…9f3e");

  const phone = uniquePhone();
  await verifyStandIn(page, phone);
  const dialog = await openPreview(page, "polite-sms", "Send a polite text");
  await expect(dialog).toContainText("Review the real SMS");
  await expect(dialog).not.toContainText(phone);
  await expect(dialog.getByRole("button", { name: "Rewrite" })).toBeVisible();
  await dialog.getByRole("button", { name: "Send for real" }).click();
  await expect(dialog.getByText("REAL · ACCEPTED")).toBeVisible();

  const sends = await fakeSends(page, phone);
  expect(sends).toHaveLength(1);
  expect(sends[0]?.channel).toBe("sms");
});
