import { createHash, randomBytes } from "node:crypto";
import { and, asc, count, eq, gt, inArray, isNull } from "drizzle-orm";
import {
  SYSTEM_LINES,
  type AppState,
  type RealCapableAction,
  type RealChannel,
  type SendContent,
  type SendPreview,
  type SimulateReason,
} from "@rengas/shared";
import type { Db } from "../db/client.ts";
import { sendConfirmations, sends } from "../db/schema.ts";
import { problem } from "../errors.ts";
import {
  maskAddress,
  type RecipientChannel,
  type RecipientRow,
  type Recipients,
} from "../recipients/recipients.ts";

export const PREVIEW_TTL_MS = 5 * 60_000;
const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;

/** Real sends allowed per session: per channel each hour, and in total each day. */
export interface SendLimits {
  email: number;
  sms: number;
  voice: number;
  day: number;
}

export const DEFAULT_SEND_LIMITS: SendLimits = {
  email: 3,
  sms: 3,
  voice: 2,
  day: 10,
};

export const recipientChannel = (channel: RealChannel): RecipientChannel =>
  channel === "email" ? "email" : "phone";

const SEND_WORDS: Record<RealChannel, string> = {
  email: "emails",
  sms: "texts",
  voice: "calls",
};

export type Readiness =
  | { ready: true; recipient: RecipientRow }
  | { ready: false; reason: SimulateReason };

/** A preview the operator confirmed: who gets it and exactly what they get. */
export interface ConfirmedSend {
  channel: RealChannel;
  recipient: { address: string; masked: string };
  content: SendContent;
}

/** The record of one real send. The adapter reports the provider's answer. */
export interface SendRecord {
  markSent(providerMessageId: string): void;
  /** The provider refused or the run failed, so the send doesn't count toward the limits. */
  markFailed(): void;
}

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/**
 * Checks every real send on the server (register decision send-guard): a
 * verified recipient, a single-use confirmation token from a preview, and the
 * rate limits. They are checked when the preview is made and again when the
 * run starts, so a crafted request can't skip the UI.
 */
export class SendGuard {
  readonly #db: Db;
  readonly #recipients: Recipients;
  readonly #limits: SendLimits;

  constructor(options: { db: Db; recipients: Recipients; limits: SendLimits }) {
    this.#db = options.db;
    this.#recipients = options.recipients;
    this.#limits = options.limits;
  }

