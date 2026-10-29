import type { ProviderCredentials } from "./key-checks.ts";

const CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 15_000;

/**
 * The one way the server asks OpenAI for text: a single chat completion with
 * no tools, answering in JSON. Returns the parsed object, or null on any
 * failure, so every caller falls back to its fixed text.
 */
export async function askForJson(
  fetchFn: typeof fetch,
  { apiKey }: ProviderCredentials["openai"],
  prompt: { system: string; user: string },
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetchFn(CHAT_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])
        : AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const parsed: unknown = JSON.parse(
      body.choices?.[0]?.message?.content ?? "",
    );
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
