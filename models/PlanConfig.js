import mongoose from "mongoose";

// Every plan a user can be on — the 4 built-in tiers (free/basic/pro/business)
// AND any custom deal the admin creates (e.g. "summer60" = 60% off Pro).
// This collection is the single source of truth; lib/plans.js reads from it
// (with a short in-memory cache) instead of a hardcoded object.
const PlanConfigSchema = new mongoose.Schema(
  {
    key: {
      // Slug used everywhere else in the app (User.plan, Stripe metadata, etc.)
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "Plan key can only contain lowercase letters, numbers, and hyphens"],
    },
    label: { type: String, required: true, trim: true }, // shown to users, e.g. "Pro" or "Summer Sale — 60% off"
    monthlyCredits: { type: Number, required: true, min: 0 },

    // Full/list price. For a discounted deal, set these to the ORIGINAL price
    // and use discountPercent below — the discounted price is derived, so the
    // "was $24.99, now $9.99" strike-through math stays consistent everywhere.
    priceUSD: { type: Number, default: 0, min: 0 },
    pricePKR: { type: Number, default: 0, min: 0 },
    priceINR: { type: Number, default: 0, min: 0 },

    // 0-100. e.g. 60 means "60% off" the priceUSD/PKR/INR above.
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },

    // Optional Stripe recurring subscription price ID env var name, e.g.
    // "STRIPE_PRO_PRICE_ID". Leave blank for local-only deals (JazzCash/
    // Razorpay one-month purchases) that don't need a Stripe subscription.
    priceEnvKey: { type: String, default: "" },

    // Whether this plan can be bought right now / shown on the pricing page.
    active: { type: Boolean, default: true },
    // Free/basic/pro/business are the built-in tiers and can't be deleted,
    // only edited or deactivated. Anything else (custom deals) can be deleted.
    isCore: { type: Boolean, default: false },

    // Optional short badge text, e.g. "Limited time", "Best value".
    badge: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.PlanConfig || mongoose.model("PlanConfig", PlanConfigSchema);