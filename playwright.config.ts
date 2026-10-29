import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://127.0.0.1:8787" },
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://127.0.0.1:8787/api/health",
    env: { APP_SECRET: "e2e-secret-e2e-secret-e2e-secret-00" },
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