  /** Whether a real send on the channel could go now, and to whom by default. */
  readiness(sessionId: string, channel: RealChannel): Readiness {
    const recipient = this.#recipients.latestVerified(
      sessionId,
      recipientChannel(channel),
    );
    if (!recipient) {
      return {
        ready: false,
        reason: channel === "email" ? "no-verified-inbox" : "no-verified-phone",
      };
    }
    const over = this.#overLimit(sessionId, channel);
    return over ? { ready: false, reason: over } : { ready: true, recipient };
  }

  /** Real sends used and allowed, for `GET /api/state`. */
  limits(sessionId: string): AppState["limits"] {
    const used = (channel: RealChannel) => ({
      used: this.#used(sessionId, HOUR_MS, channel),
      max: this.#limits[channel],
    });
    return {
      hour: { email: used("email"), sms: used("sms"), voice: used("voice") },
      day: { used: this.#used(sessionId, DAY_MS), max: this.#limits.day },
    };
  }

  /**
   * Saves what will be sent and returns it with a confirmation token. The
   * token works once, for this action and session, for 5 minutes.
   */
  preview(
    sessionId: string,
    action: RealCapableAction,
    recipientId: string,
    content: SendContent,
    aiWritten = false,
  ): SendPreview {
    const recipient = this.#recipients.get(sessionId, recipientId);
    if (!recipient) throw problem(404, "not-found", "No such recipient.");
    if (recipient.channel !== recipientChannel(action.channel)) {
      throw problem(
        400,
        "invalid-request",
        action.channel === "email"
          ? "Email goes to an inbox, not a phone."
          : "Texts and calls go to a phone, not an inbox.",
      );
    }
    this.#checkRecipientAndLimits(sessionId, action.channel, recipient);

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS).toISOString();
    this.#db
      .insert(sendConfirmations)
      .values({
        tokenHash: hashToken(token),
        sessionId,
        actionId: action.id,
        recipientId: recipient.id,
        content,
        expiresAt,
      })
      .run();

    const hour = this.#limits[action.channel];
    const day = this.#limits.day;
    return {
      confirmToken: token,
      expiresAt,
      actionId: action.id as SendPreview["actionId"],
      recipient: maskAddress(recipient),
      aiWritten,
      remaining: {
        hour: {
          left: hour - this.#used(sessionId, HOUR_MS, action.channel),
          of: hour,
        },
        day: { left: day - this.#used(sessionId, DAY_MS), of: day },
      },
      content,
    };
  }

  /**
   * Uses up the token and checks the recipient and the limits again. Any
   * refusal also burns the token, so the operator starts from a new preview.
   */
  confirm(
    sessionId: string,
    action: RealCapableAction,
    token: string,
  ): ConfirmedSend {
    const now = new Date().toISOString();
    const confirmation = this.#db
      .update(sendConfirmations)
      .set({ usedAt: now })
      .where(
        and(
          eq(sendConfirmations.tokenHash, hashToken(token)),
          eq(sendConfirmations.sessionId, sessionId),
          eq(sendConfirmations.actionId, action.id),
          isNull(sendConfirmations.usedAt),
          gt(sendConfirmations.expiresAt, now),
        ),
      )
      .returning()
      .get();
    if (!confirmation) {
      throw problem(
        400,
        "token-invalid",
        "This preview has expired or was already used. Open a new preview to send.",
      );
    }
    const recipient = this.#recipients.get(
      sessionId,
      confirmation.recipientId,
    )!;
    this.#checkRecipientAndLimits(sessionId, action.channel, recipient);
    return {
      channel: action.channel,
      recipient: { address: recipient.address, masked: maskAddress(recipient) },
      content: confirmation.content,
    };
  }

  /** Records a confirmed send as pending; it counts toward the limits from now on. */
  record(sessionId: string, runId: string, send: ConfirmedSend): SendRecord {
    const { id } = this.#db
      .insert(sends)
      .values({
        sessionId,
        runId,
        channel: send.channel,
        recipientAddress: send.recipient.address,
        status: "pending",
        createdAt: new Date().toISOString(),
      })
      .returning({ id: sends.id })
      .get();
    const settle = (
      status: "sent" | "failed",
      providerMessageId: string | null,
    ) =>
      this.#db
        .update(sends)
        .set({ status, providerMessageId })
        .where(and(eq(sends.id, id), eq(sends.status, "pending")))
        .run();
    return {
      markSent: (providerMessageId) => settle("sent", providerMessageId),
      markFailed: () => settle("failed", null),
    };
  }

  /** De-escalate: previews not yet confirmed stop working. */
  cancelPending(sessionId: string): void {
    this.#db
      .delete(sendConfirmations)
      .where(
        and(
          eq(sendConfirmations.sessionId, sessionId),
          isNull(sendConfirmations.usedAt),
        ),
      )
      .run();
  }

  #checkRecipientAndLimits(
    sessionId: string,
    channel: RealChannel,
    recipient: RecipientRow,
  ): void {
    if (!recipient.verifiedAt) {
      throw problem(
        409,
        "not-verified",
        "Verify this recipient with its code before sending to it.",
      );
    }
    const over = this.#overLimit(sessionId, channel);
    if (over === "hour-limit") {
      throw problem(
        429,
        "rate-limited",
        SYSTEM_LINES.limitReached
          .replace("{sends}", SEND_WORDS[channel])
          .replace("{time}", this.#freesUpAt(sessionId, channel)),
      );
    }
    if (over === "day-limit") {
      throw problem(
        429,
        "rate-limited",
        `That's all ${this.#limits.day} real sends for today. Everything simulates until tomorrow.`,
      );
    }
  }

  #overLimit(
    sessionId: string,
    channel: RealChannel,
  ): "hour-limit" | "day-limit" | null {
    if (this.#used(sessionId, HOUR_MS, channel) >= this.#limits[channel]) {
      return "hour-limit";
    }
    if (this.#used(sessionId, DAY_MS) >= this.#limits.day) return "day-limit";
    return null;
  }

  /** Real sends that went out or may have, within the last `windowMs`. */
  #used(sessionId: string, windowMs: number, channel?: RealChannel): number {
    const since = new Date(Date.now() - windowMs).toISOString();
    const [row] = this.#db
      .select({ n: count() })
      .from(sends)
      .where(
        and(
          eq(sends.sessionId, sessionId),
          inArray(sends.status, ["pending", "sent"]),
          gt(sends.createdAt, since),
          channel && eq(sends.channel, channel),
        ),
      )
      .all();
    return row!.n;
  }

  /** "14:05": when the oldest send in this hour's window stops counting. */
  #freesUpAt(sessionId: string, channel: RealChannel): string {
    const since = new Date(Date.now() - HOUR_MS).toISOString();
    const oldest = this.#db
      .select({ createdAt: sends.createdAt })
      .from(sends)
      .where(
        and(
          eq(sends.sessionId, sessionId),
          eq(sends.channel, channel),
          inArray(sends.status, ["pending", "sent"]),
          gt(sends.createdAt, since),
        ),
      )
      .orderBy(asc(sends.createdAt))
      .limit(1)
      .get();
    const at = new Date(
      oldest ? Date.parse(oldest.createdAt) + HOUR_MS : Date.now(),
    );
    return at.toTimeString().slice(0, 5);
  }
}
