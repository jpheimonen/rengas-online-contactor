import {
  apiErrorSchema,
  startRunResponseSchema,
  stateSchema,
  type ApiError,
  type AppState,
  type RungId,
  type StartRunRequest,
  type UnlockRequest,
} from "@rengas/shared";
import type { z } from "zod";

/** A refused request, with the server's `{error, message, fieldErrors}` body. */
export class ApiProblem extends Error {
  readonly status: number;
  readonly body: ApiError;

  constructor(status: number, body: ApiError) {
    super(body.message);
    this.name = "ApiProblem";
    this.status = status;
    this.body = body;
  }
}

/**
 * Calls `/api{path}` and parses the reply with `schema`. Requests that change
 * state always send JSON, because the server refuses anything else.
 */
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init: { method?: "GET" | "PUT" | "POST"; body?: unknown } = {},
): Promise<T> {
  const method = init.method ?? "GET";
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    ...(method !== "GET" && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(init.body ?? {}),
    }),
  });
  // A 500 is plain text, so a body that isn't JSON is expected here.
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new ApiProblem(
      response.status,
      parsed.success
        ? parsed.data
        : {
            error: "invalid-request",
            message: "Something went wrong on the server. Try again.",
          },
    );
  }
  return schema.parse(body);
}

export const api = {
  state: () => request("/state", stateSchema),
  saveTicket: (ticket: AppState["ticket"]) =>
    request("/ticket", stateSchema, { method: "PUT", body: ticket }),
  unlock: (rungId: RungId, body: UnlockRequest) =>
    request(`/rungs/${rungId}/unlock`, stateSchema, { method: "POST", body }),
  reset: () => request("/reset", stateSchema, { method: "POST" }),
  startRun: (body: StartRunRequest) =>
    request("/runs", startRunResponseSchema, { method: "POST", body }),
};
