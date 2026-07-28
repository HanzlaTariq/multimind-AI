import User from "../models/User.js";
import PlanConfig from "../models/PlanConfig.js";
import dbConnect from "./mongodb.js";

// Seed values — only used the very first time the app runs (to populate the
// PlanConfig collection) and as a last-resort fallback if the DB is ever
// unreachable. Once seeded, the ADMIN PANEL is the source of truth: editing
// credits/pricing/adding deals there is what actually changes what users see
// and get charged. Nothing else in the codebase needs to change when the
// admin adjusts numbers — everyone reads through getPlans() below.
const SEED_PLANS = [
  {
    key: "free",
    label: "Free",
    monthlyCredits: 60,
    priceEnvKey: "",
    priceUSD: 0,
    pricePKR: 0,
    priceINR: 0,
    isCore: true,
    sortOrder: 0,
  },
  {
    key: "basic",
    label: "Basic",
    monthlyCredits: 1500,
    priceEnvKey: "STRIPE_BASIC_PRICE_ID",
    priceUSD: 9.99,
    pricePKR: 2799,
    priceINR: 799,
    isCore: true,
    sortOrder: 1,
  },
  {
    key: "pro",
    label: "Pro",
    monthlyCredits: 8000,
    priceEnvKey: "STRIPE_PRO_PRICE_ID",
    priceUSD: 24.99,
    pricePKR: 6999,
    priceINR: 1999,
    isCore: true,
    sortOrder: 2,
  },
  {
    key: "business",
    label: "Business",
    monthlyCredits: 30000,
    priceEnvKey: "STRIPE_BUSINESS_PRICE_ID",
    priceUSD: 59.99,
    pricePKR: 16999,
    priceINR: 4999,
    isCore: true,
    sortOrder: 3,
  },
];

const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 30 * 1000; // 30s — admin edits show up within this window everywhere

// Cached on `global` so it survives across hot reloads in dev and across
// warm serverless invocations in prod (same pattern as lib/mongodb.js).
let cache = global.__planConfigCache;
if (!cache) {
  cache = global.__planConfigCache = { plans: null, loadedAt: 0, seeding: null };
}

function discountedPrice(price, discountPercent) {
  if (!price || !discountPercent) return price;
  return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
}

function toPlanEntry(doc) {
  return {
    key: doc.key,
    label: doc.label,
    monthlyCredits: doc.monthlyCredits,
    priceEnvKey: doc.priceEnvKey || null,
    // Raw list price (what a "was $X" strike-through would show)...
    listPriceUSD: doc.priceUSD,
    listPricePKR: doc.pricePKR,
    listPriceINR: doc.priceINR,
    discountPercent: doc.discountPercent || 0,
    // ...and the actual price a user pays, after any admin-set discount.
    priceUSD: discountedPrice(doc.priceUSD, doc.discountPercent),
    pricePKR: discountedPrice(doc.pricePKR, doc.discountPercent),
    priceINR: discountedPrice(doc.priceINR, doc.discountPercent),
    active: doc.active,
    isCore: doc.isCore,
    badge: doc.badge || "",
    sortOrder: doc.sortOrder || 0,
  };
}

async function seedIfEmpty() {
  const count = await PlanConfig.countDocuments();
  if (count > 0) return;
  await PlanConfig.insertMany(SEED_PLANS, { ordered: false }).catch(() => {});
}

/**
 * Returns the current plans as a { [key]: planEntry } map, reading from
 * MongoDB (with a short cache). This is what the ADMIN PANEL edits and what
 * every credit/pricing decision in the app reads from — there is no
 * hardcoded plan list anymore.
 */
export async function getPlans({ includeInactive = true } = {}) {
  const now = Date.now();
  if (cache.plans && now - cache.loadedAt < CACHE_TTL_MS) {
    return filterPlans(cache.plans, includeInactive);
  }

  try {
    await dbConnect();
    await seedIfEmpty();
    const docs = await PlanConfig.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean();
    const plans = {};
    for (const doc of docs) {
      plans[doc.key] = toPlanEntry(doc);
    }
    // Always guarantee "free" exists even if the DB write above raced/failed.
    if (!plans.free) {
      plans.free = toPlanEntry(SEED_PLANS[0]);
    }
    cache.plans = plans;
    cache.loadedAt = now;
    return filterPlans(plans, includeInactive);
  } catch (err) {
    console.error("getPlans: falling back to seed defaults —", err.message);
    const fallback = {};
    for (const seed of SEED_PLANS) fallback[seed.key] = toPlanEntry(seed);
    return fallback;
  }
}

function filterPlans(plans, includeInactive) {
  if (includeInactive) return plans;
  const out = {};
  for (const [key, plan] of Object.entries(plans)) {
    if (plan.active) out[key] = plan;
  }
  return out;
}

/** Invalidate the cache immediately — call this after any admin write. */
export function invalidatePlansCache() {
  cache.plans = null;
  cache.loadedAt = 0;
}

