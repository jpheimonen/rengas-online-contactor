import {
  apiErrorSchema,
  finderResponseSchema,
  recipientSchema,
  sendPreviewSchema,
  startRunResponseSchema,
  stateSchema,
  type ApiError,
  type AppState,
  type FinderKind,
  type CreateRecipientRequest,
  type RungId,
  type SendPreviewRequest,
  type StartRunRequest,
  type UnlockRequest,
} from "@rengas/shared";
import { z } from "zod";

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
  init: { method?: "GET" | "PUT" | "POST" | "DELETE"; body?: unknown } = {},
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

const noContent = z.undefined();

export const api = {
  state: () => request("/state", stateSchema),
  saveTicket: (ticket: AppState["ticket"]) =>
    request("/ticket", stateSchema, { method: "PUT", body: ticket }),
  unlock: (rungId: RungId, body: UnlockRequest) =>
    request(`/rungs/${rungId}/unlock`, stateSchema, { method: "POST", body }),
  reset: () => request("/reset", stateSchema, { method: "POST" }),
  startRun: (body: StartRunRequest) =>
    request("/runs", startRunResponseSchema, { method: "POST", body }),
  /** Ends a live call. */
  hangUp: (runId: string) =>
    request(`/runs/${runId}/hang-up`, noContent, { method: "POST" }),
  finder: (kind: FinderKind) =>
    request("/finder", finderResponseSchema, {
      method: "POST",
      body: { kind },
    }),
  addRecipient: (body: CreateRecipientRequest) =>
    request("/recipients", recipientSchema, { method: "POST", body }),
  verifyRecipient: (id: string, code: string) =>
    request(`/recipients/${id}/verify`, recipientSchema, {
      method: "POST",
      body: { code },
    }),
  removeRecipient: (id: string) =>
    request(`/recipients/${id}`, noContent, { method: "DELETE" }),
  preview: (body: SendPreviewRequest) =>
    request("/sends/preview", sendPreviewSchema, { method: "POST", body }),
};
