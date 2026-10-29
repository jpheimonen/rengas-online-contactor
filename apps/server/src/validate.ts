import type { Context } from "hono";
import type { z } from "zod";
import { problem } from "./errors.ts";

/** Parses the JSON body with the shared schema; refuses it with per-field messages. */
export async function readBody<T extends z.ZodType>(
  c: Context,
  schema: T,
): Promise<z.infer<T>> {
  const json: unknown = await c.req.json().catch(() => undefined);
  const result = schema.safeParse(json);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    fieldErrors[issue.path.join(".") || "body"] ??= issue.message;
  }
  throw problem(
    400,
    "invalid-request",
    "The request isn't valid.",
    fieldErrors,
  );
}
