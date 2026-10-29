import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import {
  RUNGS,
  type ActionId,
  type RungId,
} from "../packages/shared/src/index.ts";
import {
  actionRow,
  enter,
  makeOneUp,
  rungRow,
  runAction,
  uniqueEmail,
  uniquePhone,
  unlockReal,
  verifyStandIn,
} from "./support/app.ts";
import {
  PROVIDER_LOG,
  RECORDING_OPENAI_KEY,
  RECORDING_OUTBOUND_LOG,
} from "./support/paths.ts";

// These journeys run the production server wiring with all three providers
// "available": e2e/support/record-providers.mjs answers their HTTP calls and
// writes each one to PROVIDER_LOG. Register decision
// sisu-writes-on-simulated-rungs: a simulation-only action calls only the
// tool-less OpenAI writer, once, and threat-sms and recon not at all.

interface ProviderCall {
  host: string;
  method: string;
  path: string;
  credential: string;
  tools: boolean;
  body: string;
}

/** Each test signs in with its own keys, so parallel tests can read their own calls. */
function keysFor(page: Page) {
  const id = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const keys = {
    resend: `re_rec_${id}`,
    sid: `AC_rec_${id}`,
    token: `tok_rec_${id}`,
  };
  const mine = new Set([keys.resend, keys.sid, RECORDING_OPENAI_KEY]);
  const calls = (): ProviderCall[] =>
    readFileSync(PROVIDER_LOG, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ProviderCall)
      .filter((call) => mine.has(call.credential));
  /** The code the app emailed to this address, read from the Resend call. */
  const emailCode = (address: string) => {
    const sent = calls()
      .filter(
        (call) =>
          call.path === "/emails" &&
          (JSON.parse(call.body) as { to: string[] }).to[0] === address,
      )
      .at(-1);
    const code = /code: (\d{6})/.exec(sent?.body ?? "")?.[1];
    if (!code) throw new Error(`No code was emailed to ${address}`);
    return code;
  };
  return { keys, calls, emailCode, page };
}

const RESEND = (key: string) => ({ "Resend API key": key });
const TWILIO = (sid: string, token: string) => ({
  "Twilio Account SID": sid,
  "Twilio Auth Token": token,
});

/** The OpenAI key is in the server's environment; the rung offers to use it. */
async function unlockConfigured(page: Page, rungId: string) {
  const row = rungRow(page, rungId);
  await row
    .getByRole("button", { name: "Unlock with the configured key" })
    .click();
  await expect(row.getByRole("button", { name: /Current/ })).toBeVisible();
}

const openPreview = async (page: Page, actionId: string, label: string) => {
  await actionRow(page, actionId).getByRole("button", { name: label }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("REAL · PREVIEW")).toBeVisible();
  return dialog;
};

// The server's OpenAI key is shared, so the two journeys must not overlap.
test.describe.configure({ mode: "serial" });

test.afterEach(() => {
  // Nothing but the recorded providers was ever reached.
  expect(readFileSync(RECORDING_OUTBOUND_LOG, "utf8")).toBe("");
});

