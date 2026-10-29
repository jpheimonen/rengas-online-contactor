import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { FAKE_OUTBOUND_LOG, OUTBOUND_LOG } from "./e2e/support/paths.ts";

const PORT = 8797;
/** The same app with fake providers, for journeys that need a real-mode run. */
const FAKE_PORT = 8798;
const FAKE = /\.fake\.spec\.ts$/;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  // Every test gets its own session cookie, so tests can run side by side.
  fullyParallel: true,
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      testIgnore: FAKE,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      testIgnore: FAKE,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
    },
    {
      name: "desktop-fake-providers",
      testMatch: FAKE,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://127.0.0.1:${FAKE_PORT}`,
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-fake-providers",
      testMatch: FAKE,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://127.0.0.1:${FAKE_PORT}`,
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      // No .env here. The server runs with faked providers (key checks, codes
      // and real sends), so the real-send flow can be driven without keys. The
      // preload records any connection it tries to open to a non-local address.
      command:
        "pnpm build && pnpm --filter @rengas/server exec tsx --import ../../e2e/support/no-outbound.mjs src/fake-provider-server.ts",
      url: `http://127.0.0.1:${PORT}/api/health`,
      env: {
        APP_SECRET: "e2e-secret-e2e-secret-e2e-secret-00",
        PORT: String(PORT),
        DATABASE_PATH: join(tmpdir(), `rengas-e2e-${process.pid}.db`),
        OUTBOUND_LOG,
        // Small, so the limit journey only needs two sends.
        SEND_LIMIT_EMAIL_PER_HOUR: "2",
      },
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      // Fake Twilio, OpenAI and code checks; nothing leaves the machine.
      command:
        "pnpm --filter @rengas/server exec tsx --import ../../e2e/support/no-outbound.mjs src/fake-providers-server.ts",
      url: `http://127.0.0.1:${FAKE_PORT}/api/health`,
      env: {
        PORT: String(FAKE_PORT),
        DATABASE_PATH: join(tmpdir(), `rengas-e2e-fake-${process.pid}.db`),
        OUTBOUND_LOG: FAKE_OUTBOUND_LOG,
      },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
