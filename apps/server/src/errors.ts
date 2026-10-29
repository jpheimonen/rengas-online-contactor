import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiError } from "@rengas/shared";

/** A refusal with its HTTP status and `apiErrorSchema` body; the app's error handler sends it. */
export class ApiProblem extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly body: ApiError,
  ) {
    super(body.message);
  }
}

export const problem = (
  status: ContentfulStatusCode,
  error: ApiError["error"],
  message: string,
  fieldErrors?: Record<string, string>,
) =>
  new ApiProblem(status, {
    error,
    message,
    ...(fieldErrors && { fieldErrors }),
  });
