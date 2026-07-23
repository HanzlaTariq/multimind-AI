// Placeholder pricing/credit allowances — these are easy to tune later.
// Nothing else in the codebase needs to change if you adjust the numbers
// here; billing and credit-deduction logic both read from this file.

const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;

export const PLANS = {
  free: {
    label: "Free",
    monthlyCredits: 60,
    priceEnvKey: null, // no Stripe price — always free, no checkout
  },
  basic: {
    label: "Basic",
    monthlyCredits: 1500,
    priceEnvKey: "STRIPE_BASIC_PRICE_ID",
  },
  pro: {
    label: "Pro",
    monthlyCredits: 8000,
    priceEnvKey: "STRIPE_PRO_PRICE_ID",
  },
  business: {
    label: "Business",
    monthlyCredits: 30000,
    priceEnvKey: "STRIPE_BUSINESS_PRICE_ID",
  },
};

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

export function creditsForPlan(plan) {
  return PLANS[plan]?.monthlyCredits ?? PLANS.free.monthlyCredits;
}

export function creditCostForTool(toolId, context = {}) {
  const cost = TOOL_CREDIT_COSTS[toolId];
  if (typeof cost === "function") {
    return cost(context);
  }
  return typeof cost === "number" ? cost : 1;
}

export function resetCreditsIfNeeded(user, now = new Date()) {
  const lastReset = user?.creditsResetAt ? new Date(user.creditsResetAt) : null;
  if (!lastReset || now - lastReset > MS_PER_MONTH) {
    user.credits = creditsForPlan(user.plan);
    user.creditsResetAt = now;
    return true;
  }
  return false;
}

export function getToolCreditState(user, toolId, now = new Date(), context = {}) {
  resetCreditsIfNeeded(user, now);
  const cost = creditCostForTool(toolId, context);
  return {
    canUse: (user.credits ?? 0) >= cost,
    cost,
    creditsRemaining: user.credits ?? 0,
  };
}

export function consumeCreditsForTool(user, toolId, now = new Date(), context = {}) {
  resetCreditsIfNeeded(user, now);
  const cost = creditCostForTool(toolId, context);
  const currentCredits = user.credits ?? 0;
  const canUse = currentCredits >= cost;

  if (!canUse) {
    return { canUse, cost, creditsRemaining: currentCredits };
  }

  user.credits = Math.max(0, currentCredits - cost);
  return { canUse, cost, creditsRemaining: user.credits };
}

export function priceIdForPlan(plan) {
  const envKey = PLANS[plan]?.priceEnvKey;
  return envKey ? process.env[envKey] : null;
}

// Given a Stripe price ID (from a webhook event), find which of our plans it
// corresponds to — used to keep user.plan in sync with what they actually paid for.
export function planForPriceId(priceId) {
  for (const [key, value] of Object.entries(PLANS)) {
    if (value.priceEnvKey && process.env[value.priceEnvKey] === priceId) {
      return key;
    }
  }
  return null;
}