export const TOOL_CREDIT_COSTS = {
  "compress-pdf": 1,
  "convert-image": 1,
  "convert-spreadsheet": 1,
  "convert-document": 2,
  "merge-pdf": 1,
  "split-pdf": 1,
  "images-to-pdf": 1,
  "pdf-to-images": 2,
  "text-to-speech": ({ text = "" } = {}) => Math.max(3, Math.ceil(text.length / 200)),
};

export async function creditsForPlan(plan) {
  const plans = await getPlans();
  return plans[plan]?.monthlyCredits ?? plans.free.monthlyCredits;
}

export function creditCostForTool(toolId, context = {}) {
  const cost = TOOL_CREDIT_COSTS[toolId];
  if (typeof cost === "function") {
    return cost(context);
  }
  return typeof cost === "number" ? cost : 1;
}

export async function resetCreditsIfNeeded(user, now = new Date()) {
  // A locally-purchased plan (JazzCash/Razorpay) doesn't auto-renew — if its
  // paid period has passed, drop back to free instead of refilling credits
  // for a plan nobody paid for again. Stripe subscribers never have
  // planExpiresAt set (Stripe's own webhook keeps their plan in sync), so
  // this only affects local-gateway purchases.
  if (user.planExpiresAt && now > new Date(user.planExpiresAt)) {
    user.plan = "free";
    user.planExpiresAt = null;
    user.credits = await creditsForPlan("free");
    user.creditsResetAt = now;
    user.lowCreditEmailSentAt = null;
    return true;
  }

  const lastReset = user?.creditsResetAt ? new Date(user.creditsResetAt) : null;
  if (!lastReset || now - lastReset > MS_PER_MONTH) {
    user.credits = await creditsForPlan(user.plan);
    user.creditsResetAt = now;
    user.lowCreditEmailSentAt = null;
    return true;
  }
  return false;
}

export async function getToolCreditState(user, toolId, now = new Date(), context = {}) {
  await resetCreditsIfNeeded(user, now);
  const cost = creditCostForTool(toolId, context);
  return {
    canUse: (user.credits ?? 0) >= cost,
    cost,
    creditsRemaining: user.credits ?? 0,
  };
}

export async function consumeCreditsForTool(user, toolId, now = new Date(), context = {}) {
  await resetCreditsIfNeeded(user, now);
  const cost = creditCostForTool(toolId, context);
  const currentCredits = user.credits ?? 0;
  const canUse = currentCredits >= cost;

  if (!canUse) {
    return { canUse, cost, creditsRemaining: currentCredits };
  }

  user.credits = Math.max(0, currentCredits - cost);
  return { canUse, cost, creditsRemaining: user.credits };
}

/**
 * Atomically deducts `cost` credits — the check (credits >= cost) and the
 * deduction happen as ONE database operation, so two simultaneous requests
 * can never both succeed when only one has enough credits left.
 * Returns the updated user document, or null if they didn't have enough.
 */
export async function chargeCreditsAtomic(userId, cost) {
  const updated = await User.findOneAndUpdate(
    { _id: userId, credits: { $gte: cost } },
    { $inc: { credits: -cost } },
    { new: true }
  );
  const { sendLowCreditEmailIfNeeded } = await import("./email.js");
  await sendLowCreditEmailIfNeeded(updated);
  return updated;
}

export async function priceIdForPlan(plan) {
  const plans = await getPlans();
  const envKey = plans[plan]?.priceEnvKey;
  return envKey ? process.env[envKey] : null;
}

// Amount (whole units, e.g. 2799 for Rs. 2,799) for a plan in a local currency —
// used by the JazzCash (PKR) and Razorpay (INR) checkouts. Reflects any
// admin-set discount automatically.
export async function localPriceForPlan(plan, currency) {
  const plans = await getPlans();
  const tier = plans[plan];
  if (!tier) return null;
  if (currency === "PKR") return tier.pricePKR;
  if (currency === "INR") return tier.priceINR;
  return null;
}

// JazzCash/Razorpay aren't recurring subscriptions the way Stripe is — a
// completed payment here buys this user one month on the plan. Renewal
// requires paying again before the month is up.
export async function applyLocalPlanPurchase(user, plan) {
  user.plan = plan;
  user.credits = await creditsForPlan(plan);
  user.creditsResetAt = new Date();
  user.planExpiresAt = new Date(Date.now() + MS_PER_MONTH);
}

// Given a Stripe price ID (from a webhook event), find which of our plans it
// corresponds to — used to keep user.plan in sync with what they actually paid for.
export async function planForPriceId(priceId) {
  const plans = await getPlans();
  for (const [key, value] of Object.entries(plans)) {
    if (value.priceEnvKey && process.env[value.priceEnvKey] === priceId) {
      return key;
    }
  }
  return null;
}

// Plans a user can actually buy right now (excludes "free" and anything the
// admin has deactivated). Used by the checkout routes instead of a
// hardcoded ["basic","pro","business"] list, so a new custom deal the admin
// creates becomes purchasable immediately.
export async function getUpgradablePlans() {
  const plans = await getPlans({ includeInactive: false });
  return Object.keys(plans).filter((key) => key !== "free");
}