import mongoose from "mongoose";
import { encryptText, decryptText } from "@/lib/encryption";

const ResponseSchema = new mongoose.Schema(
  {
    model: {
      type: String,
      enum: ["gemini", "groq", "deepseek", "grok", "openai", "claude", "multimind"],
      required: true,
    },
    type: { type: String, enum: ["text", "image"], default: "text" },
    text: { type: String, default: "" },
    imageData: { type: String, default: "" }, // data URL for generated images
    latencyMs: { type: Number, default: 0 },
    status: { type: String, enum: ["ok", "error"], default: "ok" },
  },
  { _id: false }
);

const TurnSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    attachmentName: { type: String, default: "" },
    responses: [ResponseSchema],
    best: ResponseSchema,
    pinned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "New conversation" },
    turns: [TurnSchema],
    shareId: { type: String, unique: true, sparse: true },
    isPublic: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
  },
  { timestamps: true }
);

// Full-text search on `title` no longer works via a Mongo index, since
// title is encrypted at rest (see below) — ciphertext isn't meaningfully
// indexable. Title/content search is done in the application layer
// instead (see app/api/conversations/search/route.js and
// app/api/admin/conversations/route.js).

// --- Encryption at rest -----------------------------------------------
// title, turn.prompt, each response.text, and turn.best.text hold real
// user/chat content, so we encrypt them before they hit MongoDB and
// decrypt them transparently whenever a conversation is loaded. This
// protects the data if the database is ever dumped or accessed
// directly. It is NOT end-to-end encryption: the app server still holds
// the key, because it has to read the plaintext to send it to the AI
// providers and to display it back to the user.

function encryptTurns(turns) {
  for (const turn of turns || []) {
    if (turn.prompt) turn.prompt = encryptText(turn.prompt);
    for (const r of turn.responses || []) {
      if (r.text) r.text = encryptText(r.text);
    }
    if (turn.best && turn.best.text) {
      turn.best.text = encryptText(turn.best.text);
    }
  }
}

function decryptTurns(turns) {
  for (const turn of turns || []) {
    if (turn.prompt) turn.prompt = decryptText(turn.prompt);
    for (const r of turn.responses || []) {
      if (r.text) r.text = decryptText(r.text);
    }
    if (turn.best && turn.best.text) {
      turn.best.text = decryptText(turn.best.text);
    }
  }
}

// Encrypt right before writing to MongoDB (covers .save() on both new
// and existing documents).
ConversationSchema.pre("save", function (next) {
  if (this.title) this.title = encryptText(this.title);
  encryptTurns(this.turns);
  next();
});

// Decrypt right after reading, for every query shape the app uses
// (find, findOne, findOneAndUpdate with new:true, .lean() or not).
function decryptQueryResult(result) {
  if (!result) return;
  const docs = Array.isArray(result) ? result : [result];
  for (const doc of docs) {
    if (!doc) continue;
    if (doc.title) doc.title = decryptText(doc.title);
    if (doc.turns) decryptTurns(doc.turns);
  }
}

ConversationSchema.post(["find", "findOne", "findOneAndUpdate"], function (result) {
  decryptQueryResult(result);
});

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);