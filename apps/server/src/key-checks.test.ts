import { describe, expect, it, vi } from "vitest";
import { liveKeyCheckers } from "./key-checks.ts";

const respond = (status: number, body: unknown = {}) =>
  vi.fn<typeof fetch>(async () => Response.json(body, { status }));

describe("liveKeyCheckers", () => {
  it("asks each provider with its own cheap read and auth header", async () => {
    const fetchFn = respond(200);
    const checkers = liveKeyCheckers(fetchFn);
    expect(await checkers.resend({ apiKey: "re_abc" })).toBe("ok");
    expect(await checkers.openai({ apiKey: "sk-abc" })).toBe("ok");
    expect(
      await checkers.twilio({ accountSid: "AC123", authToken: "tok" }),
    ).toBe("ok");

    const calls = fetchFn.mock.calls.map(([url, init]) => [url, init?.headers]);
    expect(calls).toEqual([
      ["https://api.resend.com/domains", { authorization: "Bearer re_abc" }],
      ["https://api.openai.com/v1/models", { authorization: "Bearer sk-abc" }],
      [
        "https://api.twilio.com/2010-04-01/Accounts/AC123.json",
        {
          authorization: `Basic ${Buffer.from("AC123:tok").toString("base64")}`,
        },
      ],
    ]);
  });

  it("accepts a sending-only Resend key", async () => {
    const checkers = liveKeyCheckers(
      respond(401, { name: "restricted_api_key" }),
    );
    expect(await checkers.resend({ apiKey: "re_send_only" })).toBe("ok");
  });

  it("tells a refused key from a provider it couldn't reach", async () => {
    expect(
      await liveKeyCheckers(respond(401, { name: "validation_error" })).resend({
        apiKey: "re_bad",
      }),
    ).toBe("refused");
    expect(
      await liveKeyCheckers(respond(401)).openai({ apiKey: "sk-bad" }),
    ).toBe("refused");
    expect(await liveKeyCheckers(respond(503)).openai({ apiKey: "sk-x" })).toBe(
      "unreachable",
    );
    const offline = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    expect(
      await liveKeyCheckers(offline).twilio({
        accountSid: "AC1",
        authToken: "t",
      }),
    ).toBe("unreachable");
  });
});
