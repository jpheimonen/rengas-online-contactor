import {
  EMAIL,
  PROVIDER_NAMES,
  SYSTEM_LINES,
  VERIFICATION_EMAIL,
  VERIFY_SERVICE_NAME,
  type Provider,
} from "@rengas/shared";
import { problem } from "../errors.ts";
import type { Credentials } from "../keys.ts";

export type PhoneCheck = "approved" | "wrong" | "expired";

/**
 * Sends and checks the codes that prove a recipient belongs to the operator.
 * Email codes are ours, sent with Resend; Twilio Verify makes, sends and
 * checks phone codes. Tests pass a fake.
 */
export interface CodeSender {
  sendEmailCode(
    credentials: Credentials["resend"],
    to: string,
    code: string,
  ): Promise<void>;
  startPhoneCode(credentials: Credentials["twilio"], to: string): Promise<void>;
  checkPhoneCode(
    credentials: Credentials["twilio"],
    to: string,
    code: string,
  ): Promise<PhoneCheck>;
}

/** Refuses with the provider's reason, worded like the log's provider-refused line. */
export const providerRefused = (provider: Provider, reason: string) =>
  problem(
    502,
    "provider-refused",
    SYSTEM_LINES.providerRefused
      .replace("{provider}", PROVIDER_NAMES[provider])
      .replace("{reason}", reason),
  );

const RESEND_EMAILS = "https://api.resend.com/emails";
const VERIFY = "https://verify.twilio.com/v2";

/** Twilio's error code for a trial account sending to a number it hasn't verified. */
const TWILIO_TRIAL_UNVERIFIED = 21608;

/** The real code sender. `from` is the Resend sender address. */
export function createCodeSender(from: string): CodeSender {
  // Verify service SIDs by account, found or created once per process.
  const services = new Map<string, Promise<string>>();

  const twilio = async (
    { accountSid, authToken }: Credentials["twilio"],
    path: string,
    form?: Record<string, string>,
  ): Promise<{ status: number; body: Record<string, unknown> }> => {
    const response = await fetch(`${VERIFY}${path}`, {
      method: form ? "POST" : "GET",
      headers: {
        authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      ...(form && { body: new URLSearchParams(form) }),
    });
    const body = (await response.json()) as Record<string, unknown>;
    return { status: response.status, body };
  };

  const twilioRefused = (body: Record<string, unknown>) =>
    providerRefused(
      "twilio",
      body.code === TWILIO_TRIAL_UNVERIFIED
        ? SYSTEM_LINES.twilioTrialUnverified
        : `${String(body.message ?? "unknown error")}.`,
    );

  const verifyService = (credentials: Credentials["twilio"]) => {
    let sid = services.get(credentials.accountSid);
    if (!sid) {
      sid = (async () => {
        const list = await twilio(credentials, "/Services?PageSize=100");
        if (list.status !== 200) throw twilioRefused(list.body);
        const found = (
          list.body.services as { sid: string; friendly_name: string }[]
        ).find((service) => service.friendly_name === VERIFY_SERVICE_NAME);
        if (found) return found.sid;
        const created = await twilio(credentials, "/Services", {
          FriendlyName: VERIFY_SERVICE_NAME,
        });
        if (created.status !== 201) throw twilioRefused(created.body);
        return created.body.sid as string;
      })();
      // A failed lookup is tried again next time.
      sid.catch(() => services.delete(credentials.accountSid));
      services.set(credentials.accountSid, sid);
    }
    return sid;
  };

  return {
    async sendEmailCode({ apiKey }, to, code) {
      const response = await fetch(RESEND_EMAILS, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: `${EMAIL.fromName} <${from}>`,
          to: [to],
          subject: VERIFICATION_EMAIL.subject.replace("{code}", code),
          text: VERIFICATION_EMAIL.body.replace("{code}", code),
        }),
      });
      if (response.ok) return;
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      throw providerRefused(
        "resend",
        response.status === 403
          ? SYSTEM_LINES.resendNoDomain
          : `${body.message ?? response.statusText}.`,
      );
    },

    async startPhoneCode(credentials, to) {
      const sid = await verifyService(credentials);
      const started = await twilio(
        credentials,
        `/Services/${sid}/Verifications`,
        {
          To: to,
          Channel: "sms",
        },
      );
      if (started.status !== 201) throw twilioRefused(started.body);
    },

    async checkPhoneCode(credentials, to, code) {
      const sid = await verifyService(credentials);
      const checked = await twilio(
        credentials,
        `/Services/${sid}/VerificationCheck`,
        { To: to, Code: code },
      );
      // Twilio answers 404 once the verification expired or ran out of tries.
      if (checked.status === 404 || checked.status === 429) return "expired";
      if (checked.status !== 200) throw twilioRefused(checked.body);
      return checked.body.status === "approved" ? "approved" : "wrong";
    },
  };
}