test("with every key and a verified inbox and phone, simulation-only actions never reach Resend or Twilio", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const { keys, calls, emailCode } = keysFor(page);
  const messages = () =>
    calls().filter(
      (call) => call.path === "/emails" || call.path.endsWith("/Messages.json"),
    );
  const placed = () =>
    calls().filter((call) => call.path.endsWith("/Calls.json"));
  /** Climbs to the rung with real keys where the rung takes one, and verifies the stand-ins. */
  const climb = async (rungId: RungId) => {
    if (rungId === "email") {
      await unlockReal(page, "email", RESEND(keys.resend));
      await verifyStandIn(page, uniqueEmail(), emailCode);
    } else if (rungId === "sms") {
      await unlockReal(page, "sms", TWILIO(keys.sid, keys.token));
      await verifyStandIn(page, uniquePhone());
    } else if (rungId === "robocall") {
      await unlockConfigured(page, "robocall");
    } else if (rungId !== "polite") {
      await makeOneUp(page, rungId);
    }
  };

  await enter(page);
  let checked = 0;
  let sentBefore = 0;
  for (const rung of RUNGS) {
    await climb(rung.id as RungId);
    // Only the two verification codes have gone out, and no call has been placed.
    if (rung.id === "sms") sentBefore = messages().length;
    for (const action of rung.actions) {
      // Real-capable actions and the finder have their own journeys.
      if (action.mode !== "simulation-only") continue;
      const before = calls().length;
      await (
        await runAction(page, action.id, action.label)
      )();
      const made = calls().slice(before);

      const writes =
        action.id === "threat-sms" || action.id === "recon" ? 0 : 1;
      expect(
        made.map((call) => `${call.host}${call.path}`),
        action.id,
      ).toEqual(Array(writes).fill("api.openai.com/v1/chat/completions"));
      expect(
        made.every((call) => !call.tools),
        action.id,
      ).toBe(true);
      checked += 1;
    }
  }
  expect(checked).toBe(
    RUNGS.flatMap((r) => r.actions).filter((a) => a.mode === "simulation-only")
      .length,
  );
  expect(messages()).toHaveLength(sentBefore);
  expect(placed()).toHaveLength(0);
});

test("email, text and call go only to the verified recipients, after a preview and a confirmation", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const { keys, calls, emailCode } = keysFor(page);
  const sends = (matches: (path: string) => boolean) =>
    calls().filter(
      (call) => call.host !== "api.openai.com" && matches(call.path),
    );
  const emails = () => sends((path) => path === "/emails");
  const texts = () => sends((path) => path.endsWith("/Messages.json"));
  const placed = () => sends((path) => path.endsWith("/Calls.json"));

  await enter(page);
  await unlockReal(page, "email", RESEND(keys.resend));
  const address = uniqueEmail();
  await verifyStandIn(page, address, emailCode);

  const codeMails = emails().length;
  /** Cancelling the preview sends nothing; confirming it sends. Returns once the dialog shows the result. */
  const run = async (
    actionId: ActionId,
    label: string,
    sent: () => ProviderCall[],
  ) => {
    const before = sent().length;
    let dialog = await openPreview(page, actionId, label);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    expect(sent()).toHaveLength(before);

    dialog = await openPreview(page, actionId, label);
    await dialog.getByRole("button", { name: "Send for real" }).click();
    // A call moves on to the live call view instead of showing the dialog's result.
    if (actionId === "ai-call") {
      await expect(
        page.getByRole("region", { name: /Calling your phone/ }),
      ).toBeVisible();
      await expect(dialog).toBeHidden();
    } else {
      await expect(dialog.getByText("REAL · ACCEPTED")).toBeVisible();
      await dialog.getByRole("button", { name: "Close" }).click();
    }
    // The call is placed a moment after its view opens.
    await expect.poll(() => sent().length).toBe(before + 1);
  };

  await run("firm-email", "Send a firmly worded email", emails);
  const [email] = emails().slice(codeMails);
  expect(JSON.parse(email!.body)).toMatchObject({ to: [address] });
  expect(emails()).toHaveLength(codeMails + 1);
  expect(texts()).toHaveLength(0);

  await makeOneUp(page, "roboemail");
  await unlockReal(page, "sms", TWILIO(keys.sid, keys.token));
  const phone = uniquePhone();
  await verifyStandIn(page, phone);
  await run("polite-sms", "Send a polite text", texts);
  expect(new URLSearchParams(texts().at(-1)!.body).get("To")).toBe(phone);
  expect(texts()).toHaveLength(1);

  await unlockConfigured(page, "robocall");
  await run("ai-call", "Place a live AI call", placed);
  expect(placed()).toHaveLength(1);
  expect(new URLSearchParams(placed()[0]!.body).get("To")).toBe(phone);

  // The email, text and call were the only messages out; every OpenAI call was tool-less.
  expect(emails()).toHaveLength(codeMails + 1);
  expect(texts()).toHaveLength(1);
  expect(
    calls()
      .filter((call) => call.host === "api.openai.com")
      .every((call) => !call.tools),
  ).toBe(true);
});
