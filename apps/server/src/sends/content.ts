import {
  CALL,
  EMAIL,
  SMS,
  fillTemplate,
  ticketValues,
  type RealCapableAction,
  type SendContent,
  type Ticket,
} from "@rengas/shared";

/**
 * The fixed neutral text of a real send (concept section 8). It is what the
 * preview shows and exactly what the send delivers. The email footer and the
 * SMS prefix are always added here, so later AI-written text can't drop them.
 */
export function fallbackContent(
  action: RealCapableAction,
  ticket: Ticket,
): SendContent {
  const values = ticketValues(ticket);
  switch (action.channel) {
    case "email":
      return {
        channel: "email",
        subject: fillTemplate(EMAIL.fallbackSubject, values),
        body: `${fillTemplate(EMAIL.fallbackBody, values)}\n\n${fillTemplate(EMAIL.footer, values)}`,
      };
    case "sms":
      return {
        channel: "sms",
        text: fillTemplate(SMS.prefix + SMS.fallbackBody, values),
      };
    case "voice":
      return {
        channel: "voice",
        maxSeconds: CALL.maxSeconds,
        opening: CALL.opening,
        rules: [...CALL.rules],
        trialNotice: false,
      };
  }
}
