import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Health } from "@rengas/shared";
import type { Db } from "./db/client.ts";
import { ApiProblem } from "./errors.ts";
import { EventLog } from "./events.ts";
import { noKeyVault, type KeyVault } from "./keys.ts";
import type { CodeSender } from "./recipients/code-sender.ts";
import { Recipients } from "./recipients/recipients.ts";
import { eventRoutes } from "./routes/events.ts";
import { recipientRoutes } from "./routes/recipients.ts";
import { resetRoutes } from "./routes/reset.ts";
import { rungRoutes } from "./routes/rungs.ts";
import { runRoutes } from "./routes/runs.ts";
import { sendRoutes } from "./routes/sends.ts";
import { stateRoutes } from "./routes/state.ts";
import type { RealAdapters } from "./runs/adapters.ts";
import { RunEngine } from "./runs/engine.ts";
import type { Writer } from "./runs/writer.ts";
import {
  DEFAULT_SEND_LIMITS,
  SendGuard,
  type SendLimits,
} from "./sends/guard.ts";
import type { Services } from "./services.ts";
import { sameOrigin, sessionMiddleware, type SessionEnv } from "./session.ts";

export interface AppOptions {
  db: Db;
  /** APP_SECRET: email codes are stored as an HMAC under it. */
  appSecret: string;
  /** Sends and checks the codes that verify recipients. */
  codeSender: CodeSender;
  sendLimits?: SendLimits;
  keyVault?: KeyVault;
  realAdapters?: RealAdapters;
  writer?: Writer;
  /** Pause between scripted lines; tests shorten it. */
  stepDelayMs?: number;
}

export function createApp(options: AppOptions) {
  const events = new EventLog(options.db);
  const keyVault = options.keyVault ?? noKeyVault;
  const recipients = new Recipients({
    db: options.db,
    keyVault,
    codeSender: options.codeSender,
    secret: options.appSecret,
  });
  const guard = new SendGuard({
    db: options.db,
    recipients,
    limits: options.sendLimits ?? DEFAULT_SEND_LIMITS,
  });
  const services: Services = {
    db: options.db,
    events,
    keyVault,
    recipients,
    guard,
    engine: new RunEngine({
      db: options.db,
      events,
      guard,
      writer: options.writer,
      ...(options.realAdapters && { realAdapters: options.realAdapters }),
      ...(options.stepDelayMs !== undefined && {
        stepDelayMs: options.stepDelayMs,
      }),
    }),
  };

  const app = new Hono<SessionEnv>();
  app.onError((error, c) => {
    if (error instanceof ApiProblem) return c.json(error.body, error.status);
    if (error instanceof HTTPException) return error.getResponse();
    console.error(error);
    return c.text("Internal Server Error", 500);
  });

  app.get("/api/health", (c) =>
    c.json({ status: "ok", service: "rengas-server" } satisfies Health),
  );

  app.use("/api/*", sameOrigin, sessionMiddleware(services.db, events));
  for (const routes of [
    stateRoutes,
    rungRoutes,
    resetRoutes,
    runRoutes,
    eventRoutes,
    recipientRoutes,
    sendRoutes,
  ]) {
    app.route("/api", routes(services));
  }
  return app;
}
