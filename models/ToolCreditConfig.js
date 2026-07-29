import mongoose from "mongoose";

// How many credits each document/PDF/TTS tool charges per use. This is the
// single source of truth for tool pricing — lib/plans.js reads from it
// (with a short in-memory cache) instead of a hardcoded object, the same
// pattern PlanConfig uses for plan pricing.
const ToolCreditConfigSchema = new mongoose.Schema(
  {
    toolId: {
      // Matches the toolId strings used across the app (chat route, pdf
      // routes, tts route, etc.) — e.g. "compress-pdf", "text-to-speech".
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    label: { type: String, required: true, trim: true }, // shown in the admin panel and in user-facing notifications

    // "fixed" — a flat cost per use (most tools).
    // "per-length" — cost scales with input size (currently just
    // text-to-speech): cost = max(minCost, ceil(length / unitSize) * cost).
    costType: { type: String, enum: ["fixed", "per-length"], default: "fixed" },

    cost: { type: Number, required: true, min: 0 },
    minCost: { type: Number, default: 0, min: 0 }, // only meaningful for "per-length" tools
    unitSize: { type: Number, default: 200, min: 1 }, // only meaningful for "per-length" tools

    // Set when an admin schedules a future price change instead of applying
    // it immediately. lib/plans.js promotes these into cost/minCost once
    // effectiveAt has passed, and fires a user-facing notification when it
    // does (see promoteScheduledToolCosts in lib/plans.js).
    scheduledCost: { type: Number, default: null, min: 0 },
    scheduledMinCost: { type: Number, default: null, min: 0 },
    effectiveAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.ToolCreditConfig ||
  mongoose.model("ToolCreditConfig", ToolCreditConfigSchema);