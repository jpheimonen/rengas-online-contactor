import { expect, test, type Page } from "@playwright/test";
import { CALL } from "../packages/shared/src/index.ts";
import {
  climbTo,
  enter,
  expectNoAxeViolations,
  rungRow,
} from "./support/app.ts";

// Runs against the fake-provider server (apps/server/src/fake-providers-server.ts):
// every key works, the phone code is 246810 and a placed call plays a script.
const PHONE = "+358401234567";
const SCRIPT = [
  "Hello! This is Sisu, an AI agent from the Rengas Online Contactor demo.",
  "Rengas Online customer service, how can I help?",
  "I'm calling about ticket #48213. Where are my winter tyres?",
];

/** A same-origin JSON request from the page, with its session cookie. */
async function api(page: Page, path: string, body: unknown = {}) {
  return page.evaluate(
    async ([path, body]) => {
      const response = await fetch(`/api${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`${path}: ${response.status} ${text}`);
      return text ? (JSON.parse(text) as Record<string, string>) : {};
    },
    [path, body] as const,
  );
}

/**
 * Climbs to level 5 with real Twilio and OpenAI keys, verifies the phone,
 * then previews and confirms the call. The send preview's own UI is tested
 * elsewhere; this journey starts where the confirmed call begins.
 */
async function placeCall(page: Page) {
  await enter(page);
  await climbTo(page, "roboemail");
  await api(page, "/rungs/sms/unlock", {
    mode: "real",
    keys: { "twilio-sid": "AC12345678", "twilio-token": "token12345678" },
  });
  await api(page, "/rungs/robocall/unlock", {
    mode: "real",
    keys: { openai: "sk-12345678" },
  });
  await expect(
    rungRow(page, "robocall").getByRole("button", { name: /Current/ }),
  ).toBeVisible();
  const { id } = await api(page, "/recipients", {
    channel: "phone",
    address: PHONE,
  });
  await api(page, `/recipients/${id}/verify`, { code: "246810" });
  const { confirmToken } = await api(page, "/sends/preview", {
    actionId: "ai-call",
    recipientId: id,
  });
  await api(page, "/runs", { actionId: "ai-call", confirmToken });
}

test("a confirmed call opens the live call view, streams the transcript and hangs up", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await placeCall(page);

  const view = page.getByRole("region", {
    name: /Calling your phone|Connecting Sisu|Sisu is on the line/,
  });
  await expect(view).toBeVisible();
  await expect(view.getByRole("heading", { level: 2 })).toContainText("REAL");
  await expect(view).toContainText(/\+358 40 •+ 67 · Your verified phone/);
  await expect(
    view.getByText(`${CALL.maxSeconds}-second maximum`).first(),
  ).toBeVisible();

  // Answered: the countdown starts and the transcript reads top to bottom.
  const transcript = view.getByRole("list", { name: "Call transcript" });
  await expect(transcript.getByRole("listitem")).toHaveCount(3, {
    timeout: 20_000,
  });
  await expect(
    view.getByRole("heading", { name: /Sisu is on the line/ }),
  ).toBeVisible();
  await expect(view).toContainText(/0[01]:\d\d left/);
  const lines = await transcript.getByRole("listitem").allTextContents();
  SCRIPT.forEach((text, index) => expect(lines[index]).toContain(text));
  expect(lines[0]).toContain("Sisu");
  expect(lines[1]).toContain("Rengas Online (you)");
  await expect(view.locator('[aria-current="step"]')).toHaveText("In call");
  await expectNoAxeViolations(page);

  // The Hang up button stays on screen, even on a phone.
  const hangUp = view.getByRole("button", { name: "Hang up" });
  await expect(hangUp).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  // Back to ladder keeps the call going, with a strip to return or hang up.
  await view.getByRole("button", { name: "← Back to ladder" }).click();
  const strip = page.getByRole("region", { name: "Live call" });
  await expect(strip).toBeVisible();
  await expect(strip).toContainText("left");
  await strip.getByRole("button", { name: "View call" }).click();
  await expect(transcript).toBeVisible();

  await view.getByRole("button", { name: "Hang up" }).click();
  const ended = page.getByRole("region", { name: /Call ended/ });
  await expect(ended).toBeVisible();
  await expect(ended).toContainText(CALL.youHungUp);
  await expect(
    ended
      .getByRole("list", { name: "Call transcript" })
      .getByRole("listitem")
      .first(),
  ).toContainText(SCRIPT[0]!);
  await expect(ended.getByRole("button", { name: "Hang up" })).toHaveCount(0);

  await ended.getByRole("button", { name: "← Back to ladder" }).click();
  await expect(page.getByRole("region", { name: "Live call" })).toHaveCount(0);
  await expect(rungRow(page, "robocall")).toBeVisible();
});

test("De-escalate hangs up a live call from the ladder", async ({ page }) => {
  test.setTimeout(120_000);
  await placeCall(page);
  const view = page.getByRole("region", {
    name: /Calling your phone|Connecting Sisu|Sisu is on the line/,
  });
  await view.getByRole("button", { name: "← Back to ladder" }).click();
  await expect(page.getByRole("region", { name: "Live call" })).toBeVisible();

  await page.getByRole("button", { name: "😇 De-escalate" }).click();
  await expect(page.getByRole("region", { name: "Live call" })).toHaveCount(0);
  await expect(
    rungRow(page, "robocall").getByRole("button", { name: /Current/ }),
  ).toHaveCount(0);
});
