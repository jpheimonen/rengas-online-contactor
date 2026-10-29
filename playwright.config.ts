import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { OUTBOUND_LOG } from "./e2e/support/paths.ts";

const PORT = 8797;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  // Every test gets its own session cookie, so tests can run side by side.
  fullyParallel: true,
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
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
});
