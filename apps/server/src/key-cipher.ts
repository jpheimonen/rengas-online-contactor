import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * AES-256-GCM under a key derived from APP_SECRET (register decision
 * provider-keys). `context` is bound as additional data, so a ciphertext only
 * opens for the session and provider it was written for.
 */
export class KeyCipher {
  readonly #key: Buffer;

  constructor(appSecret: string) {
    this.#key = Buffer.from(
      hkdfSync("sha256", appSecret, "", "rengas provider keys v1", 32),
    );
  }

  /** Returns base64url of IV, auth tag and ciphertext. */
  encrypt(plaintext: string, context: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", this.#key, iv);
    cipher.setAAD(Buffer.from(context));
    const body = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
  }

  /** Throws if the value was changed, or written under another secret or context. */
  decrypt(sealed: string, context: string): string {
    const bytes = Buffer.from(sealed, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.#key,
      bytes.subarray(0, IV_BYTES),
    );
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([
      decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]).toString("utf8");
  }
}
