import { createHmac, timingSafeEqual } from "node:crypto";
import { SYSTEM_LINES } from "@rengas/shared";
import type { ProviderCredentials as Credentials } from "../key-checks.ts";
import { providerRefused } from "../recipients/code-sender.ts";

type TwilioCredentials = Credentials["twilio"];

export interface PlaceCall {
  to: string;
  from: string;
  /** The `wss://` address of our media-stream WebSocket for this call. */
  streamUrl: string;
  /** Where Twilio posts the call's status changes. */
  statusUrl: string;
  /** Twilio's own hard limit on the call, a backstop behind the server's hangup. */
  timeLimitSeconds: number;
}

/** The Twilio Voice calls the robocall makes. Tests pass a fake. */
export interface TwilioCalls {
  /** Places the call and returns its call SID. */
  place(credentials: TwilioCredentials, call: PlaceCall): Promise<string>;
  hangUp(credentials: TwilioCredentials, callSid: string): Promise<void>;
  /** Whether the account is a trial, which plays a notice before Sisu connects. */
  isTrial(credentials: TwilioCredentials): Promise<boolean>;
}

/** Twilio's error codes for a trial account dialling or texting a number it hasn't verified. */
const TRIAL_UNVERIFIED = new Set([21219, 21608]);

/** Seconds Twilio lets the phone ring before it reports no answer. */
const RING_SECONDS = 30;

const escapeXml = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );

/** The TwiML that connects the answered call to our media-stream WebSocket. */
export const callTwiml = (streamUrl: string) =>
  `<Response><Connect><Stream url="${escapeXml(streamUrl)}"/></Connect></Response>`;

/** The real Twilio client, over Twilio's REST API. */
export function liveTwilioCalls(): TwilioCalls {
  const request = async (
    { accountSid, authToken }: TwilioCredentials,
    path: string,
    form?: Record<string, string | string[]>,
  ): Promise<Record<string, unknown>> => {
    const body = new URLSearchParams();
    for (const [name, value] of Object.entries(form ?? {})) {
      for (const one of [value].flat()) body.append(name, one);
    }
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}${path}`,
      {
        method: form ? "POST" : "GET",
        headers: {
          authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        ...(form && { body }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const json = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw providerRefused(
        "twilio",
        TRIAL_UNVERIFIED.has(json.code as number)
          ? SYSTEM_LINES.twilioTrialUnverified
          : `${String(json.message ?? `status ${response.status}`)}.`,
      );
    }
    return json;
  };

  return {
    async place(credentials, call) {
      const created = await request(credentials, "/Calls.json", {
        To: call.to,
        From: call.from,
        Twiml: callTwiml(call.streamUrl),
        StatusCallback: call.statusUrl,
        StatusCallbackMethod: "POST",
        StatusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        Timeout: String(RING_SECONDS),
        TimeLimit: String(call.timeLimitSeconds),
      });
      return String(created.sid);
    },
    async hangUp(credentials, callSid) {
      await request(credentials, `/Calls/${callSid}.json`, {
        Status: "completed",
      });
    },
    async isTrial(credentials) {
      const account = await request(credentials, ".json");
      return account.type === "Trial";
    },
  };
}

/**
 * Twilio's request signature: HMAC-SHA1 under the auth token of the full URL
 * followed by each POST parameter's name and value, sorted by name.
 */
export function twilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): string {
  const data = Object.keys(params)
    .sort()
    .reduce((text, name) => text + name + params[name], url);
  return createHmac("sha1", authToken).update(data).digest("base64");
}

export function isValidTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | undefined,
): boolean {
  if (!signature) return false;
  const expected = Buffer.from(twilioSignature(authToken, url, params));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
