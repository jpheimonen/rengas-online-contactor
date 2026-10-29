/** The real code sender's requests to Resend and Twilio Verify, with `fetch` stubbed. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { SYSTEM_LINES } from "@rengas/shared";
import { ApiProblem } from "../errors.ts";
import { createCodeSender } from "./code-sender.ts";

const twilio = { accountSid: "AC123", authToken: "secret" };
const basicAuth = `Basic ${Buffer.from("AC123:secret").toString("base64")}`;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function stubFetch(...responses: Response[]) {
  const fetch = vi.fn<typeof globalThis.fetch>();
  for (const response of responses) fetch.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const formOf = (init: RequestInit | undefined) =>
  Object.fromEntries(init!.body as URLSearchParams);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("email codes through Resend", () => {
  it("sends the verification email from the configured address", async () => {
    const fetch = stubFetch(json(200, { id: "email_1" }));
    await createCodeSender("onboarding@resend.dev").sendEmailCode(
      { apiKey: "re_key" },
      "jp@example.com",
      "123456",
    );
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init!.headers).toMatchObject({ authorization: "Bearer re_key" });
    expect(JSON.parse(init!.body as string)).toEqual({
      from: "Sisu (Rengas Online Contactor) <onboarding@resend.dev>",
      to: ["jp@example.com"],
      subject: "Your Rengas Online Contactor code: 123456",
      text: expect.stringContaining("Your code is 123456."),
    });
  });

  it("explains Resend's sandbox refusal", async () => {
    stubFetch(json(403, { message: "You can only send testing emails" }));
    const sending = createCodeSender("onboarding@resend.dev").sendEmailCode(
      { apiKey: "re_key" },
      "someone@example.com",
      "123456",
    );
    await expect(sending).rejects.toBeInstanceOf(ApiProblem);
    await expect(sending).rejects.toMatchObject({
      status: 502,
      body: {
        error: "provider-refused",
        message: `✖ Resend refused: ${SYSTEM_LINES.resendNoDomain} Nothing was sent.`,
      },
    });
  });
});

describe("phone codes through Twilio Verify", () => {
  it("creates the Verify service once, then starts and checks codes with it", async () => {
    const fetch = stubFetch(
      json(200, { services: [{ sid: "VA_other", friendly_name: "Other" }] }),
      json(201, { sid: "VA_new" }),
      json(201, { status: "pending" }),
      json(200, { status: "approved" }),
    );
    const sender = createCodeSender("onboarding@resend.dev");
    await sender.startPhoneCode(twilio, "+358401234512");
    const check = await sender.checkPhoneCode(
      twilio,
      "+358401234512",
      "123456",
    );

    expect(check).toBe("approved");
    const calls = fetch.mock.calls.map(([url, init]) => [
      url,
      init!.method,
      init!.body && formOf(init),
    ]);
    expect(calls).toEqual([
      ["https://verify.twilio.com/v2/Services?PageSize=100", "GET", undefined],
      [
        "https://verify.twilio.com/v2/Services",
        "POST",
        { FriendlyName: "Rengas Contactor" },
      ],
      [
        "https://verify.twilio.com/v2/Services/VA_new/Verifications",
        "POST",
        { To: "+358401234512", Channel: "sms" },
      ],
      [
        "https://verify.twilio.com/v2/Services/VA_new/VerificationCheck",
        "POST",
        { To: "+358401234512", Code: "123456" },
      ],
    ]);
    expect(fetch.mock.calls[0]![1]!.headers).toEqual({
      authorization: basicAuth,
    });
  });

  it("reuses an existing service and reads wrong and expired codes", async () => {
    stubFetch(
      json(200, {
        services: [{ sid: "VA_ours", friendly_name: "Rengas Contactor" }],
      }),
      json(200, { status: "pending" }),
      json(404, { code: 20404, message: "Not found" }),
    );
    const sender = createCodeSender("onboarding@resend.dev");
    expect(await sender.checkPhoneCode(twilio, "+358401234512", "1")).toBe(
      "wrong",
    );
    expect(await sender.checkPhoneCode(twilio, "+358401234512", "1")).toBe(
      "expired",
    );
  });

  it("explains a trial account's unverified number", async () => {
    stubFetch(
      json(200, {
        services: [{ sid: "VA_ours", friendly_name: "Rengas Contactor" }],
      }),
      json(400, { code: 21608, message: "The number is unverified." }),
    );
    await expect(
      createCodeSender("onboarding@resend.dev").startPhoneCode(
        twilio,
        "+358401234512",
      ),
    ).rejects.toMatchObject({
      body: {
        message: `✖ Twilio refused: ${SYSTEM_LINES.twilioTrialUnverified} Nothing was sent.`,
      },
    });
  });
});
