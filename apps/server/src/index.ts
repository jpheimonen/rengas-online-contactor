import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig();
const app = createApp();

// After `pnpm build` the same process also serves the web app, with index.html as the SPA fallback.
const webDist = fileURLToPath(new URL("../../web/dist", import.meta.url));
if (existsSync(webDist)) {
  const root = "../web/dist";
  app.use("*", serveStatic({ root }));
  app.get("*", serveStatic({ root, path: "index.html" }));
}

serve(
  { fetch: app.fetch, hostname: config.HOST, port: config.PORT },
  (info) => {
    console.log(`Listening on http://${info.address}:${info.port}`);
  },
);
