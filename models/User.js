import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Not required: users who sign in via Google won't have a password
      select: false,
    },
    image: {
      type: String,
      default: "",
    },
    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },
    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },
    recentTools: [
      {
        toolId: { type: String, required: true },
        label: { type: String, required: true },
        href: { type: String, required: true },
        lastUsedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],

    // Profile
    preferredName: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    customInstructions: { type: String, default: "", maxlength: 2000 },

    // Preferences
    chatFont: {
      type: String,
      enum: ["sans", "serif", "mono"],
      default: "sans",
    },
    reduceMotion: { type: Boolean, default: false },
    notifyOnComplete: { type: Boolean, default: false },

    // Billing (Stripe)
    stripeCustomerId: { type: String, default: "" },
    stripeSubscriptionId: { type: String, default: "" },

    // Text-to-speech: cloned voice IDs (ElevenLabs account is shared across
    // all users, so we track ownership here to scope each user's own voices)
    customVoices: [
      {
        voiceId: { type: String, required: true },
        name: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);