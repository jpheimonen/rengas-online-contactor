import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SYSTEM_LINES } from "@rengas/shared";
import {
  callTwiml,
  isValidTwilioSignature,
  liveTwilioCalls,
  twilioSignature,
} from "./twilio.ts";

const credentials = { accountSid: "AC123", authToken: "secret" };

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body: Record<string, unknown>) {
  const fetch = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("the Twilio call client", () => {
  it("places the call with TwiML that opens our media stream, the status callback and a time limit", async () => {
    const fetch = stubFetch(201, { sid: "CA9" });
    const sid = await liveTwilioCalls().place(credentials, {
      to: "+358401234567",
      from: "+15005550006",
      streamUrl: "wss://calls.example.test/twilio/media/tok",
      statusUrl: "https://calls.example.test/twilio/status/tok",
      timeLimitSeconds: 105,
    });

    expect(sid).toBe("CA9");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://api.twilio.com/2010-04-01/Accounts/AC123/Calls.json",
    );
    expect(new Headers(init.headers).get("authorization")).toBe(
      `Basic ${Buffer.from("AC123:secret").toString("base64")}`,
    );
    const form = init.body as URLSearchParams;
    expect(form.get("Twiml")).toBe(
      '<Response><Connect><Stream url="wss://calls.example.test/twilio/media/tok"/></Connect></Response>',
    );
    expect(form.getAll("StatusCallbackEvent")).toEqual([
      "initiated",
      "ringing",
      "answered",
      "completed",
    ]);
    expect(form.get("TimeLimit")).toBe("105");
    expect(form.get("To")).toBe("+358401234567");
  });

  it("hangs up by setting the call's status to completed", async () => {
    const fetch = stubFetch(200, { sid: "CA9" });
    await liveTwilioCalls().hangUp(credentials, "CA9");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/Accounts\/AC123\/Calls\/CA9\.json$/);
    expect((init.body as URLSearchParams).get("Status")).toBe("completed");
  });

  it("explains a trial account calling a number it hasn't verified", async () => {
    stubFetch(400, { code: 21219, message: "not verified" });
    await expect(
      liveTwilioCalls().place(credentials, {
        to: "+358401234567",
        from: "+15005550006",
        streamUrl: "wss://x/twilio/media/t",
        statusUrl: "https://x/twilio/status/t",
        timeLimitSeconds: 105,
      }),
    ).rejects.toMatchObject({
      body: {
        message: expect.stringContaining(SYSTEM_LINES.twilioTrialUnverified),
      },
    });
  });

  it("reads whether the account is a trial", async () => {
    stubFetch(200, { type: "Trial" });
    expect(await liveTwilioCalls().isTrial(credentials)).toBe(true);
    stubFetch(200, { type: "Full" });
    expect(await liveTwilioCalls().isTrial(credentials)).toBe(false);
  });

  it("escapes the stream address in the TwiML", () => {
    expect(callTwiml('wss://x/a?b=1&c="2"')).toContain(
      'url="wss://x/a?b=1&amp;c=&quot;2&quot;"',
    );
  });
});

describe("Twilio's request signature", () => {
  const url = "https://calls.example.test/twilio/status/tok";
  const params = { CallStatus: "ringing", CallSid: "CA9" };

  it("is HMAC-SHA1 of the URL and the sorted parameters", () => {
    const expected = createHmac("sha1", "secret")
      .update(`${url}CallSidCA9CallStatusringing`)
      .digest("base64");
    expect(twilioSignature("secret", url, params)).toBe(expected);
  });

  it("accepts only a signature over the same token, URL and parameters", () => {
    const signature = twilioSignature("secret", url, params);
    expect(isValidTwilioSignature("secret", url, params, signature)).toBe(true);
    expect(isValidTwilioSignature("other", url, params, signature)).toBe(false);
    expect(isValidTwilioSignature("secret", `${url}x`, params, signature)).toBe(
      false,
    );
    expect(
      isValidTwilioSignature(
        "secret",
        url,
        { ...params, CallStatus: "completed" },
        signature,
      ),
    ).toBe(false);
    expect(isValidTwilioSignature("secret", url, params, undefined)).toBe(
      false,
    );
  });
});
