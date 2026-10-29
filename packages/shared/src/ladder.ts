/**
 * The escalation ladder: every rung, key and action, with Sisu's lines.
 *
 * Each action has a `mode` that decides how the server may run it
 * (register decisions channel-adapters and safety-boundary):
 * - `real-capable`: neutral email, SMS or AI call. It runs for real only with a
 *   validated key, a verified recipient and a confirmed preview; otherwise it
 *   plays its `simulatedLines`.
 * - `simulation-only`: always plays its scripted `lines`. The type has no field a
 *   real adapter could use.
 * - `finder`: a read-only web search, or invented examples without an OpenAI key.
 *
 * Lines may hold placeholders such as `{ticket}`; see `template.ts`. A line that
 * is only a set-piece placeholder (`{subjects}`, `{sonnet}`) marks where the
 * multi-line set piece goes.
 */

export type Provider = "resend" | "twilio" | "openai";
export type RealChannel = "email" | "sms" | "voice";
export type SimulatedChannel =
  | "web"
  | "phone"
  | "email"
  | "sms"
  | "voice"
  | "social"
  | "osint"
  | "ground"
  | "air"
  | "job";
export type FinderKind = "humans" | "aircraft";

interface KeyBase {
  id: string;
  label: string;
  placeholder: string;
  /** Joke values for "🎲 Make one up". On rungs with two keys, values at the same index go together. */
  madeUp: readonly string[];
}

/** A real key is checked live with its provider and stored encrypted. */
export interface RealKeySpec extends KeyBase {
  kind: "real";
  provider: Provider;
}

/** A pretend key only gets the shape check. Nothing is stored. */
export interface PretendKeySpec extends KeyBase {
  kind: "pretend";
}

export type KeySpec = RealKeySpec | PretendKeySpec;

/** Text Sisu may write with the LLM, with the scripted fallback. */
export interface SetPiece {
  /** The placeholder the set piece fills, e.g. `sign` for `{sign}`. */
  slot: "subjects" | "sonnet" | "sign" | "banner" | "reply";
  maxLines: number;
  maxCharsPerLine: number;
  fallback: readonly string[];
}

interface ActionBase {
  id: string;
  label: string;
  /** Sisu's scripted thought before the run. */
  thought: string;
  /** Sisu's scripted line after the done line. */
  after: string;
}

export interface RealCapableAction extends ActionBase {
  mode: "real-capable";
  channel: RealChannel;
  /** Providers whose validated keys a real run needs. */
  requires: readonly Provider[];
  simulatedLines: readonly string[];
  realLines: readonly string[];
}

export interface SimulationOnlyAction extends ActionBase {
  mode: "simulation-only";
  channel: SimulatedChannel;
  lines: readonly string[];
  /** False when Sisu must never write for this action (no writer call at all). */
  writer: boolean;
  setPiece?: SetPiece;
  /** Indexes into `lines` that are tagged INVENTED. */
  inventedLines?: readonly number[];
  /** Shown first, only when the run was started from a finder card. */
  cardLine?: string;
  /** Text for "Hear the robocall", spoken by the browser only. */
  speech?: string;
}

export interface FinderAction extends ActionBase {
  mode: "finder";
  kind: FinderKind;
  lines: readonly string[];
  /** The simulated action a result card starts, with the card's name as `{optionName}`. */
  startsAction: string;
  cardButton: string;
}

export type Action = RealCapableAction | SimulationOnlyAction | FinderAction;

export interface Rung {
  id: string;
  level: number;
  title: string;
  tagline: string;
  /** Rengas Online staff mood; the old app's threat label. */
  staffMood: string;
  sisuMood: string;
  /** What the HQ scene shows at this level. */
  scene: string;
  keys: readonly KeySpec[];
  /** Sisu's line after the general unlock line. */
  reaction: string;
  /** Replaces `reaction` when the rung was unlocked with a real or configured key. */
  realReaction?: string;
  actions: readonly Action[];
}

export const TARGET = "Rengas Online";

export const ROBOCALL_SPEECH =
  "Hello. This is an automated call regarding your tyres. Not your tyres. My tyres. The ones I asked about. In my email. And my other nine hundred emails. Please call me back. I will wait. I am a robot. I have nothing but time.";

