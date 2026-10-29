import { describe, expect, it } from "vitest";
import { DEFAULT_TICKET, apiErrorSchema, healthSchema } from "@rengas/shared";
import { ORIGIN, TestClient, testApp } from "./test-client.ts";

describe("GET /api/health", () => {
  it("returns a valid health payload without starting a session", async () => {
    const response = await testApp().request("/api/health");
    expect(healthSchema.parse(await response.json()).status).toBe("ok");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("session cookie", () => {
  it("is httpOnly, SameSite=Strict and covers the whole site", async () => {
    const response = await testApp().request("/api/state");
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^sid=[\w-]{43};/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/");
  });

  it("keeps each session's state apart and starts with the default ticket", async () => {
    const app = testApp();
    const first = new TestClient(app);
    const second = new TestClient(app);
    expect((await first.makeUpKeys("email")).status).toBe(200);

    expect((await first.state()).currentLevel).toBe(1);
    const other = await second.state();
    expect(other.currentLevel).toBe(0);
    expect(other.ticket).toEqual(DEFAULT_TICKET);
    expect(second.cookie).not.toBe(first.cookie);
  });

  it("starts a new session for an unknown cookie, with Sisu's ready line", async () => {
    const client = new TestClient(testApp());
    client.cookie = "sid=forged";
    await client.state();
    expect(client.cookie).not.toBe("sid=forged");
    const [ready] = await client.log();
    expect(ready).toMatchObject({ type: "system", kind: "ready" });
    expect(ready!.type === "system" && ready!.text).toContain("#48213");
  });
});

describe("same-origin check on requests that change state", () => {
  const refused = async (headers: Record<string, string>) => {
    const client = new TestClient(testApp());
    await client.state();
    const response = await client.request("POST", "/api/reset", {}, headers);
    expect(response.status).toBe(403);
    expect(apiErrorSchema.parse(await response.json()).error).toBe("forbidden");
  };

  it("refuses another origin", () =>
    refused({ origin: "https://evil.example" }));
  it("refuses a request with no origin", () => refused({ origin: "" }));
  it("refuses a cross-site fetch", () =>
    refused({ "sec-fetch-site": "cross-site", origin: ORIGIN }));
  it("refuses a form post", () =>
    refused({ "content-type": "application/x-www-form-urlencoded" }));

  it("accepts same-origin JSON, by Origin or by Sec-Fetch-Site", async () => {
    const client = new TestClient(testApp());
    expect((await client.post("/api/reset")).status).toBe(200);
    const bySite = await client.request(
      "POST",
      "/api/reset",
      {},
      {
        origin: "",
        "sec-fetch-site": "same-origin",
      },
    );
    expect(bySite.status).toBe(200);
  });
});

describe("PUT /api/ticket", () => {
  it("saves the ticket and refuses a bad one per field", async () => {
    const client = new TestClient(testApp());
    const ticket = { number: "777", complaint: "Tyres?", customer: "Room" };
    expect((await client.put("/api/ticket", ticket)).status).toBe(200);
    expect((await client.state()).ticket).toEqual(ticket);

    const bad = await client.put("/api/ticket", { ...ticket, number: "abc" });
    expect(bad.status).toBe(400);
    expect(apiErrorSchema.parse(await bad.json()).fieldErrors).toHaveProperty(
      "number",
    );
  });
});
