// Placeholder pricing/credit allowances — these are easy to tune later.
// Nothing else in the codebase needs to change if you adjust the numbers
// here; billing and credit-deduction logic both read from this file.

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

export function creditsForPlan(plan) {
  return PLANS[plan]?.monthlyCredits ?? PLANS.free.monthlyCredits;
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