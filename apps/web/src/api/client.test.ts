import { afterEach, expect, it, vi } from "vitest";
import { ApiProblem, api } from "./client.ts";

afterEach(() => vi.unstubAllGlobals());

const stubFetch = (response: Response) => {
  const fetch = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

it("sends state changes as JSON, because the server refuses anything else", async () => {
  const fetch = stubFetch(
    Response.json(
      { error: "not-next-rung", message: "Unlock the level below first." },
      { status: 409 },
    ),
  );
  await expect(api.reset()).rejects.toBeInstanceOf(ApiProblem);
  expect(fetch).toHaveBeenCalledWith("/api/reset", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
});

it("keeps the server's field errors on a refused unlock", async () => {
  stubFetch(
    Response.json(
      {
        error: "invalid-keys",
        message: "Some keys don't look right.",
        fieldErrors: { bulkmail: "Keys don't have spaces in them." },
      },
      { status: 422 },
    ),
  );
  const error = await api
    .unlock("roboemail", {
      mode: "pretend",
      keys: { bulkmail: "a b" },
      madeUp: false,
    })
    .catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiProblem);
  expect((error as ApiProblem).body.fieldErrors).toEqual({
    bulkmail: "Keys don't have spaces in them.",
  });
});

it("turns a plain-text server error into a readable message", async () => {
  stubFetch(new Response("Internal Server Error", { status: 500 }));
  await expect(api.state()).rejects.toMatchObject({
    status: 500,
    message: "Something went wrong on the server. Try again.",
  });
});
