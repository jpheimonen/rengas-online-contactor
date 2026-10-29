import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { and, count, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import type { CreateRecipientRequest, Recipient } from "@rengas/shared";
import type { Db } from "../db/client.ts";
import { recipients, verificationCodes } from "../db/schema.ts";
import { problem } from "../errors.ts";
import type { Credentials, KeyVault } from "../keys.ts";
import type { CodeSender } from "./code-sender.ts";

export const CODE_TTL_MS = 10 * 60_000;
export const MAX_CODE_ATTEMPTS = 5;
/** Codes go to addresses nobody has verified yet, so a session may send only a few. */
export const MAX_CODES_PER_HOUR = 5;

export type RecipientRow = typeof recipients.$inferSelect;
export type RecipientChannel = RecipientRow["channel"];

/** "j•••@gmail.com" or "+358 40 ••• 12". The full address never goes to the browser. */
export function maskAddress({ channel, address }: RecipientRow): string {
  if (channel === "email") {
    const at = address.lastIndexOf("@");
    return `${address[0]}•••${address.slice(at)}`;
  }
  return `${address.slice(0, 4)} ${address.slice(4, 6)} ••• ${address.slice(-2)}`;
}

const toRecipient = (row: RecipientRow): Recipient => ({
  id: row.id,
  channel: row.channel,
  masked: maskAddress(row),
  verified: row.verifiedAt !== null,
});

const NO_KEY = {
  email:
    "Sending a code needs a real Resend key. Unlock level 2 with one, or set RESEND_API_KEY on the server.",
  phone:
    "Sending a code needs a real Twilio account. Unlock level 4 with one, or set the Twilio keys on the server.",
} as const;

/**
 * The operator's own inbox and phone, proved with a 6-digit code (register
 * decision send-guard). Email codes are stored only as an HMAC under
 * APP_SECRET, expire after 10 minutes and allow 5 tries. Twilio Verify checks
 * phone codes. De-escalate cancels codes not yet entered but keeps verified
 * recipients (register decision de-escalate-scope).
 */
export class Recipients {
  readonly #db: Db;
  readonly #keyVault: KeyVault;
  readonly #codeSender: CodeSender;
  readonly #secret: string;

  constructor(options: {
    db: Db;
    keyVault: KeyVault;
    codeSender: CodeSender;
    secret: string;
  }) {
    this.#db = options.db;
    this.#keyVault = options.keyVault;
    this.#codeSender = options.codeSender;
    this.#secret = options.secret;
  }

  list(sessionId: string): Recipient[] {
    return this.#db
      .select()
      .from(recipients)
      .where(eq(recipients.sessionId, sessionId))
      .orderBy(recipients.createdAt)
      .all()
      .map(toRecipient);
  }

  get(sessionId: string, id: string): RecipientRow | undefined {
    return this.#db
      .select()
      .from(recipients)
      .where(and(eq(recipients.sessionId, sessionId), eq(recipients.id, id)))
      .get();
  }

  /** The most recently verified recipient on the channel, which real sends use by default. */
  latestVerified(
    sessionId: string,
    channel: RecipientChannel,
  ): RecipientRow | undefined {
    return this.#db
      .select()
      .from(recipients)
      .where(
        and(
          eq(recipients.sessionId, sessionId),
          eq(recipients.channel, channel),
          isNotNull(recipients.verifiedAt),
        ),
      )
      .orderBy(desc(recipients.verifiedAt))
      .limit(1)
      .get();
  }

  /** Adds the address, or finds it again, and sends it a new code. A verified address gets no code. */
  async add(
    sessionId: string,
    request: CreateRecipientRequest,
  ): Promise<Recipient> {
    const existing = this.#db
      .select()
      .from(recipients)
      .where(
        and(
          eq(recipients.sessionId, sessionId),
          eq(recipients.address, request.address),
        ),
      )
      .get();
    if (existing?.verifiedAt) return toRecipient(existing);

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60_000).toISOString();
    const [sent] = this.#db
      .select({ n: count() })
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.sessionId, sessionId),
          gt(verificationCodes.sentAt, hourAgo),
        ),
      )
      .all();
    if (sent!.n >= MAX_CODES_PER_HOUR) {
      throw problem(
        429,
        "rate-limited",
        `That's ${MAX_CODES_PER_HOUR} codes this hour. Try again later.`,
      );
    }

    let codeHash: string | null = null;
    if (request.channel === "email") {
      const credentials = this.#credentials(sessionId, "email");
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      await this.#codeSender.sendEmailCode(credentials, request.address, code);
      codeHash = this.#hash(request.address, code);
    } else {
      const credentials = this.#credentials(sessionId, "phone");
      await this.#codeSender.startPhoneCode(credentials, request.address);
    }

    // The code is out; save it and the recipient in one step.
    return this.#db.transaction((tx) => {
      const row =
        existing ??
        tx
          .insert(recipients)
          .values({
            id: randomUUID(),
            sessionId,
            channel: request.channel,
            address: request.address,
            createdAt: now.toISOString(),
          })
          .returning()
          .get();
      tx.update(verificationCodes)
        .set({ closedAt: now.toISOString() })
        .where(
          and(
            eq(verificationCodes.recipientId, row.id),
            isNull(verificationCodes.closedAt),
          ),
        )
        .run();
      tx.insert(verificationCodes)
        .values({
          sessionId,
          recipientId: row.id,
          codeHash,
          expiresAt: new Date(now.getTime() + CODE_TTL_MS).toISOString(),
          sentAt: now.toISOString(),
        })
        .run();
      return toRecipient(row);
    });
  }

  async verify(
    sessionId: string,
    id: string,
    code: string,
  ): Promise<Recipient> {
    const recipient = this.get(sessionId, id);
    if (!recipient) throw problem(404, "not-found", "No such recipient.");
    if (recipient.verifiedAt) return toRecipient(recipient);

    const pending = this.#db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.recipientId, id),
          isNull(verificationCodes.closedAt),
        ),
      )
      .get();
    const now = new Date();
    if (!pending || pending.expiresAt <= now.toISOString()) {
      if (pending) this.#close(pending.id, now);
      throw problem(
        409,
        "code-expired",
        "That code has expired or was cancelled. Send a new one.",
      );
    }

    if (recipient.channel === "email") {
      if (pending.attempts >= MAX_CODE_ATTEMPTS) {
        this.#close(pending.id, now);
        throw problem(
          409,
          "code-expired",
          "Too many tries for that code. Send a new one.",
        );
      }
      this.#db
        .update(verificationCodes)
        .set({ attempts: pending.attempts + 1 })
        .where(eq(verificationCodes.id, pending.id))
        .run();
      const expected = Buffer.from(pending.codeHash!, "hex");
      const given = Buffer.from(this.#hash(recipient.address, code), "hex");
      if (!timingSafeEqual(expected, given)) {
        const left = MAX_CODE_ATTEMPTS - pending.attempts - 1;
        throw problem(
          422,
          "code-invalid",
          `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`,
        );
      }
    } else {
      const credentials = this.#credentials(sessionId, "phone");
      const result = await this.#codeSender.checkPhoneCode(
        credentials,
        recipient.address,
        code,
      );
      if (result === "expired") {
        this.#close(pending.id, now);
        throw problem(
          409,
          "code-expired",
          "That code has expired or had too many tries. Send a new one.",
        );
      }
      if (result === "wrong") {
        throw problem(422, "code-invalid", "That code isn't right.");
      }
    }

    // A De-escalate during the Twilio check cancels the code: don't verify then.
    const verified = this.#db.transaction((tx) => {
      const closed = tx
        .update(verificationCodes)
        .set({ closedAt: now.toISOString() })
        .where(
          and(
            eq(verificationCodes.id, pending.id),
            isNull(verificationCodes.closedAt),
          ),
        )
        .run();
      if (closed.changes === 0) return undefined;
      return tx
        .update(recipients)
        .set({ verifiedAt: now.toISOString() })
        .where(eq(recipients.id, id))
        .returning()
        .get();
    });
    if (!verified) {
      throw problem(
        409,
        "code-expired",
        "That code was cancelled. Send a new one.",
      );
    }
    return toRecipient(verified);
  }

  remove(sessionId: string, id: string): void {
    const removed = this.#db
      .delete(recipients)
      .where(and(eq(recipients.sessionId, sessionId), eq(recipients.id, id)))
      .run();
    if (removed.changes === 0) {
      throw problem(404, "not-found", "No such recipient.");
    }
  }

  /** De-escalate: codes not yet entered stop working. */
  cancelPendingCodes(sessionId: string): void {
    this.#db
      .update(verificationCodes)
      .set({ closedAt: new Date().toISOString() })
      .where(
        and(
          eq(verificationCodes.sessionId, sessionId),
          isNull(verificationCodes.closedAt),
        ),
      )
      .run();
  }

  #credentials(sessionId: string, channel: "email"): Credentials["resend"];
  #credentials(sessionId: string, channel: "phone"): Credentials["twilio"];
  #credentials(sessionId: string, channel: RecipientChannel) {
    const credentials = this.#keyVault.credentials(
      sessionId,
      channel === "email" ? "resend" : "twilio",
    );
    if (!credentials) throw problem(409, "not-configured", NO_KEY[channel]);
    return credentials;
  }

  #hash(address: string, code: string): string {
    return createHmac("sha256", this.#secret)
      .update(`${address}\n${code}`)
      .digest("hex");
  }

  #close(id: number, now: Date): void {
    this.#db
      .update(verificationCodes)
      .set({ closedAt: now.toISOString() })
      .where(eq(verificationCodes.id, id))
      .run();
  }
}
