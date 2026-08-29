import crypto from "crypto";

/**
 * Field-level encryption for data stored at rest in MongoDB.
 *
 * This encrypts sensitive conversation content (user prompts + AI
 * responses) before it is written to the database, and decrypts it
 * transparently when it is read back out via the Conversation model
 * hooks (see models/Conversation.js). This protects the data if the
 * database itself is ever leaked, dumped, or accessed directly —
 * it does NOT make this a true end-to-end encrypted system, since the
 * application server still has the key and must be able to read the
 * plaintext to send it to the AI providers (Claude, GPT, etc.) and to
 * render it back to the user.
 *
 * Algorithm: AES-256-GCM (authenticated encryption — tampering with
 * ciphertext is detected on decrypt).
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended IV length for GCM
const AUTH_TAG_LENGTH = 16;

// Marks a string as already-encrypted so we never double-encrypt.
const PREFIX = "enc:v1:";

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Add a 64-character hex string (32 bytes) " +
        "to your .env.local — see .env.example for how to generate one."
    );
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must decode to exactly 32 bytes (64 hex characters)."
    );
  }
  return key;
}

/**
 * Encrypts a plaintext string. Empty/nullish input is returned as-is
 * (no point encrypting an empty string, and it keeps default values
 * like "" working without extra branching everywhere).
 */
export function encryptText(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return plaintext;
  }
  if (typeof plaintext !== "string") return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext; // already encrypted

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Store as: enc:v1:<iv>:<authTag>:<ciphertext>  (all base64)
  return (
    PREFIX +
    [iv, authTag, encrypted].map((b) => b.toString("base64")).join(":")
  );
}

/**
 * Decrypts a string previously produced by encryptText. Strings that
 * don't carry the encryption prefix are returned unchanged, so this is
 * safe to call on legacy/plaintext data written before encryption was
 * turned on.
 */
export function decryptText(value) {
  if (value === null || value === undefined || value === "") return value;
  if (typeof value !== "string") return value;
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext, pass through

  try {
    const [, , ivB64, tagB64, dataB64] = value.split(":");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("Failed to decrypt field:", err.message);
    return "[decryption failed]";
  }
}

export function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}