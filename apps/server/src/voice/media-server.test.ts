import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import type { MediaHandlers, VoiceCalls } from "./calls.ts";
import { attachMediaStreams } from "./media-server.ts";
import type { Wire } from "./realtime.ts";

let server: Server;

afterEach(() => {
  server.close();
});

/** A real HTTP server on a free port, with a stand-in for the calls that has one call, "good". */
async function listen() {
  const received: string[] = [];
  let toTwilio: Wire | undefined;
  const closed = vi.fn();
  const voice = {
    canAttach: (token: string) => token === "good",
    attach: (_token: string, wire: Wire): MediaHandlers => {
      toTwilio = wire;
      return { message: (text) => void received.push(text), close: closed };
    },
  } as unknown as VoiceCalls;
  server = createServer((_request, response) => response.end());
  attachMediaStreams(server, voice);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: (token: string) => `ws://127.0.0.1:${port}/twilio/media/${token}`,
    received,
    closed,
    toTwilio: () => toTwilio!,
  };
}

describe("the media-stream WebSocket", () => {
  it("refuses a connection for a call that isn't waiting for its stream", async () => {
    const { url } = await listen();
    const socket = new WebSocket(url("unknown"));
    const status = await new Promise<number>((resolve) => {
      socket.on("unexpected-response", (_request, response) =>
        resolve(response.statusCode!),
      );
      socket.on("error", () => resolve(0));
    });
    expect(status).toBe(404);
  });

  it("passes frames both ways for the call's token and reports the close", async () => {
    const { url, received, closed, toTwilio } = await listen();
    const socket = new WebSocket(url("good"));
    await new Promise((resolve) => socket.on("open", resolve));

    socket.send(JSON.stringify({ event: "connected" }));
    await vi.waitFor(() =>
      expect(received).toEqual([JSON.stringify({ event: "connected" })]),
    );

    const reply = new Promise<string>((resolve) =>
      socket.on("message", (data) => resolve(data.toString())),
    );
    toTwilio().send('{"event":"clear"}');
    expect(await reply).toBe('{"event":"clear"}');

    socket.close();
    await vi.waitFor(() => expect(closed).toHaveBeenCalledOnce());
  });
});
