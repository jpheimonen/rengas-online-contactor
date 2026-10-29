// The escalation ladder: what each rung does and which pretend API keys unlock it.
// Every action here is simulated. Nothing in this app talks to any real service.

export type Channel =
  "web" | "phone" | "email" | "sms" | "voice" | "social" | "osint" | "blimp";

export interface KeySpec {
  id: string;
  label: string;
  placeholder: string;
}

export interface Action {
  id: string;
  label: string;
  channel: Channel;
  /** What the simulated log prints, one line per step. */
  script: string[];
  /** Text read aloud by the browser's own speech synthesis, if any. */
  speech?: string;
}

export interface Rung {
  id: string;
  level: number;
  title: string;
  tagline: string;
  threat: string;
  keys: KeySpec[];
  actions: Action[];
}

export const TARGET = "Rengas Online";

export const RUNGS: Rung[] = [
  {
    id: "polite",
    level: 1,
    title: "Polite Customer Inquiry",
    tagline: "Their customer service number and website. Like a normal person.",
    threat: "Calm",
    keys: [],
    actions: [
      {
        id: "contact-form",
        label: "Fill in the website contact form",
        channel: "web",
        script: [
          "Opening the Rengas Online contact page…",
          'Typing: "Hello! I have a quick question about my order. Thank you so much :)"',
          "Ticking the 'I am not a robot' box (we are, a little).",
          "Form submitted. Expected response time: 1–3 business days.",
        ],
      },
      {
        id: "call-cs",
        label: "Call the customer service number",
        channel: "phone",
        script: [
          "Dialling customer service…",
          '"Your call is important to us. You are number 14 in the queue."',
          "Listening to hold music (smooth jazz, tyre-themed).",
          "Hung up politely after 20 minutes. Will try again tomorrow.",
        ],
      },
    ],
  },
  {
    id: "email",
    level: 2,
    title: "Firmly Worded Email",
    tagline: "One email. Okay, two. With read receipts.",
    threat: "Mildly Concerned",
    keys: [
      {
        id: "smtp",
        label: "Email provider API key",
        placeholder: "SG.xxxxxxxxxxxxxxxx",
      },
    ],
    actions: [
      {
        id: "firm-email",
        label: "Send a firmly worded email",
        channel: "email",
        script: [
          "To: customer service <asiakaspalvelu@rengas-online.example.invalid>",
          "Subject: Re: Re: Re: Fwd: Just following up :)",
          '"As per my last email, which I am sure you saw, because I requested a read receipt…"',
          "Read receipt requested. Passive aggression level: 7/10.",
        ],
      },
    ],
  },
  {
    id: "roboemail",
    level: 3,
    title: "Robo-Emails",
    tagline: "Why send one email when an AI can send nine hundred?",
    threat: "Uncomfortable",
    keys: [
      {
        id: "bulkmail",
        label: "Bulk mailing API key",
        placeholder: "mk-xxxxxxxxxxxxxxxx",
      },
    ],
    actions: [
      {
        id: "email-storm",
        label: "Launch the email storm",
        channel: "email",
        script: [
          "Generating 900 unique emails with a large language model…",
          "Addressing every inbox listed on their site: info@, sales@, careers@, press@, noreply@ (especially noreply@).",
          'Sample subject: "URGENT: Your tyres have a message for you (1 of 900)"',
          "Unsubscribe link points to another email asking why they want to unsubscribe.",
        ],
      },
    ],
  },
  {
    id: "sms",
    level: 4,
    title: "Ominous Text Messages",
    tagline: "Short. Cryptic. Sent at 03:00.",
    threat: "Alarmed",
    keys: [
      {
        id: "sms-sid",
        label: "SMS gateway account ID",
        placeholder: "ACxxxxxxxxxxxxxxxx",
      },
      {
        id: "sms-token",
        label: "SMS gateway auth token",
        placeholder: "xxxxxxxxxxxxxxxx",
      },
    ],
    actions: [
      {
        id: "threat-sms",
        label: "Send menacing SMS",
        channel: "sms",
        script: [
          "To: their customer service line",
          '"We know where your winter tyres sleep."',
          '"Nice tread depth you have there. Would be a shame if something… wore it down evenly over 40 000 km."',
          '"Answer my email or I leave a 3-star review. Not 1 star. 3. Think about what that means."',
        ],
      },
    ],
  },
  {
    id: "robocall",
    level: 5,
    title: "AI Robocalls",
    tagline:
      "A state-of-the-art neural voice that never sleeps, never tires, never re-tyres.",
    threat: "Panicking",
    keys: [
      {
        id: "voice",
        label: "Voice calling API key",
        placeholder: "vc-xxxxxxxxxxxxxxxx",
      },
      {
        id: "tts",
        label: "Neural speech model API key",
        placeholder: "sk-tts-xxxxxxxxxxxx",
      },
    ],
    actions: [
      {
        id: "robocall",
        label: "Start the robocall loop",
        channel: "voice",
        script: [
          "Loading state-of-the-art neural speech model (voice: 'Disappointed Finnish Dad')…",
          "Calling customer service every 4 minutes until someone says 'hello'.",
          "Voicemail left: 42 seconds of sighing, then the script below.",
          "Tip: press 'Hear the robocall' to preview the voice on your own speakers.",
        ],
        speech:
          "Hello. This is an automated call regarding your tyres. Not your tyres. My tyres. " +
          "The ones I asked about. In my email. And my other nine hundred emails. Please call me back. " +
          "I will wait. I am a robot. I have nothing but time.",
      },
    ],
  },
  {
    id: "social",
    level: 6,
    title: "Social Media Siege",
    tagline:
      "Facebook messages, comments on every post, and a review written as a sonnet.",
    threat: "Hiding Under Desk",
    keys: [
      {
        id: "meta",
        label: "Facebook Graph API token",
        placeholder: "EAAGxxxxxxxxxxxxxxxx",
      },
    ],
    actions: [
      {
        id: "fb-siege",
        label: "Message their Facebook page",
        channel: "social",
        script: [
          "Opening Messenger to the Rengas Online page…",
          '"Hi 👋 saw you were Active Now. I was also Active Now. We have so much in common."',
          'Commenting on their 2019 winter tyre post: "still waiting 👀"',
          "Posted a 14-line review in iambic pentameter titled 'Ode to an Unanswered Ticket'.",
        ],
      },
    ],
  },
  {
    id: "osint",
    level: 7,
    title: "Staff Recon",
    tagline:
      "Reads the 'About us' page with a magnifying glass. Finds… people. Possibly.",
    threat: "Changing Name",
    keys: [
      {
        id: "scraper",
        label: "Web scraping API key",
        placeholder: "scr-xxxxxxxxxxxxxxxx",
      },
    ],
    actions: [
      {
        id: "recon",
        label: "Run staff recon (all results invented)",
        channel: "osint",
        script: [
          "Scanning the 'About us' page… found one stock photo of a smiling tyre.",
          "Cross-referencing… 'Reijo Rengasmäki, Head of Tread' (fictional, made up by this app).",
          "Known associates: a forklift, the colour grey, a cactus named Pekka (also fictional).",
          "Conclusion: they are just people at work. Maybe log off and touch grass.",
        ],
      },
    ],
  },
  {
    id: "blimp",
    level: 8,
    title: "Total Escalation",
    tagline: "A blimp. Over their warehouse. With your ticket number on it.",
    threat: "Fleeing Country",
    keys: [
      {
        id: "blimp",
        label: "Blimp rental API key",
        placeholder: "blimp-xxxxxxxxxxxx",
      },
      {
        id: "pigeon",
        label: "Carrier pigeon fleet licence",
        placeholder: "coo-xxxxxxxxxxxxxx",
      },
    ],
    actions: [
      {
        id: "blimp",
        label: "Deploy the blimp",
        channel: "blimp",
        script: [
          "Blimp inflated. Banner reads: 'TICKET #48213 — STILL OPEN'.",
          "137 carrier pigeons released, each holding a printed copy of email 1 of 900.",
          "A mariachi band has been hired to sing your order number outside reception.",
          "Rengas Online has replied: 'Hi! Sorry for the delay, your tyres shipped Tuesday.' 🎉",
        ],
      },
    ],
  },
];

