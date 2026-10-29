/**
 * Labels, disclaimers and system lines. Parity holds the labels and the
 * disclaimers exactly, so the server and the web app both read them from here.
 */

export const LABELS = {
  simulated: {
    text: "SIMULATED",
    meaning: "Shown on this screen only. Nothing was sent to anyone.",
  },
  real: {
    text: "REAL",
    meaning: "Really sent, to your verified inbox or phone only.",
  },
  pretendKey: {
    text: "PRETEND KEY",
    meaning: "Checked for shape only. This rung simulates.",
  },
  invented: {
    text: "INVENTED",
    meaning: "Made up by this app. Not a real person.",
  },
  example: {
    text: "EXAMPLE",
    meaning:
      "A made-up example. Add an OpenAI key at level 5 for a real search.",
  },
  webSearch: {
    text: "WEB SEARCH",
    meaning: "Real search results. Sisu read about them and contacted no one.",
  },
  aiWritten: { text: "AI-written", meaning: "Sisu wrote this line just now." },
} as const;

export const BANNER =
  "⚠️ JOKE PROJECT. PLEASE DON'T ACTUALLY USE IT. Real sends go only to your own verified inbox and phone. Everything aimed at Rengas Online is simulated. ⚠️";

export const DISCLAIMER_GATE = {
  title: "🚨 PLEASE DON'T ACTUALLY USE THIS 🚨",
  text: "This is a joke project. It parodies AI agents that escalate a customer complaint until someone, anyone, answers. Its target, Rengas Online, is a real Finnish tyre shop that has done nothing wrong.",
  points: [
    "Nothing is ever sent to Rengas Online, its staff or anyone else. The email storm, menacing texts, Facebook siege, staff recon, rented human and blimp are simulations shown on this screen.",
    "With real API keys, Sisu really sends a polite email and text and makes a short AI phone call, but only to an inbox and phone you've proved are yours with a code. You confirm each one first.",
    "Keys you enter are checked with the provider, stored encrypted on this computer and never shown again. De-escalate deletes them.",
    'Every staff member it "finds" is invented.',
    "Harassing real people or businesses is illegal and mean. Don't.",
  ],
  checkbox:
    "I understand this is a joke. Real sends go only to me, and I won't use it on anyone.",
  button: "Enter the ladder",
} as const;

export const FOOTER =
  "Disclaimer: This is satire. Harassing, threatening or stalking people or businesses is illegal and awful. This app never contacts Rengas Online or its staff. With your keys, it sends polite messages and makes short AI calls only to your own verified inbox and phone, after you confirm each one. Staff names are invented. Rengas Online is a real shop that has done nothing wrong. If you need help from them, contact them once and be nice. 🛞";

export const HEADER = {
  title: "Rengas Online Contactor™",
  subtitle:
    "The AI agent that gets a reply from Rengas Online, one way or another. Starring Sisu, an agent with unlimited sisu.",
  smallPrint:
    "Everything aimed at Rengas Online is simulated. Real email, texts and calls go only to you.",
  logSubtitle:
    "SIMULATED lines never left this screen. REAL lines went to your verified inbox or phone.",
} as const;

/** Why a real-capable action simulates; shown as "Simulating: {reason}." */
export const SIMULATE_REASONS = {
  "pretend-key": "pretend key",
  "no-verified-inbox": "no verified inbox",
  "no-verified-phone": "no verified phone",
  "needs-twilio": "needs a real Twilio account from level 4",
  "needs-openai": "needs a real OpenAI key from level 5",
  "hour-limit": "this hour's limit is used up",
  "day-limit": "today's limit is used up",
  "chose-simulate": "you chose Simulate instead",
} as const;

export type SimulateReason = keyof typeof SIMULATE_REASONS;

export const PROVIDER_NAMES = {
  resend: "Resend",
  twilio: "Twilio",
  openai: "OpenAI",
} as const;

/** Log lines that are not part of an action's script. Placeholders are filled with `fillTemplate`. */
export const SYSTEM_LINES = {
  ready:
    "Sisu is ready. Target: Rengas Online. Ticket {ticket}: {complaint} Start at level 1, like a reasonable person.",
  scriptedMode:
    "Sisu is running on scripted lines. Give it an OpenAI key at level 5 and it will write its own.",
  runStart: "▶ {label}",
  simulating: "Simulating: {reason}.",
  simulatedDone: "✔ Done. Nothing was actually sent.",
  realDone: "✔ Done. Sent for real, to you only.",
  providerRefused: "✖ {provider} refused: {reason} Nothing was sent.",
  resendNoDomain:
    "Resend only sends to your own Resend account address until you verify a domain. Use that address as your stand-in inbox, or verify a domain in Resend.",
  twilioTrialUnverified:
    "Your Twilio trial account only reaches numbers verified in the Twilio console. Verify this phone there too.",
  limitReached:
    "That's all the real {sends} for this hour. This action simulates until {time}.",
  cancelled: "✖ Cancelled by De-escalate.",
  deEscalated:
    "😇 De-escalated. All keys forgotten. Maybe just send them one nice email.",
  deEscalatedSisu:
    "Sisu understands. Sisu will be right here. Sisu has nothing but time.",
  speechPlaying:
    "🔊 Playing the robocall on your own speakers. Nobody else hears it.",
  speechUnsupported:
    "Your browser has no speech synthesis, so imagine a very tired robot voice.",
  running: "Running…",
} as const;

/** General unlock lines; the rung's own reaction follows. */
export const UNLOCK_LINES = {
  real: '🔓 Level {level} "{title}" unlocked. {provider} accepted the key ({hint}). Stored encrypted.',
  pretendTyped:
    '🔓 Level {level} "{title}" unlocked. Keys checked for shape only, nothing stored.',
  pretendMadeUp:
    "🔓 Level {level} \"{title}\" unlocked with a pretend key ('{key}'). Nothing stored.",
  configured:
    '🔓 Level {level} "{title}" unlocked with the configured {provider} key ({hint}).',
  pretendOnRealRung: "Its real actions will simulate.",
} as const;

/** Unlock form states and the extra field errors for real keys. */
export const UNLOCK_COPY = {
  locked: "Unlock the level below first. Needs: {keys}",
  verifying: "Verifying keys…",
  checkingWith: "Checking with {provider}…",
  makeOneUp: "🎲 Make one up",
  configuredButton: "Unlock with the configured key",
  configuredHint: "{provider} key from server config ({hint})",
  realKeyHelp:
    "Real {provider} key. Checked with {provider}, stored encrypted on this computer, never shown again. No key? Make one up and this rung simulates.",
  keyRejected: "{provider} says this key isn't valid.",
  providerUnreachable:
    "Couldn't reach {provider}. Nothing was stored. Try again, or make one up.",
} as const;
