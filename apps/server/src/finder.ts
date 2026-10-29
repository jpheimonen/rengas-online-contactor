import { z } from "zod";
import {
  finderOptionSchema,
  type FinderKind,
  type FinderResponse,
} from "@rengas/shared";

type FinderOption = FinderResponse["results"][number];

/**
 * The finder's only tool (register decisions finder-agent and finder-two-kinds).
 * It has no booking, email, form or fetch tool, so it can read about businesses
 * but never contact one. The server never fetches the sites it finds either.
 */
export const FINDER_TOOLS = [{ type: "web_search" }] as const;

export const FINDER_MODEL = "gpt-5-mini";
export const MAX_RESULTS = 6;
const TIMEOUT_MS = 90_000;

/** Searches the web for one kind of option. Tests pass a fake. */
export interface Finder {
  search(input: { kind: FinderKind; apiKey: string }): Promise<FinderOption[]>;
}

/** Without a live finder every search fails, so no test reaches the network by accident. */
export const noFinder: Finder = {
  search: () => Promise.reject(new Error("No finder configured.")),
};

const RULES = `Rules:
- List businesses and platforms only. Never list an individual person, a personal profile or a freelancer's own page; leave those out.
- Use only options you found in this search, each with the page you found it on as sourceUrl (an https link to the business or platform itself).
- name: the business or platform name, at most 80 characters.
- offer: what they offer, one plain sentence, at most 200 characters.
- price: the price exactly as the source states it, at most 80 characters, or null when no price is stated. Never guess a price.
- location: city and country, at most 80 characters.
- At most ${MAX_RESULTS} results. Return an empty list if you find nothing real.
- You are only reading. Do not try to book, contact or sign up for anything.`;

const PROMPTS: Record<FinderKind, string> = {
  humans: `Search the web for real platforms and businesses where someone can hire a person for a short physical task in or near Finland: AI-agent marketplaces that rent out humans (for example RentAHuman.ai — link to the platform's home page, never to a person's profile), errand and gig platforms, and promo staff or mascot agencies.`,
  aircraft: `Search the web for real businesses offering airship or blimp advertising, banner-towing planes, hot-air balloon advertising or skywriting in or near Finland. If nothing is closer, include ones elsewhere in Europe.`,
};

/** Structured output for the model's answer; `finderOptionSchema` checks it again. */
const RESULTS_FORMAT = {
  type: "json_schema",
  name: "finder_results",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["results"],
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "offer", "price", "location", "sourceUrl"],
          properties: {
            name: { type: "string" },
            offer: { type: "string" },
            price: { type: ["string", "null"] },
            location: { type: "string" },
            sourceUrl: { type: "string" },
          },
        },
      },
    },
  },
} as const;

/** The parts of a Responses API reply the finder reads. */
const responseSchema = z.object({
  output: z.array(
    z.object({
      type: z.string(),
      content: z
        .array(z.object({ type: z.string(), text: z.string().optional() }))
        .optional(),
    }),
  ),
});

const answerSchema = z.object({ results: z.array(z.unknown()) });

/** The live finder: one OpenAI Responses call over `fetch`, with web search as its only tool. */
export function liveFinder(fetchFn: typeof fetch = fetch): Finder {
  return {
    async search({ kind, apiKey }) {
      const response = await fetchFn("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: FINDER_MODEL,
          tools: FINDER_TOOLS,
          instructions: RULES,
          input: PROMPTS[kind],
          text: { format: RESULTS_FORMAT },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`OpenAI answered ${response.status}.`);
      }
      return parseResults(await response.json());
    },
  };
}

/** Reads the model's answer and keeps only the results that pass the shared schema. */
export function parseResults(body: unknown): FinderOption[] {
  const text = responseSchema
    .parse(body)
    .output.filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .findLast((part) => part.type === "output_text")?.text;
  if (text === undefined) throw new Error("OpenAI gave no answer.");
  const { results } = answerSchema.parse(JSON.parse(text));
  return results
    .flatMap((result) => {
      // A web result without its source link can't be checked, so it is dropped.
      const parsed = finderOptionSchema.safeParse(result);
      return parsed.success && parsed.data.sourceUrl ? [parsed.data] : [];
    })
    .slice(0, MAX_RESULTS);
}
