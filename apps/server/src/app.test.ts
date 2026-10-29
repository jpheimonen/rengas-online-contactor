import { describe, expect, it } from "vitest";
import { healthSchema } from "@rengas/shared";
import { createApp } from "./app.ts";

describe("GET /api/health", () => {
  it("returns a valid health payload", async () => {
    const response = await createApp().request("/api/health");
    expect(healthSchema.parse(await response.json()).status).toBe("ok");
  });
});