/** Minimum length a pretend key must have to look like a key. */
export const MIN_KEY_LENGTH = 8;

/** Returns an error message if the pretend key does not look like a key, or null if it does. */
export function validateKey(value: string): string | null {
  const key = value.trim();
  if (key === "") return "Enter a key.";
  if (/\s/.test(key)) return "Keys don't have spaces in them.";
  if (key.length < MIN_KEY_LENGTH)
    return `Keys are at least ${MIN_KEY_LENGTH} characters long.`;
  return null;
}

/** A rung is unlocked when every rung below it is unlocked and it has been given its keys. */
export function isUnlocked(
  index: number,
  unlocked: ReadonlySet<string>,
): boolean {
  for (let i = 0; i <= index; i++) {
    const rung = RUNGS[i];
    if (rung.keys.length > 0 && !unlocked.has(rung.id)) return false;
  }
  return true;
}

/** You can only enter keys for the next rung up, not skip ahead. */
export function canAttemptUnlock(
  index: number,
  unlocked: ReadonlySet<string>,
): boolean {
  return (
    index > 0 && !isUnlocked(index, unlocked) && isUnlocked(index - 1, unlocked)
  );
}

/** Index of the highest unlocked rung. */
export function currentLevel(unlocked: ReadonlySet<string>): number {
  let level = 0;
  RUNGS.forEach((_, i) => {
    if (isUnlocked(i, unlocked)) level = i;
  });
  return level;
}
