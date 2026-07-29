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
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
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
      // No enum here on purpose — the admin panel can create custom plans
      // (deals/discounts) beyond the 4 built-in tiers, and User.plan needs
      // to accept whatever key that plan was given. Validity is checked
      // against the live PlanConfig list (lib/plans.js) wherever a plan is
      // set, not at the schema level.
      type: String,
      default: "free",
    },
    // 60 here is only a last-resort fallback for the rare case a user gets
    // created without credits explicitly set. The real source of truth for
    // free-plan credits is PlanConfig (lib/plans.js) — every place that
    // creates a new user must pass `credits: await creditsForPlan("free")`
    // explicitly, since this schema default can't read the DB.
    credits: { type: Number, default: 60 },
    creditsResetAt: { type: Date, default: Date.now },
    // Only set for JazzCash/Razorpay purchases, which don't auto-renew like
    // Stripe subscriptions do. Null for free users and Stripe subscribers.
    planExpiresAt: { type: Date, default: null },
    lowCreditEmailSentAt: { type: Date, default: null },

    // Admin panel
    isAdmin: { type: Boolean, default: false },
    banned: { type: Boolean, default: false },
    bannedReason: { type: String, default: "" },
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
    theme: {
      type: String,
      enum: ["midnight", "light", "nord", "sepia"],
      default: "midnight",
    },
    reduceMotion: { type: Boolean, default: false },
    notifyOnComplete: { type: Boolean, default: false },

    // Billing (Stripe)
    stripeCustomerId: { type: String, default: "" },
    stripeSubscriptionId: { type: String, default: "" },

    // Referrals
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    referralCount: { type: Number, default: 0 },
    referralCreditsEarned: { type: Number, default: 0 },

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
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);