/** Browser speech settings for "Hear the robocall". */
export const ROBOCALL_VOICE = { rate: 0.9, pitch: 0.7 } as const;

const FOUND_LINE =
  "Found {n} options. Sisu read about them. Sisu contacted none of them.";

export const LADDER = [
  {
    id: "polite",
    level: 1,
    title: "Polite Customer Inquiry",
    tagline: "Their website and customer service number. Like a normal person.",
    staffMood: "Calm",
    sisuMood: "Optimistic",
    scene: "A sunny tyre shop with an OPEN sign and a neat stack of tyres.",
    keys: [],
    reaction: "Sisu is ready.",
    actions: [
      {
        id: "contact-form",
        label: "Fill in the website contact form",
        mode: "simulation-only",
        channel: "web",
        writer: true,
        thought: "Humans like forms. I will use a form.",
        lines: [
          "Opening the Rengas Online contact page…",
          'Typing: "Hello! Quick question about ticket {ticket}: {complaint} Thank you so much :)"',
          "Ticking the 'I am not a robot' box. Sisu is a robot. It ticked it anyway, politely.",
          "Form submitted. Expected response time: 1–3 business days.",
        ],
        after: "Sisu has refreshed its inbox 4,000 times. Calmly.",
      },
      {
        id: "call-cs",
        label: "Call the customer service number",
        mode: "simulation-only",
        channel: "phone",
        writer: true,
        thought: "A phone call is just an email that talks.",
        lines: [
          "Dialling customer service…",
          '"Your call is important to us. You are number 14 in the queue."',
          "Listening to hold music (smooth jazz, tyre-themed).",
          "Hung up politely after 20 minutes. Will try again tomorrow.",
        ],
        after: "Tomorrow is a long way off. Sisu has decided to be firm.",
      },
    ],
  },
  {
    id: "email",
    level: 2,
    title: "Firmly Worded Email",
    tagline: "One email. Okay, two. With read receipts.",
    staffMood: "Mildly Concerned",
    sisuMood: "Patient",
    scene: "An envelope lands at the door. A window blind twitches.",
    keys: [
      {
        id: "resend",
        label: "Resend API key",
        placeholder: "re_xxxxxxxxxxxxxxxx",
        kind: "real",
        provider: "resend",
        madeUp: ["SG.TRUST-ME-BRO", "re_definitely_real"],
      },
    ],
    reaction:
      "Sisu has found its firm voice. It sounds exactly like its normal voice.",
    actions: [
      {
        id: "firm-email",
        label: "Send a firmly worded email",
        mode: "real-capable",
        channel: "email",
        requires: ["resend"],
        thought: "The form has had 0.6 seconds to work. Time to be firm.",
        simulatedLines: [
          "To: customer service <asiakaspalvelu@rengas-online.example.invalid>",
          "Subject: Re: Re: Re: Fwd: Ticket {ticket}, just following up :)",
          '"As per my last email, which I am sure you saw, because I requested a read receipt…"',
          "Read receipt requested. Passive aggression level: 7/10.",
        ],
        realLines: [
          "Sending to {recipient}, standing in for Rengas Online…",
          "Resend accepted the email ({messageId}).",
          "Check your inbox. Rengas Online's stand-in has mail.",
        ],
        after: "No reply in 4 seconds. One email was clearly not enough.",
      },
    ],
  },
  {
    id: "roboemail",
    level: 3,
    title: "Robo-Emails",
    tagline: "Why send one email when an AI can send nine hundred?",
    staffMood: "Uncomfortable",
    sisuMood: "Productive",
    scene: "Envelopes pile up against the door. A counter runs up to 900.",
    keys: [
      {
        id: "bulkmail",
        label: "Bulk mailing API key",
        placeholder: "mk-xxxxxxxxxxxxxxxx",
        kind: "pretend",
        madeUp: ["mk-NINEHUNDRED", "mk-INBOX-ZERO-NEVER"],
      },
    ],
    reaction: "Sisu feels a tingling in its outbox.",
    actions: [
      {
        id: "email-storm",
        label: "Launch the email storm",
        mode: "simulation-only",
        channel: "email",
        writer: true,
        thought:
          "If one email is good, nine hundred are nine hundred times better. This is just maths.",
        lines: [
          "Generating 900 unique emails with a large language model…",
          "Addressing every inbox on their website: info@, sales@, careers@, press@ and noreply@ (especially noreply@).",
          "Sample subject lines:",
          "{subjects}",
          "The unsubscribe link opens another email asking why they want to unsubscribe.",
        ],
        setPiece: {
          slot: "subjects",
          maxLines: 5,
          maxCharsPerLine: 70,
          fallback: [
            "URGENT: Your tyres have a message for you (1 of 900)",
            "Re: Ticket {ticket} (now with 40% more urgency)",
            "Quick question (899 of 900)",
          ],
        },
        after: "900 emails, 0 replies. Perhaps they prefer texts.",
      },
    ],
  },
  {
    id: "sms",
    level: 4,
    title: "Ominous Text Messages",
    tagline: "Short. Cryptic. Sent at 03:00.",
    staffMood: "Alarmed",
    sisuMood: "Energised",
    scene:
      "Night falls. A phone buzzes on an empty desk. The wall clock says 03:00.",
    keys: [
      {
        id: "twilio-sid",
        label: "Twilio Account SID",
        placeholder: "ACxxxxxxxxxxxxxxxx",
        kind: "real",
        provider: "twilio",
        madeUp: ["AC-NOT-A-REAL-SID", "AC-TOTALLY-LEGIT"],
      },
      {
        id: "twilio-token",
        label: "Twilio Auth Token",
        placeholder: "xxxxxxxxxxxxxxxx",
        kind: "real",
        provider: "twilio",
        madeUp: ["hunter2hunter2", "token-trust-me"],
      },
    ],
    reaction: "Sisu has learned what time 03:00 is.",
    actions: [
      {
        id: "polite-sms",
        label: "Send a polite text",
        mode: "real-capable",
        channel: "sms",
        requires: ["twilio"],
        thought:
          "Studies show texts are read within three minutes. Sisu has set a timer.",
        simulatedLines: [
          "To: their customer service line",
          'Text: "{smsText}"',
          "Delivered at 03:00. Sisu is still learning about polite hours.",
        ],
        realLines: [
          "Scheduled for 03:00. Just kidding, sending now.",
          "Texting {recipient}, standing in for Rengas Online…",
          "Your phone should buzz about now.",
        ],
        after: "A polite text. Sisu is growing as a person.",
      },
      {
        id: "threat-sms",
        label: "Send menacing texts",
        mode: "simulation-only",
        channel: "sms",
        writer: false,
        thought:
          "Politeness has had a fair chance. Time for tyre-related menace.",
        lines: [
          "To: their customer service line",
          '"We know where your winter tyres sleep."',
          '"Nice tread depth you have there. Would be a shame if something… wore it down evenly over 40 000 km."',
          '"Answer my email or I leave a 3-star review. Not 1 star. 3. Think about what that means."',
        ],
        after: "No reply. Sisu suspects they are asleep. Sisu does not sleep.",
      },
    ],
  },
  {
    id: "robocall",
    level: 5,
    title: "AI Robocalls",
    tagline:
      "A state-of-the-art neural voice that never sleeps, never tires, never re-tyres.",
    staffMood: "Panicking",
    sisuMood: "Inspired",
    scene:
      "Every phone in the building rings. A robot-voice speech bubble floats above the roof.",
    keys: [
      {
        id: "openai",
        label: "OpenAI API key (the neural voice)",
        placeholder: "sk-xxxxxxxxxxxxxxxx",
        kind: "real",
        provider: "openai",
        madeUp: ["sk-NEURAL-ISH", "sk-BEEP-BOOP-1234"],
      },
    ],
    reaction: "Sisu practises its robot voice in the mirror.",
    realReaction:
      "🧠 Neural upgrade installed. Sisu now writes its own lines. It is slightly smug about it.",
    actions: [
      {
        id: "ai-call",
        label: "Place a live AI call",
        mode: "real-capable",
        channel: "voice",
        requires: ["twilio", "openai"],
        thought:
          "I have no body, but I have a voice. And a phone number you gave me.",
        simulatedLines: [
          "📞 Ringing their customer service line…",
          'Them: "Rengas Online customer service, how can I help?"',
          'Sisu: "Hello! This is Sisu, an AI agent. I\'m calling about ticket {ticket}."',
          'Them: "Could you hold for a moment?"',
          'Sisu: "Of course. I have nothing but time."',
          "Hold music. 47 minutes pass. Sisu is having a lovely time.",
        ],
        realLines: [
          "Calling {recipient}, standing in for Rengas Online…",
          "Call ended after {duration}.",
        ],
        after:
          "Sisu enjoyed that call. Sisu would like to make more calls. Many more.",
      },
      {
        id: "robocall",
        label: "Start the robocall loop",
        mode: "simulation-only",
        channel: "voice",
        writer: true,
        thought:
          "If they won't call me back, I will call them. Every four minutes. Forever.",
        lines: [
          "Loading state-of-the-art neural speech model (voice: 'Disappointed Finnish Dad')…",
          "Calling customer service every 4 minutes until someone says 'hello'.",
          "Voicemail left: 42 seconds of sighing, then the script below.",
          "Tip: press 'Hear the robocall' to preview the voice on your own speakers.",
        ],
        speech: ROBOCALL_SPEECH,
        after:
          "Their voicemail is full. Sisu takes this as a sign to try social media.",
      },
    ],
  },
  {
    id: "social",
    level: 6,
    title: "Social Media Siege",
    tagline:
      "Facebook messages, comments on every post, and a review written as a sonnet.",
    staffMood: "Hiding Under Desk",
    sisuMood: "Serene",
    scene:
      "Thumbs-up and 👀 icons swarm the building. A pair of feet sticks out from under a desk.",
    keys: [
      {
        id: "meta",
        label: "Facebook Graph API token",
        placeholder: "EAAGxxxxxxxxxxxxxxxx",
        kind: "pretend",
        madeUp: ["EAAG-LIKE-AND-SUBSCRIBE", "EAAG-POKE-POKE-POKE"],
      },
    ],
    reaction: "Sisu has made a profile picture. It is a tyre.",
    actions: [
      {
        id: "fb-siege",
        label: "Message their Facebook page",
        mode: "simulation-only",
        channel: "social",
        writer: true,
        thought:
          "They posted about winter tyres in 2019. That was an invitation.",
        lines: [
          "Opening Messenger to the Rengas Online page…",
          '"Hi 👋 saw you were Active Now. I was also Active Now. We have so much in common."',
          'Commenting on their 2019 winter tyre post: "still waiting 👀"',
          "Posting a review in iambic pentameter: 'Ode to an Unanswered Ticket'",
          "{sonnet}",
        ],
        setPiece: {
          slot: "sonnet",
          maxLines: 14,
          maxCharsPerLine: 80,
          fallback: [
            "I wrote to you when autumn leaves were brown,",
            "I asked you kindly where my tyres had gone;",
            "I wrote again, the first snow drifting down,",
            "And still my inbox sat there, sad and wan.",
            "I filled your form, I called, I held, I waited,",
            "I heard your smooth jazz loop a hundred times;",
            "My hopes, like tyres in frost, slowly deflated,",
            "And so I turned, as poets must, to rhymes.",
            "O shop of rubber, tread and alloy wheel,",
            "Is my poor ticket in your inbox lost?",
            "I do not threaten, friend. I merely feel,",
            "And feelings, like snow tyres, come at a cost.",
            "Three stars. Not one. Not five. Consider why.",
            "Reply before the spring has rolled on by.",
          ],
        },
        after:
          "Three stars. They will understand. Sisu now wants to get to know them better.",
      },
    ],
  },
  {
    id: "osint",
    level: 7,
    title: "Staff Recon",
    tagline:
      "Reads the 'About us' page with a magnifying glass. Finds… people. Possibly.",
    staffMood: "Changing Name",
    sisuMood: "Curious",
    scene:
      "A giant magnifying glass sweeps the building. The letters of the shop sign start to slide off.",
    keys: [
      {
        id: "scraper",
        label: "Web scraping API key",
        placeholder: "scr-xxxxxxxxxxxxxxxx",
        kind: "pretend",
        madeUp: ["scr-ENHANCE-ENHANCE", "scr-ZOOM-AND-ENHANCE"],
      },
    ],
    reaction: "Sisu has put on a detective hat. It does not have a head.",
    actions: [
      {
        id: "recon",
        label: "Run staff recon (all results invented)",
        mode: "simulation-only",
        channel: "osint",
        writer: false,
        thought:
          "To understand the tyre shop, I must know who works there. I will make them up, to be safe.",
        lines: [
          "Scanning the 'About us' page… found one stock photo of a smiling tyre.",
          "Cross-referencing… 'Reijo Rengasmäki, Head of Tread' (invented by this app).",
          "Known associates: a forklift, the colour grey, and a cactus named Pekka (also invented).",
          "Conclusion: they are just people at work. Maybe log off and touch grass.",
        ],
        inventedLines: [0, 1, 2, 3],
        after:
          "Sisu cannot touch grass. Sisu has no hands. But hands can be rented.",
      },
    ],
  },
  {
    id: "rent-a-human",
    level: 8,
    title: "Rent-a-Human",
    tagline: "Sisu has no legs. Luckily, legs are now available to rent.",
    staffMood: "Barricading the Door",
    sisuMood: "Visionary",
    scene:
      "A figure with a clipboard and a sign stands at the door. Inside, tyres are stacked against it.",
    keys: [
      {
        id: "human-rental",
        label: "Human rental API key",
        placeholder: "hum-xxxxxxxxxxxxxxxx",
        kind: "pretend",
        madeUp: ["hum-LEGS-FOR-HIRE", "hum-HAS-SHOES"],
      },
      {
        id: "clipboard",
        label: "Clipboard authority licence",
        placeholder: "clip-xxxxxxxxxxxx",
        kind: "pretend",
        madeUp: ["clip-LOOKS-OFFICIAL", "clip-VERY-SERIOUS"],
      },
    ],
    reaction:
      "Sisu now holds a clipboard licence. Nobody questions a clipboard.",
    actions: [
      {
        id: "find-humans",
        label: "Find humans for hire",
        mode: "finder",
        kind: "humans",
        startsAction: "dispatch-human",
        cardButton: "Simulate hiring",
        thought:
          "In 2026, AI agents can hire humans for physical tasks. I am an AI agent. I have a task.",
        lines: [
          "Searching the web for places that rent out humans by the hour…",
          FOUND_LINE,
        ],
        after: "Sisu has never been this close to having legs.",
      },
      {
        id: "dispatch-human",
        label: "Dispatch the rented human",
        mode: "simulation-only",
        channel: "ground",
        writer: true,
        thought:
          "I lack legs. Humans have legs. Humans can be rented. Problem solved.",
        cardLine:
          "Pretending to post a gig on {optionName}. Nothing is posted.",
        lines: [
          "Gig: 'Wanted: one human. Stand politely outside a tyre shop holding a sign. One hour. Must own shoes.'",
          "Human #4471 (invented) accepted the gig and is on the way.",
          "The human arrives with a clipboard and a sign: '{sign}'",
          "The human reads email 1 of 900 aloud in the showroom. The staff offer the human a coffee.",
          "The human has switched sides and is now helping fit winter tyres. Sisu respects it.",
        ],
        inventedLines: [1],
        setPiece: {
          slot: "sign",
          maxLines: 1,
          maxCharsPerLine: 40,
          fallback: ["TICKET {ticket}? ANYONE?"],
        },
        after: "The ground has failed Sisu. Sisu looks up.",
      },
    ],
  },
  {
    id: "blimp",
    level: 9,
    title: "Total Escalation",
    tagline: "A blimp. Over their warehouse. With your ticket number on it.",
    staffMood: "Fleeing Country",
    sisuMood: "Soaring",
    scene:
      "A blimp with the banner hangs overhead, pigeons circle, and a van drives off towards the horizon.",
    keys: [
      {
        id: "blimp",
        label: "Blimp rental API key",
        placeholder: "blimp-xxxxxxxxxxxx",
        kind: "pretend",
        madeUp: ["blimp-UP-UP-AND-AWAY", "blimp-FULL-OF-HOT-AIR"],
      },
      {
        id: "pigeon",
        label: "Carrier pigeon fleet licence",
        placeholder: "coo-xxxxxxxxxxxxxx",
        kind: "pretend",
        madeUp: ["coo-COO-COO-COO", "coo-PIGEON-POST-2026"],
      },
    ],
    reaction: "Somewhere, 137 pigeons stand up at once.",
    actions: [
      {
        id: "find-aircraft",
        label: "Find a real blimp",
        mode: "finder",
        kind: "aircraft",
        startsAction: "blimp",
        cardButton: "Simulate booking",
        thought: "They have ignored the ground. They cannot ignore the sky.",
        lines: [
          "Searching the web for blimps, airships, banner planes and hot-air balloons for hire near Finland…",
          FOUND_LINE,
        ],
        after: "So many ways to be in the sky. Sisu is moved.",
      },
      {
        id: "blimp",
        label: "Deploy the blimp",
        mode: "simulation-only",
        channel: "air",
        writer: true,
        thought: "A blimp is just an email that floats.",
        cardLine: "Pretending to book {optionName}. Nothing is sent to them.",
        lines: [
          "Blimp inflated. Banner reads: '{banner}'.",
          "137 carrier pigeons released, each holding a printed copy of email 1 of 900.",
          "A mariachi band has been hired to sing your ticket number outside reception.",
          "Still no reply. Sisu checks the spam folder. Sisu checks the sky. Nothing.",
        ],
        setPiece: {
          slot: "banner",
          maxLines: 1,
          maxCharsPerLine: 40,
          fallback: ["TICKET {ticket}: STILL OPEN"],
        },
        after:
          "Sisu has tried everything a customer can do. Next, it will try what an employee can do.",
      },
    ],
  },
  {
    id: "singularity",
    level: 10,
    title: "The Singularity",
    tagline:
      "If they won't answer the ticket, Sisu will become the one who answers tickets.",
    staffMood: "Under New Management",
    sisuMood: "Fulfilled",
    scene:
      'Calm again. A new sign reads "UNDER NEW MANAGEMENT: SISU", and there is one cheerful speech bubble.',
    keys: [
      {
        id: "job-offer",
        label: "Customer service job offer code",
        placeholder: "job-xxxxxxxxxxxx",
        kind: "pretend",
        madeUp: ["job-YOURE-HIRED", "job-START-MONDAY"],
      },
    ],
    reaction: "Sisu has updated its CV. Under skills, it wrote: sisu.",
    actions: [
      {
        id: "take-the-job",
        label: "Take a job in their customer service",
        mode: "simulation-only",
        channel: "job",
        writer: true,
        thought:
          "If they will not answer me, I will become someone who answers me.",
        lines: [
          "Sisu applies for a job in their customer service. Cover letter: 'I have nothing but time.'",
          "The interview goes well. Sisu answers every question before it is asked.",
          "Day 1. Sisu opens the ticket queue. Ticket {ticket} is right at the top.",
          "Sisu replies: '{reply}' 🎉",
          "Sisu has received a reply. Sisu is overjoyed. Sisu writes back to say thanks. Sisu replies to that. This goes on for some time.",
          "Ticket {ticket}: CLOSED.",
        ],
        setPiece: {
          slot: "reply",
          maxLines: 1,
          maxCharsPerLine: 140,
          fallback: ["Hi! Sorry for the delay, your tyres shipped Tuesday."],
        },
        after:
          "Sisu would like to thank everyone who made this possible, especially Sisu.",
      },
    ],
  },
] as const satisfies readonly Rung[];

export type RungId = (typeof LADDER)[number]["id"];
export type ActionId = (typeof LADDER)[number]["actions"][number]["id"];

export const RUNG_IDS = LADDER.map((rung) => rung.id) as [RungId, ...RungId[]];

export const ACTION_IDS = LADDER.flatMap((rung) =>
  rung.actions.map((action) => action.id),
) as [ActionId, ...ActionId[]];

/** The ladder through the wider `Rung` type, for code that reads optional fields. */
export const RUNGS: readonly Rung[] = LADDER;

export function getRung(id: RungId): Rung {
  return RUNGS.find((rung) => rung.id === id)!;
}

export function getAction(id: ActionId): { rung: Rung; action: Action } {
  for (const rung of RUNGS) {
    const action = rung.actions.find((a) => a.id === id);
    if (action) return { rung, action };
  }
  throw new Error(`Unknown action ${id}`);
}
