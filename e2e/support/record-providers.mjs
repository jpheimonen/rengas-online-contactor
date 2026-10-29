// Loaded into the recording e2e server with --import. It replaces fetch for the
// Resend, Twilio and OpenAI hosts with answers that look like theirs, and
// appends every call to PROVIDER_LOG as one JSON line. The app code, its
// adapters and its writers run unchanged, so the log is what they really send.
import { appendFileSync, writeFileSync } from "node:fs";

const log = process.env.PROVIDER_LOG;
if (!log) throw new Error("record-providers.mjs needs PROVIDER_LOG");
writeFileSync(log, "");

const HOSTS = new Set([
  "api.resend.com",
  "api.twilio.com",
  "verify.twilio.com",
  "api.openai.com",
]);
/** Every Verify check with this code passes. */
const PHONE_CODE = "246810";
const realFetch = globalThis.fetch;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** The key a call was made with: the bearer token, or the Basic user name. */
function credentialOf(headers) {
  const auth = new Headers(headers).get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  if (auth.startsWith("Basic "))
    return Buffer.from(auth.slice(6), "base64").toString().split(":")[0];
  return "";
}

/** One answer that satisfies every writer: each reads only the fields it asks for. */
const WRITTEN = {
  thought: "Recorded e2e thought.",
  after: "Recorded e2e closing line.",
  setPiece: ["Recorded e2e line."],
  subject: "Recorded e2e subject",
  body: "Recorded e2e email body.",
  text: "Recorded e2e text.",
};

function answer(url, method, body) {
  const { host, pathname } = url;
  if (host === "api.openai.com") {
    if (pathname.endsWith("/chat/completions"))
      return json(200, {
        choices: [{ message: { content: JSON.stringify(WRITTEN) } }],
      });
    return json(200, { data: [] });
  }
  if (host === "api.resend.com")
    return method === "POST"
      ? json(200, { id: `re-msg-${Date.now()}` })
      : json(200, { data: [] });
  if (host === "verify.twilio.com") {
    if (pathname.endsWith("/Services") && method === "GET")
      return json(200, { services: [] });
    if (pathname.endsWith("/Services")) return json(201, { sid: "VAfake" });
    if (pathname.endsWith("/Verifications")) return json(201, {});
    const code = new URLSearchParams(body).get("Code");
    return json(200, { status: code === PHONE_CODE ? "approved" : "pending" });
  }
  if (pathname.endsWith("/Messages.json"))
    return json(201, { sid: "SMfake", status: "queued" });
  if (pathname.endsWith("/Calls.json")) return json(201, { sid: "CAfake" });
  return json(200, { type: "Full" });
}

globalThis.fetch = async (input, init = {}) => {
  const request = input instanceof Request ? input : null;
  const url = new URL(request ? request.url : String(input));
  if (!HOSTS.has(url.host)) return realFetch(input, init);
  const method = init.method ?? request?.method ?? "GET";
  const body =
    typeof init.body === "string" ? init.body : String(init.body ?? "");
  const headers = init.headers ?? request?.headers;
  let tools = false;
  try {
    tools = "tools" in JSON.parse(body);
  } catch {
    // Not JSON: a form body has no tools.
  }
  appendFileSync(
    log,
    `${JSON.stringify({
      host: url.host,
      method,
      path: url.pathname,
      credential: credentialOf(headers),
      tools,
      body,
    })}\n`,
  );
  return answer(url, method, body);
};
