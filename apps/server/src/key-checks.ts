import type { Provider } from "@rengas/shared";

/** What each provider's key consists of. Twilio needs the account SID and its auth token. */
export interface ProviderCredentials {
  resend: { apiKey: string };
  twilio: { accountSid: string; authToken: string };
  openai: { apiKey: string };
}

export type Credentials<P extends Provider = Provider> = ProviderCredentials[P];

export type CheckResult = "ok" | "refused" | "unreachable";

/** One cheap, read-only call per provider that tells whether a key works. Tests pass fakes. */
export type KeyCheckers = {
  [P in Provider]: (
    credentials: ProviderCredentials[P],
  ) => Promise<CheckResult>;
};

const TIMEOUT_MS = 8000;

/** The live checks, over `fetch`. */
export function liveKeyCheckers(fetchFn: typeof fetch = fetch): KeyCheckers {
  const check = async (
    url: string,
    authorization: string,
    isOk: (response: Response) => Promise<boolean> = async (r) => r.ok,
  ): Promise<CheckResult> => {
    let response: Response;
    try {
      response = await fetchFn(url, {
        headers: { authorization },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return "unreachable";
    }
    if (await isOk(response)) return "ok";
    return [400, 401, 403].includes(response.status)
      ? "refused"
      : "unreachable";
  };

  return {
    // A sending-only Resend key can't list domains; that refusal still proves the key is real.
    resend: ({ apiKey }) =>
      check(
        "https://api.resend.com/domains",
        `Bearer ${apiKey}`,
        async (response) =>
          response.ok ||
          (response.status === 401 &&
            (await response
              .json()
              .then(
                (body: unknown) =>
                  (body as { name?: string }).name === "restricted_api_key",
              )
              .catch(() => false))),
      ),
    twilio: ({ accountSid, authToken }) =>
      check(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`,
        `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      ),
    openai: ({ apiKey }) =>
      check("https://api.openai.com/v1/models", `Bearer ${apiKey}`),
  };
}
