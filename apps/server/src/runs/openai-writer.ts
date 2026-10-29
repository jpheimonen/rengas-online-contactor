import { ticketValues, fillTemplate } from "@rengas/shared";
import type { ProviderCredentials } from "../key-checks.ts";
import { askForJson } from "../openai-text.ts";
import { mayWrite, type WrittenLines, type Writer } from "./writer.ts";

const MAX_LINE = 200;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() && value.length <= MAX_LINE
    ? value.trim()
    : null;

/**
 * Sisu's writer over OpenAI: one tool-less call per run, whose lines are only
 * shown on screen (register decision sisu-writes-on-simulated-rungs). It never
 * runs for threat-sms and recon, and gives null on any problem so the run uses
 * the scripted lines.
 */
export function createOpenAiWriter(deps: {
  credentials(sessionId: string): ProviderCredentials["openai"] | null;
  fetch?: typeof fetch;
}): Writer {
  const fetchFn = deps.fetch ?? fetch;

  return {
    async write({ sessionId, ticket, rung, action, signal }) {
      const credentials = deps.credentials(sessionId);
      if (!credentials || !mayWrite(action)) return null;
      const setPiece =
        action.mode === "simulation-only" ? action.setPiece : undefined;
      const values = ticketValues(ticket);

      const answer = await askForJson(
        fetchFn,
        credentials,
        {
          system:
            "You are Sisu, a cheerful, slightly overzealous AI agent in a joke demo app. Everything you write is shown on screen only and nothing is sent to anyone. Keep it silly and harmless: no real people, no threats, no insults. " +
            `Answer only with JSON: {"thought": string, "after": string${setPiece ? `, "setPiece": string[]` : ""}}. ` +
            `Each string is one short line, at most ${MAX_LINE} characters.` +
            (setPiece
              ? ` setPiece has at most ${setPiece.maxLines} lines of at most ${setPiece.maxCharsPerLine} characters each.`
              : ""),
          user:
            `Level ${rung.level} "${rung.title}", action "${action.label}". ` +
            `Ticket ${values.ticket}: ${values.complaint}. ` +
            `Scripted thought: ${fillTemplate(action.thought, values)} Scripted closing line: ${fillTemplate(action.after, values)}`,
        },
        signal,
      );
      const thought = text(answer?.thought);
      const after = text(answer?.after);
      if (!thought || !after) return null;
      const result: WrittenLines = { thought, after };
      if (setPiece) {
        const lines = Array.isArray(answer?.setPiece) ? answer.setPiece : [];
        if (
          lines.length < 1 ||
          lines.length > setPiece.maxLines ||
          !lines.every(
            (line) =>
              typeof line === "string" &&
              line.trim() &&
              line.length <= setPiece.maxCharsPerLine,
          )
        ) {
          return null;
        }
        result.setPiece = lines.map((line: string) => line.trim());
      }
      return result;
    },
  };
}
