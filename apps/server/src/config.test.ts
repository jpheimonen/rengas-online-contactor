import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";

const secret = "x".repeat(32);

describe("loadConfig", () => {
  it("applies defaults and treats empty keys as missing", () => {
    const config = loadConfig({ APP_SECRET: secret, RESEND_API_KEY: "" });
    expect(config.HOST).toBe("127.0.0.1");
    expect(config.PORT).toBe(8787);
    expect(config.RESEND_API_KEY).toBeUndefined();
  });

  it("rejects a short secret and a bad port, naming both", () => {
    expect(() => loadConfig({ APP_SECRET: "short", PORT: "99999" })).toThrow(
      /APP_SECRET[\s\S]*PORT|PORT[\s\S]*APP_SECRET/,
    );
  });
});
