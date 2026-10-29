import { Hono } from "hono";
import {
  FINDER_EXAMPLES,
  RUNGS,
  fillTemplate,
  finderRequestSchema,
  isUnlocked,
  type FinderAction,
  type FinderKind,
  type FinderResponse,
  type RungId,
} from "@rengas/shared";
import { problem } from "../errors.ts";
import type { Services } from "../services.ts";
import type { SessionEnv } from "../session.ts";
import { getUnlocks } from "../session-data.ts";
import { readBody } from "../validate.ts";

const FAILED_LINE =
  "The web search didn't work. Sisu found nothing and contacted no one.";

function finderFor(kind: FinderKind) {
  for (const [index, rung] of RUNGS.entries()) {
    const action = rung.actions.find(
      (a): a is FinderAction => a.mode === "finder" && a.kind === kind,
    );
    if (action) return { index, rung, action };
  }
  throw new Error(`No finder action for ${kind}`);
}

/**
 * `POST /api/finder` (register decisions finder-agent and finder-two-kinds).
 * With an OpenAI key it searches the web; without one it shows the invented
 * examples. It only reads: nothing is booked and no one is contacted.
 */
export function finderRoutes({ db, events, keyVault, finder }: Services) {
  return new Hono<SessionEnv>().post("/finder", async (c) => {
    const sessionId = c.get("sessionId");
    const { kind } = await readBody(c, finderRequestSchema);
    const { index, rung, action } = finderFor(kind);
    if (!isUnlocked(index, new Set(getUnlocks(db, sessionId).keys()))) {
      throw problem(
        409,
        "rung-locked",
        `Unlock level ${rung.level} "${rung.title}" first.`,
      );
    }

    const log = (text: string) =>
      events.append(sessionId, {
        type: "system",
        kind: "finder",
        text,
        rungId: rung.id as RungId,
      });
    const [searchLine, foundLine] = action.lines;
    log(searchLine!);

    const openai = keyVault.credentials(sessionId, "openai");
    let response: FinderResponse;
    if (openai) {
      try {
        const results = await finder.search({ kind, apiKey: openai.apiKey });
        response = { kind, mode: "web-search", results };
      } catch (error) {
        console.error("Finder search failed:", error);
        log(FAILED_LINE);
        throw problem(
          502,
          "search-failed",
          "The web search didn't work. Try again in a moment.",
        );
      }
    } else {
      response = {
        kind,
        mode: "examples",
        results: [...FINDER_EXAMPLES[kind]],
      };
    }
    log(fillTemplate(foundLine!, { n: String(response.results.length) }));
    return c.json(response);
  });
}
