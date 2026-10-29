import { ROBOCALL_VOICE, SYSTEM_LINES } from "@rengas/shared";

const supported = () => "speechSynthesis" in window;

/**
 * Plays the robocall preview through the browser's own speech, on the
 * operator's speakers only. Returns the log line to show.
 */
export function speakRobocall(text: string): string {
  if (!supported()) return SYSTEM_LINES.speechUnsupported;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = ROBOCALL_VOICE.rate;
  utterance.pitch = ROBOCALL_VOICE.pitch;
  window.speechSynthesis.speak(utterance);
  return SYSTEM_LINES.speechPlaying;
}

/** De-escalate stops any speech that is still playing. */
export function stopSpeech(): void {
  if (supported()) window.speechSynthesis.cancel();
}
