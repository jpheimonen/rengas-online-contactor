import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import type { VoiceCalls } from "./calls.ts";

const MEDIA_PATH = /^\/twilio\/media\/([\w-]+)$/;

interface UpgradeServer {
  on(
    event: "upgrade",
    listener: (request: IncomingMessage, socket: Duplex, head: Buffer) => void,
  ): unknown;
}

/**
 * Accepts Twilio's media-stream WebSocket at `/twilio/media/:token` on the
 * app's own server. Only a call waiting for its stream accepts one, once;
 * any other upgrade is refused before the handshake.
 */
export function attachMediaStreams(
  server: UpgradeServer,
  voice: VoiceCalls,
): void {
  const sockets = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    const token = MEDIA_PATH.exec(request.url ?? "")?.[1];
    if (!token || !voice.canAttach(token)) {
      socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      return;
    }
    sockets.handleUpgrade(request, socket, head, (ws) => {
      const handlers = voice.attach(token, {
        send: (text) => ws.send(text),
        close: () => ws.close(),
      });
      if (!handlers) {
        ws.close(1008, "Unknown call");
        return;
      }
      ws.on("message", (data) => handlers.message(data.toString()));
      ws.on("close", handlers.close);
      ws.on("error", (error) =>
        console.error("Twilio media socket error:", error.message),
      );
    });
  });
}
