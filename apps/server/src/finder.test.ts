import { describe, expect, it, vi } from "vitest";
import {
  FINDER_EXAMPLES,
  RUNGS,
  apiErrorSchema,
  finderResponseSchema,
  type RungId,
} from "@rengas/shared";
import {
  FINDER_TOOLS,
  liveFinder,
  parseResults,
  type Finder,
} from "./finder.ts";
import { noKeyVault, type KeyVault } from "./keys.ts";
import { TestClient, testApp } from "./test-client.ts";

const ANSWER = {
  results: [
    {
      name: "Helsinki Airship Ads Oy",
      offer: "Airship advertising flights over Helsinki.",
      price: null,
      location: "Helsinki, Finland",
      sourceUrl: "https://airship.example/ads",
    },
    {
      name: "Sneaky Link",
      offer: "A link that runs script.",
      price: "€1",
      location: "Nowhere",
      sourceUrl: "javascript:alert(1)",
    },
    {
      name: "",
      offer: "No name.",
      price: null,
      location: "Turku, Finland",
      sourceUrl: "https://noname.example",
    },
    {
      name: "Too Chatty Ltd",
      offer: "x".repeat(201),
      price: null,
      location: "Tampere, Finland",
      sourceUrl: "https://chatty.example",
    },
    {
      name: "Linkless Ltd",
      offer: "Has no source link.",
      price: null,
      location: "Oulu, Finland",
      sourceUrl: null,
    },
  ],
};

/** A Responses API reply: a web search call, then the message with the JSON answer. */
const reply = (answer: unknown) => ({
  output: [
    { type: "web_search_call", id: "ws_1", status: "completed" },
    {
      type: "message",
      content: [{ type: "output_text", text: JSON.stringify(answer) }],
    },
  ],
});

describe("the live finder", () => {
  it("has web search as its only tool", () => {
    expect(FINDER_TOOLS).toEqual([{ type: "web_search" }]);
  });

  it("makes one Responses call with only web search and keeps only valid web results", async () => {
    const fetch = vi.fn(async () => Response.json(reply(ANSWER)));
    const results = await liveFinder(fetch).search({
      kind: "aircraft",
      apiKey: "sk-test",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer sk-test",
    );
    const body = JSON.parse(init.body as string) as { tools: unknown };
    expect(body.tools).toEqual([{ type: "web_search" }]);
    expect(results).toEqual([ANSWER.results[0]]);
  });

  it("fails when OpenAI refuses or gives no answer", async () => {
    const refused = liveFinder(async () => new Response("no", { status: 401 }));
    await expect(
      refused.search({ kind: "humans", apiKey: "sk-test" }),
    ).rejects.toThrow("401");
    expect(() => parseResults({ output: [] })).toThrow("no answer");
  });
});

const keyed: KeyVault = {
  ...noKeyVault,
  credentials: ((_sessionId: string, provider: string) =>
    provider === "openai"
      ? { apiKey: "sk-test" }
      : null) as KeyVault["credentials"],
};

/** Unlocks every rung up to and including `last` with made-up keys. */
async function climbTo(client: TestClient, last: RungId) {
  for (const rung of RUNGS) {
    if (rung.keys.length > 0) await client.makeUpKeys(rung.id as RungId);
    if (rung.id === last) return;
  }
}

describe("POST /api/finder", () => {
  it("refuses a locked rung", async () => {
    const client = new TestClient(testApp());
    const response = await client.post("/api/finder", { kind: "humans" });
    expect(response.status).toBe(409);
    expect(apiErrorSchema.parse(await response.json()).error).toBe(
      "rung-locked",
    );
  });

  it("shows the invented examples without an OpenAI key and searches nothing", async () => {
    const search = vi.fn<Finder["search"]>();
    const client = new TestClient(testApp({ finder: { search } }));
    await climbTo(client, "rent-a-human");

    expect((await client.state()).finderMode).toBe("examples");
    const response = await client.post("/api/finder", { kind: "humans" });
    expect(response.status).toBe(200);
    expect(finderResponseSchema.parse(await response.json())).toEqual({
      kind: "humans",
      mode: "examples",
      results: FINDER_EXAMPLES.humans,
    });
    expect(search).not.toHaveBeenCalled();

    const finderLines = (await client.log()).flatMap((e) =>
      e.type === "system" && e.kind === "finder" ? [e.text] : [],
    );
    expect(finderLines).toEqual([
      "Searching the web for places that rent out humans by the hour…",
      "Found 3 options. Sisu read about them. Sisu contacted none of them.",
    ]);
  });

  it("searches the web with the session's OpenAI key", async () => {
    const search = vi.fn<Finder["search"]>(async () => [ANSWER.results[0]!]);
    const client = new TestClient(
      testApp({ keyVault: keyed, finder: { search } }),
    );
    await climbTo(client, "blimp");

    expect((await client.state()).finderMode).toBe("web-search");
    const response = await client.post("/api/finder", { kind: "aircraft" });
    expect(finderResponseSchema.parse(await response.json())).toEqual({
      kind: "aircraft",
      mode: "web-search",
      results: [ANSWER.results[0]],
    });
    expect(search).toHaveBeenCalledWith({
      kind: "aircraft",
      apiKey: "sk-test",
    });
  });

  it("reports a failed search instead of showing examples", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const client = new TestClient(testApp({ keyVault: keyed }));
    await climbTo(client, "blimp");

    const response = await client.post("/api/finder", { kind: "aircraft" });
    expect(response.status).toBe(502);
    expect(apiErrorSchema.parse(await response.json()).error).toBe(
      "search-failed",
    );
    const last = (await client.log()).at(-1);
    expect(last).toMatchObject({ type: "system", kind: "finder" });
    vi.restoreAllMocks();
  });
});
