import type { FinderKind } from "./ladder.ts";

/** What each finder card shows. Example cards have no link. */
export interface FinderOption {
  name: string;
  offer: string;
  /** null shows as "price not stated". */
  price: string | null;
  location: string;
  sourceUrl: string | null;
}

export const FINDER_COPY = {
  webCardLabel: "Found on the web · not contacted · not booked",
  exampleCardLabel: "EXAMPLE · invented business",
  priceNotStated: "price not stated",
} as const;

/** Invented examples shown without an OpenAI key. The names can't match a real company. */
export const FINDER_EXAMPLES: Record<FinderKind, readonly FinderOption[]> = {
  humans: [
    {
      name: "Guy With Clipboard Ltd",
      offer: "One serious-looking person with a clipboard, by the hour.",
      price: "€25 an hour",
      location: "Invented",
      sourceUrl: null,
    },
    {
      name: "Sign Holders Anonymous",
      offer: "Professional sign holding. Will not make eye contact.",
      price: "Price on request",
      location: "Invented",
      sourceUrl: null,
    },
    {
      name: "Rent-a-Cousin",
      offer: "Someone's cousin. Has a van.",
      price: "Free, but you help him move on Saturday",
      location: "Invented",
      sourceUrl: null,
    },
  ],
  aircraft: [
    {
      name: "Totally Real Airships",
      offer: "Airship flights with a banner of your choice.",
      price: "From €9,999 an hour",
      location: "Invented",
      sourceUrl: null,
    },
    {
      name: "Banner Plane Barry",
      offer: "Tows a banner along the coast. Summer only.",
      price: "Price on request",
      location: "Invented",
      sourceUrl: null,
    },
    {
      name: "Balloon of Mild Concern",
      offer:
        "Hot-air balloon with your logo. Weather permitting, which it isn't.",
      price: null,
      location: "Invented",
      sourceUrl: null,
    },
  ],
};
