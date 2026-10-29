import { expect, test } from "@playwright/test";
import { SYSTEM_LINES } from "../packages/shared/src/index.ts";
import {
  actionRow,
  enter,
  expectNoAxeViolations,
  logList,
  rungRow,
  runAction,
  showActivity,
  showLadder,
} from "./support/app.ts";

// Parity row 5: a simulated run, two actions side by side, typing kept.
test("simulated runs stream SIMULATED lines, run side by side and keep typed keys", async ({
  page,
}) => {
  await enter(page);
  const keyInput = rungRow(page, "email").getByLabel("Resend API key");

  const formDone = await runAction(
    page,
    "contact-form",
    "Fill in the website contact form",
  );
  const callDone = await runAction(
    page,
    "call-cs",
    "Call the customer service number",
  );
  // The same action can't be started twice while it runs.
  await expect(
    actionRow(page, "contact-form").getByRole("button"),
  ).toBeDisabled();

  await keyInput.fill("re_typed_while_running");
  await formDone();
  await callDone();
  await expect(keyInput).toHaveValue("re_typed_while_running");

  await showActivity(page);
  const log = logList(page);
  const formLines = log
    .getByRole("listitem")
    .filter({ hasText: "Fill in the website contact form" });
  await expect(
    formLines.filter({ hasText: SYSTEM_LINES.simulatedDone }),
  ).toHaveCount(1);
  await expect(
    log
      .getByRole("listitem")
      .filter({ hasText: "Call the customer service number" })
      .filter({ hasText: SYSTEM_LINES.simulatedDone }),
  ).toHaveCount(1);
  for (const line of await formLines.all())
    await expect(line).toContainText("SIMULATED");
  await expect(log.locator(".mark-real")).toHaveCount(0);
  await expectNoAxeViolations(page);
  await showLadder(page);
});
