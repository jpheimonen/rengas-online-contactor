import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";

const secret = "x".repeat(32);

describe("loadConfig", () => {
  it("applies defaults and treats empty keys as missing", () => {
    const config = loadConfig({ APP_SECRET: secret, RESEND_API_KEY: "" });
    expect(config.HOST).toBe("127.0.0.1");
    expect(config.PORT).toBe(8787);
    expect(config.RESEND_API_KEY).toBeUndefined();
    expect(config.RESEND_FROM).toBe("onboarding@resend.dev");
    expect(config.SEND_LIMIT_EMAIL_PER_HOUR).toBe(3);
    expect(config.SEND_LIMIT_SMS_PER_HOUR).toBe(3);
    expect(config.SEND_LIMIT_CALLS_PER_HOUR).toBe(2);
    expect(config.SEND_LIMIT_PER_DAY).toBe(10);
  });

  it("reads the send limits from the environment", () => {
    const config = loadConfig({ APP_SECRET: secret, SEND_LIMIT_PER_DAY: "4" });
    expect(config.SEND_LIMIT_PER_DAY).toBe(4);
    expect(() =>
      loadConfig({ APP_SECRET: secret, SEND_LIMIT_SMS_PER_HOUR: "-1" }),
    ).toThrow(/SEND_LIMIT_SMS_PER_HOUR/);
  });

  it("rejects a short secret and a bad port, naming both", () => {
    expect(() => loadConfig({ APP_SECRET: "short", PORT: "99999" })).toThrow(
      /APP_SECRET[\s\S]*PORT|PORT[\s\S]*APP_SECRET/,
    );
  });
});
