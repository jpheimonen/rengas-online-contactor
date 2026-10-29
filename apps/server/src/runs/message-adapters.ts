import { EMAIL, fillTemplate, type SendContent } from "@rengas/shared";
import { problem } from "../errors.ts";
import type { ProviderCredentials } from "../key-checks.ts";
import {
  RESEND_EMAILS,
  resendRefused,
  twilioRefused,
} from "../recipients/code-sender.ts";
import type {
  ChannelAdapter,
  RealAdapters,
  RealSend,
  RunContext,
} from "./adapters.ts";

export interface MessageAdapterDeps {
  /** The session's decrypted provider keys; never sent to the browser. */
  credentials<P extends "resend" | "twilio">(
    sessionId: string,
    provider: P,
  ): ProviderCredentials[P] | null;
  /** Resend sender address (`RESEND_FROM`). */
  resendFrom: string;
  /** Twilio sending number (`TWILIO_FROM_NUMBER`). Without one, texts can't go for real. */
  twilioFrom: string | undefined;
  fetch?: typeof fetch;
}

const TWILIO_API = "https://api.twilio.com/2010-04-01/Accounts";

const notConfigured = (provider: string) =>
  problem(
    409,
    "not-configured",
    `No ${provider} key is available for this send.`,
  );

/** What the provider said about one delivery. */
interface Delivery {
  messageId: string;
  status: string;
}

/**
 * Plays the action's real lines. The provider is called right after the line
 * that names the recipient, so the lines after it can quote the message ID.
 * A refusal throws a problem the engine logs as the run's failure.
 */
async function playReal(
  ctx: RunContext,
  provider: "resend" | "twilio",
  deliver: (send: RealSend) => Promise<Delivery>,
): Promise<void> {
  const { action, send } = ctx;
  if (!send || action.mode !== "real-capable") {
    throw new Error("A real adapter ran without a confirmed send.");
  }
  const sendAt = action.realLines.findIndex((line) =>
    line.includes("{recipient}"),
  );
  let values = ctx.values;
  for (const [index, line] of action.realLines.entries()) {
    await ctx.pause();
    ctx.emit({
      type: "step",
      text: fillTemplate(line, values),
      invented: false,
    });
    if (index !== sendAt) continue;
    const delivery = await deliver(send);
    send.markSent(delivery.messageId);
    values = { ...values, messageId: delivery.messageId };
    ctx.emit({
      type: "provider-status",
      provider,
      status: delivery.status,
      text: `${provider === "resend" ? "Resend" : "Twilio"} says: ${delivery.status}.`,
    });
  }
}

const contentOf = <C extends SendContent["channel"]>(
  send: RealSend,
  channel: C,
): Extract<SendContent, { channel: C }> => {
  if (send.content.channel !== channel) {
    throw new Error(
      `Expected ${channel} content, got ${send.content.channel}.`,
    );
  }
  return send.content as Extract<SendContent, { channel: C }>;
};

/** Real email through Resend, and real text through Twilio when a sending number is set. */
export function createMessageAdapters(deps: MessageAdapterDeps): RealAdapters {
  const fetchFn = deps.fetch ?? fetch;

  const email: ChannelAdapter = {
    async run(ctx) {
      await playReal(ctx, "resend", async (send) => {
        const credentials = deps.credentials(ctx.sessionId, "resend");
        if (!credentials) throw notConfigured("Resend");
        const { subject, body } = contentOf(send, "email");
        const response = await fetchFn(RESEND_EMAILS, {
          method: "POST",
          headers: {
            authorization: `Bearer ${credentials.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from: `${EMAIL.fromName} <${deps.resendFrom}>`,
            to: [send.recipient.address],
            subject,
            text: body,
          }),
          signal: ctx.signal,
        });
        if (!response.ok) throw await resendRefused(response);
        const { id } = (await response.json()) as { id: string };
        return { messageId: id, status: "accepted" };
      });
    },
  };

  const sms = (from: string): ChannelAdapter => ({
    async run(ctx) {
      await playReal(ctx, "twilio", async (send) => {
        const credentials = deps.credentials(ctx.sessionId, "twilio");
        if (!credentials) throw notConfigured("Twilio");
        const { text } = contentOf(send, "sms");
        const { accountSid, authToken } = credentials;
        const response = await fetchFn(
          `${TWILIO_API}/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            },
            body: new URLSearchParams({
              To: send.recipient.address,
              From: from,
              Body: text,
            }),
            signal: ctx.signal,
          },
        );
        const body = (await response.json()) as Record<string, unknown>;
        if (response.status !== 201) throw twilioRefused(body);
        return { messageId: String(body.sid), status: String(body.status) };
      });
    },
  });

  return { email, ...(deps.twilioFrom && { sms: sms(deps.twilioFrom) }) };
}
