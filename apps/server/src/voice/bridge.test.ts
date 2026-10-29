import { describe, expect, it, vi } from "vitest";
import { CALL } from "@rengas/shared";
import { fakeWire } from "../test-client.ts";
import { CallBridge, type BridgeEvents } from "./bridge.ts";

function setup() {
  const twilio = fakeWire();
  const openai = fakeWire();
  const events = {
    transcript: vi.fn(),
    endCall: vi.fn(),
    openaiError: vi.fn(),
  } satisfies BridgeEvents;
  const bridge = new CallBridge(twilio, events);
  const fromTwilio = (message: unknown) =>
    bridge.fromTwilio(JSON.stringify(message));
  const fromOpenAI = (message: unknown) =>
    bridge.fromOpenAI(JSON.stringify(message));
  /** Both sides ready: Twilio's stream has started and OpenAI is open. */
  const connect = () => {
    fromTwilio({ event: "connected" });
    fromTwilio({ event: "start", start: { streamSid: "MZ1", callSid: "CA1" } });
    bridge.start(openai, "Be Sisu.");
  };
  return { bridge, twilio, openai, events, fromTwilio, fromOpenAI, connect };
}

describe("the call bridge", () => {
  it("sets up a μ-law session with Sisu's instructions and only the end_call tool, then greets", () => {
    const { openai, connect } = setup();
    connect();
    expect(openai.sent).toEqual([
      {
        type: "session.update",
        session: expect.objectContaining({
          type: "realtime",
          instructions: "Be Sisu.",
          audio: {
            input: expect.objectContaining({
              format: { type: "audio/pcmu" },
              turn_detection: expect.objectContaining({ type: "server_vad" }),
            }),
            output: expect.objectContaining({
              format: { type: "audio/pcmu" },
            }),
          },
          tools: [expect.objectContaining({ name: "end_call" })],
        }),
      },
      { type: "response.create" },
    ]);
  });

  it("waits for Twilio's stream before Sisu starts talking, so the opening isn't lost", () => {
    const { bridge, openai, fromTwilio } = setup();
    bridge.start(openai, "Be Sisu.");
    expect(openai.sent.map((m) => m.type)).toEqual(["session.update"]);
    fromTwilio({ event: "start", start: { streamSid: "MZ1" } });
    expect(openai.sent.map((m) => m.type)).toEqual([
      "session.update",
      "response.create",
    ]);
  });

  it("passes the caller's audio to OpenAI and Sisu's audio back to Twilio unchanged", () => {
    const { twilio, openai, fromTwilio, fromOpenAI, connect } = setup();
    connect();
    fromTwilio({ event: "media", media: { payload: "dGhlbQ==" } });
    fromOpenAI({ type: "response.output_audio.delta", delta: "c2lzdQ==" });

    expect(openai.sent.at(-1)).toEqual({
      type: "input_audio_buffer.append",
      audio: "dGhlbQ==",
    });
    expect(twilio.sent).toEqual([
      { event: "media", streamSid: "MZ1", media: { payload: "c2lzdQ==" } },
    ]);
  });

  it("drops caller audio that arrives before OpenAI is open", () => {
    const { bridge, openai, fromTwilio } = setup();
    fromTwilio({ event: "start", start: { streamSid: "MZ1" } });
    fromTwilio({ event: "media", media: { payload: "ZWFybHk=" } });
    bridge.start(openai, "Be Sisu.");
    expect(openai.sent.map((m) => m.type)).toEqual([
      "session.update",
      "response.create",
    ]);
  });

  it("clears Twilio's queued audio when the person starts talking", () => {
    const { twilio, fromOpenAI, connect } = setup();
    connect();
    fromOpenAI({ type: "input_audio_buffer.speech_started" });
    expect(twilio.sent).toEqual([{ event: "clear", streamSid: "MZ1" }]);
  });

  it("reports finished transcripts from both sides and skips empty ones", () => {
    const { events, fromOpenAI, connect } = setup();
    connect();
    fromOpenAI({
      type: "response.output_audio_transcript.done",
      transcript: " Hello! This is Sisu. ",
    });
    fromOpenAI({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Rengas Online customer service.",
    });
    fromOpenAI({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "  ",
    });
    expect(events.transcript.mock.calls).toEqual([
      ["sisu", "Hello! This is Sisu."],
      ["them", "Rengas Online customer service."],
    ]);
  });

  it("hangs up after end_call only once Twilio has played the goodbye", () => {
    const { twilio, events, fromTwilio, fromOpenAI, connect } = setup();
    connect();
    fromOpenAI({
      type: "response.function_call_arguments.done",
      name: "end_call",
      call_id: "c1",
      arguments: "{}",
    });
    expect(twilio.sent).toEqual([
      { event: "mark", streamSid: "MZ1", mark: { name: "goodbye" } },
    ]);
    expect(events.endCall).not.toHaveBeenCalled();

    fromTwilio({ event: "mark", mark: { name: "goodbye" } });
    expect(events.endCall).toHaveBeenCalledOnce();
  });

  it("tells Sisu time is nearly up and asks for a reply", () => {
    const { bridge, openai, connect } = setup();
    connect();
    bridge.nudge();
    expect(openai.sent.slice(-2)).toEqual([
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "system",
          content: [{ type: "input_text", text: CALL.timeNearlyUp }],
        },
      },
      { type: "response.create" },
    ]);
  });

  it("reports OpenAI errors and ignores frames it can't read", () => {
    const { bridge, events, twilio, connect } = setup();
    connect();
    bridge.fromOpenAI("not json");
    bridge.fromTwilio("[]");
    bridge.fromOpenAI(
      JSON.stringify({ type: "error", error: { message: "Bad audio" } }),
    );
    expect(events.openaiError).toHaveBeenCalledWith("Bad audio");
    expect(twilio.sent).toEqual([]);
  });
});
