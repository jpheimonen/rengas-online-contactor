import { describe, expect, it } from "vitest";
import { SYSTEM_LINES } from "./copy.ts";
import { DEFAULT_TICKET, fillTemplate, ticketValues } from "./template.ts";

describe("fillTemplate", () => {
  it("fills the ticket into the ready line", () => {
    expect(fillTemplate(SYSTEM_LINES.ready, ticketValues(DEFAULT_TICKET))).toBe(
      "Sisu is ready. Target: Rengas Online. Ticket #48213: Where are my winter tyres? Start at level 1, like a reasonable person.",
    );
  });

  it("adds a full stop to a complaint without end punctuation", () => {
    const values = ticketValues({ ...DEFAULT_TICKET, complaint: "Tyres lost" });
    expect(values.complaint).toBe("Tyres lost.");
  });

  it("leaves placeholders without a value in place", () => {
    expect(
      fillTemplate("Banner: '{banner}' for {ticket}", { ticket: "#1" }),
    ).toBe("Banner: '{banner}' for #1");
  });

  it("does not read inherited properties", () => {
    expect(fillTemplate("{constructor}", {})).toBe("{constructor}");
  });
});
