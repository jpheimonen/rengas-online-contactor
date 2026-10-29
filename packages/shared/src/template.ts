/** Placeholders the server fills in scripted lines and messages. */
export const PLACEHOLDERS = [
  "ticket",
  "complaint",
  "customer",
  "recipient",
  "sign",
  "banner",
  "reply",
  "optionName",
  "smsText",
  "n",
  "messageId",
  "duration",
  "subjects",
  "sonnet",
] as const;

export type Placeholder = (typeof PLACEHOLDERS)[number];
export type TemplateValues = Partial<Record<Placeholder, string>>;

/** Replaces `{name}` with its value. Placeholders without a value stay as they are. */
export function fillTemplate(text: string, values: TemplateValues): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(values, name)
      ? (values[name as Placeholder] ?? match)
      : match,
  );
}

export interface Ticket {
  number: string;
  complaint: string;
  customer: string;
}

export const DEFAULT_TICKET: Ticket = {
  number: "48213",
  complaint: "Where are my winter tyres?",
  customer: "A Patient Customer",
};

/** The ticket's placeholder values: `{ticket}` is "#48213", and the complaint ends with punctuation. */
export function ticketValues(ticket: Ticket): TemplateValues {
  const complaint = ticket.complaint.trim();
  return {
    ticket: `#${ticket.number}`,
    complaint: /[.!?…]$/.test(complaint) ? complaint : `${complaint}.`,
    customer: ticket.customer,
  };
}
