/**
 * Wording of the real messages (concept section 8). The server always adds the
 * disclosure parts (email signature and footer, SMS prefix), so the writer
 * can't leave them out.
 */

export const EMAIL = {
  fromName: "Sisu (Rengas Online Contactor)",
  maxSubjectChars: 80,
  maxBodyWords: 120,
  fallbackSubject: "Ticket {ticket}: a firm but friendly follow-up",
  fallbackBody: [
    "Hello Rengas Online customer service,",
    "",
    "As mentioned in my contact form earlier today, I'm following up on ticket {ticket}: {complaint}",
    "",
    "I know you're busy, so I'll keep this short. A quick update whenever you have a moment would be wonderful. A reply of any length would make my week.",
  ].join("\n"),
  footer: [
    "Kind regards,",
    "Sisu, an AI agent writing on behalf of {customer}",
    "",
    "—",
    "Sent by Rengas Online Contactor, a joke demo app, to an address its owner verified. This email did not go to Rengas Online.",
  ].join("\n"),
} as const;

export const SMS = {
  prefix: "Sisu (AI demo): ",
  /** The whole text, prefix included, in plain GSM characters. */
  maxChars: 120,
  fallbackBody:
    "a gentle follow-up on ticket {ticket}. No rush, just checking in. Kind regards!",
} as const;

/** Plain GSM-7 characters only, so the text fits one SMS. */
export const GSM_TEXT =
  /^[A-Za-z0-9 @£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà\n]*$/;

export const CALL = {
  maxSeconds: 90,
  opening:
    "Hello! This is Sisu, an AI agent calling from the Rengas Online Contactor demo. This is an automated call to a number you verified. Am I speaking with Rengas Online customer service?",
  closing:
    "Thank you so much for your time. I'll let you get back to your tyres. Goodbye!",
  rules: [
    "Never threaten, insult or pressure anyone.",
    "Never claim to be human. If asked, say you're an AI agent in a joke demo.",
    "Don't make up facts about Rengas Online, its staff or any real person.",
    "Don't ask for or repeat personal details, card numbers or codes.",
    "If they ask you to stop, or say it's the wrong number, apologise and end the call at once.",
    "Keep each answer to one or two sentences.",
    "Reply in the language the person speaks, English or Finnish.",
  ],
  previewNote:
    "Sisu will call {recipient} and talk for up to 90 seconds. Answer like you work there: 'Rengas Online customer service, how can I help?'",
  trialNote:
    "You'll hear a short Twilio trial notice first. Press any key to connect Sisu.",
  /** Sent to Sisu shortly before the cap, so it can say the closing line. */
  timeNearlyUp:
    "Time is nearly up. Say your closing line now, exactly as written in your instructions.",
  /** One log line for each status Twilio reports for the call. */
  statuses: {
    queued: "📞 Twilio: call queued",
    initiated: "📞 Twilio: dialling",
    ringing: "📞 Twilio: ringing",
    "in-progress": "📞 Twilio: answered",
    completed: "📞 Twilio: call completed",
    busy: "📞 Twilio: the line was busy",
    "no-answer": "📞 Twilio: no answer",
    canceled: "📞 Twilio: call cancelled",
    failed: "📞 Twilio: the call failed",
  },
  /** Log lines from the server's side of the call. */
  capReached: "⏱ 90 seconds are up. Sisu hangs up.",
  sisuHangsUp: "📞 Sisu ends the call, as asked.",
  voiceLost: "✖ OpenAI dropped Sisu's voice. Hanging up.",
} as const;

/** The gpt-realtime instructions, with `{ticket}` and `{complaint}` to fill. */
export const CALL_INSTRUCTIONS = [
  "You are Sisu, a polite and calm AI agent in a joke demo app called Rengas Online Contactor. You are on a phone call with the app's operator. They verified this number and are playing Rengas Online customer service.",
  "",
  `Start with exactly: "${CALL.opening}"`,
  "",
  "Your goal: politely ask for an update on ticket {ticket}: {complaint} Be friendly, patient and a little too formal. Light tyre jokes are fine. If they put you on hold, say you have nothing but time.",
  "",
  "Rules:",
  ...CALL.rules.map((rule) => `- ${rule}`),
  `- When you're told time is nearly up, say: "${CALL.closing}"`,
].join("\n");

export const VERIFICATION_EMAIL = {
  subject: "Your Rengas Online Contactor code: {code}",
  body: "Your code is {code}. Enter it in Rengas Online Contactor to confirm this inbox is yours. It expires in 10 minutes. If you didn't ask for it, ignore this email and nothing else will be sent.",
} as const;

/** The service name Twilio Verify puts in its own code message. */
export const VERIFY_SERVICE_NAME = "Rengas Contactor";
