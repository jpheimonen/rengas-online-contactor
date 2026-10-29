import WebSocket from "ws";

export const REALTIME_MODEL = "gpt-realtime";
const REALTIME_URL = `wss://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`;

/** One end of a WebSocket as the bridge uses it: text frames out, and close. */
export interface Wire {
  send(text: string): void;
  close(): void;
}

export interface WireHandlers {
  open(): void;
  message(text: string): void;
  close(): void;
}

/** Opens the OpenAI Realtime socket for one call. Tests pass a fake. */
export type ConnectRealtime = (apiKey: string, handlers: WireHandlers) => Wire;

/** The only tool Sisu gets: hanging up when the person asks it to stop. */
export const END_CALL_TOOL = {
  type: "function",
  name: "end_call",
  description:
    "Hang up the phone call. Use it right after your goodbye when the person asks you to stop, says it's the wrong number, or the conversation is over.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
} as const;

/**
 * The session for a phone call: Twilio's 8 kHz μ-law audio in both directions,
 * so no audio is converted, server-side turn detection that lets the person
 * interrupt, and a transcript of what the person says.
 */
export const callSession = (instructions: string) => ({
  type: "session.update",
  session: {
    type: "realtime",
    instructions,
    output_modalities: ["audio"],
    audio: {
      input: {
        format: { type: "audio/pcmu" },
        transcription: { model: "gpt-4o-mini-transcribe" },
        turn_detection: { type: "server_vad", interrupt_response: true },
      },
      output: { format: { type: "audio/pcmu" }, voice: "marin" },
    },
    tools: [END_CALL_TOOL],
    tool_choice: "auto",
  },
});

/** The real connection, with the API key in the Authorization header. */
export const connectRealtime: ConnectRealtime = (apiKey, handlers) => {
  const socket = new WebSocket(REALTIME_URL, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  socket.on("open", handlers.open);
  socket.on("message", (data) => handlers.message(data.toString()));
  socket.on("close", handlers.close);
  // `close` follows every error, and the call ends there.
  socket.on("error", (error) =>
    console.error("OpenAI Realtime socket error:", error.message),
  );
  return {
    send: (text) => socket.send(text),
    close: () => socket.close(),
  };
};
