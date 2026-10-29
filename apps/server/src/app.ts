import { Hono } from "hono";
import type { Health } from "@rengas/shared";

export function createApp() {
  const app = new Hono();
  app.get("/api/health", (c) =>
    c.json({ status: "ok", service: "rengas-server" } satisfies Health),
  );
  return app;
}
