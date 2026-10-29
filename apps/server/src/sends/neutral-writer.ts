import {
  EMAIL,
  GSM_TEXT,
  SMS,
  fillTemplate,
  ticketValues,
  type RealCapableAction,
  type SendContent,
  type Ticket,
} from "@rengas/shared";
import type { ProviderCredentials } from "../key-checks.ts";
import { askForJson } from "../openai-text.ts";
import { fallbackContent } from "./content.ts";

export interface WrittenContent {
  content: SendContent;
  aiWritten: boolean;
}

/**
 * Writes the neutral text of a real email or text for the preview (register
 * decision sisu-writes-on-simulated-rungs). The operator sees it before
 * confirming and the send delivers exactly that. Without an OpenAI key, or
 * when the answer breaks the rules below, it gives the fixed text. The email
 * footer and SMS prefix are added here, never by the model.
 */
export interface NeutralWriter {
  write(
    sessionId: string,
    action: RealCapableAction,
    ticket: Ticket,
  ): Promise<WrittenContent>;
}

const RULES =
  "Write as Sisu, a polite AI assistant following up on a customer service ticket. " +
  "Be warm, patient and harmless: no threats, no pressure, no insults, no links, no phone numbers. " +
  "Answer only with a JSON object.";

const words = (text: string) => text.trim().split(/\s+/).length;

/** No model: every preview shows the fixed neutral text. */
export const fixedTextWriter: NeutralWriter = {
  write: async (_sessionId, action, ticket) => ({
    content: fallbackContent(action, ticket),
    aiWritten: false,
  }),
};

export function createNeutralWriter(deps: {
  credentials(sessionId: string): ProviderCredentials["openai"] | null;
  fetch?: typeof fetch;
}): NeutralWriter {
  const fetchFn = deps.fetch ?? fetch;

  return {
    async write(sessionId, action, ticket) {
      const fallback = {
        content: fallbackContent(action, ticket),
        aiWritten: false,
      };
      const credentials = deps.credentials(sessionId);
      if (!credentials || action.channel === "voice") return fallback;
      const values = ticketValues(ticket);
      const about = `Ticket ${values.ticket}, from ${ticket.customer}: ${values.complaint}`;

      if (action.channel === "email") {
        const answer = await askForJson(fetchFn, credentials, {
          system: `${RULES} Shape: {"subject": string, "body": string}. Subject at most ${EMAIL.maxSubjectChars} characters. Body at most ${EMAIL.maxBodyWords} words, no greeting-less sign-off: the signature is added for you.`,
          user: `Write a firm but friendly follow-up email to Rengas Online customer service. ${about}`,
        });
        const subject =
          typeof answer?.subject === "string" ? answer.subject.trim() : "";
        const body = typeof answer?.body === "string" ? answer.body.trim() : "";
        if (
          !subject ||
          !body ||
          subject.length > EMAIL.maxSubjectChars ||
          subject.includes("\n") ||
          words(body) > EMAIL.maxBodyWords ||
          /https?:\/\//i.test(body)
        ) {
          return fallback;
        }
        return {
          aiWritten: true,
          content: {
            channel: "email",
            subject,
            body: `${body}\n\n${fillTemplate(EMAIL.footer, values)}`,
          },
        };
      }

      const room = SMS.maxChars - SMS.prefix.length;
      const answer = await askForJson(fetchFn, credentials, {
        system: `${RULES} Shape: {"text": string}. At most ${room} characters, plain letters, digits and basic punctuation only. The "Sisu (AI demo): " prefix is added for you.`,
        user: `Write a short, gentle follow-up text about this ticket. ${about}`,
      });
      const text = typeof answer?.text === "string" ? answer.text.trim() : "";
      const full = SMS.prefix + text;
      if (
        !text ||
        full.length > SMS.maxChars ||
        !GSM_TEXT.test(full) ||
        /https?:\/\//i.test(text)
      ) {
        return fallback;
      }
      return { aiWritten: true, content: { channel: "sms", text: full } };
    },
  };
}
