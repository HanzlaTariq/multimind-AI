import mongoose from "mongoose";
import { encryptText, decryptText } from "@/lib/encryption";

// One connected social account (e.g. "this user's Instagram Business
// account"). A user can have more than one connection per platform (two
// Instagram accounts), so this is not unique on (user, platform) alone —
// it's unique on (user, platform, accountId).
const ConnectionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    platform: {
      type: String,
      enum: ["instagram", "facebook", "whatsapp", "tiktok", "twitter"],
      required: true,
    },
    accountId: { type: String, required: true }, // platform's own id for this account
    accountName: { type: String, default: "" }, // display name/handle shown in the UI

    // Encrypted at rest via the same field-level AES-256-GCM scheme used
    // for conversation content (see lib/encryption.js) — these are
    // credentials, arguably more sensitive than chat text. Never select
    // these fields by default (see `select: false` below); load them
    // explicitly only inside the execution engine right before an API
    // call is made, and never send them back to the client.
    accessToken: { type: String, required: true, select: false },
    refreshToken: { type: String, default: null, select: false },
    expiresAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["connected", "expired", "revoked"],
      default: "connected",
    },
  },
  { timestamps: true },
);

ConnectionSchema.index({ user: 1, platform: 1 });
ConnectionSchema.index({ user: 1, platform: 1, accountId: 1 }, { unique: true });

// Encrypt tokens on the way in. encryptText() is idempotent (it no-ops on
// already-encrypted or empty values), so this is safe to run on every save
// even if a caller already passed an encrypted string through.
ConnectionSchema.pre("save", function encryptTokensBeforeSave(next) {
  if (this.isModified("accessToken")) {
    this.accessToken = encryptText(this.accessToken);
  }
  if (this.isModified("refreshToken")) {
    this.refreshToken = encryptText(this.refreshToken);
  }
  next();
});

// Convenience for callers that explicitly .select("+accessToken
// +refreshToken") — decrypts both tokens and returns plain strings.
// Doesn't mutate the document, since the encrypted form is what should
// stay in memory/get saved back.
ConnectionSchema.methods.getDecryptedTokens = function getDecryptedTokens() {
  return {
    accessToken: decryptText(this.accessToken),
    refreshToken: decryptText(this.refreshToken),
  };
};

export default mongoose.models.Connection || mongoose.model("Connection", ConnectionSchema);
