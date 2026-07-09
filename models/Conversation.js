import mongoose from "mongoose";

const ResponseSchema = new mongoose.Schema(
  {
    model: { type: String, enum: ["gemini", "groq", "deepseek", "multimind"], required: true },
    text: { type: String, default: "" },
    latencyMs: { type: Number, default: 0 },
    status: { type: String, enum: ["ok", "error"], default: "ok" },
  },
  { _id: false }
);

const TurnSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
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
  },
  { timestamps: true }
);

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);