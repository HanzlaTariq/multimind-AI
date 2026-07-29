import { getPlans } from "@/lib/plans";

// Public endpoint — powers the pricing cards on the user-facing Settings
// page. Always reflects whatever the admin has set in /admin/plans
// (credits, price, discount%) within ~30 seconds, since it reads through
// the same cached getPlans() the rest of the app uses.
//
// IMPORTANT: this route touches no cookies/headers, so without an explicit
// "dynamic" flag Next.js's App Router treats it as static and caches the
// HTTP response indefinitely at the platform level (Full Route Cache) —
// separate from, and on top of, the in-memory getPlans() cache. That meant
// admin edits (which DO invalidate the in-memory cache) never showed up
// here, because the cached *response* itself was never re-executed.
// Forcing it dynamic makes every request actually re-run GET().
export const dynamic = "force-dynamic";

export async function GET() {
  const plans = await getPlans({ includeInactive: false });

  const list = Object.values(plans)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      key: p.key,
      label: p.label,
      monthlyCredits: p.monthlyCredits,
      priceUSD: p.priceUSD,
      pricePKR: p.pricePKR,
      priceINR: p.priceINR,
      listPriceUSD: p.listPriceUSD,
      listPricePKR: p.listPricePKR,
      listPriceINR: p.listPriceINR,
      discountPercent: p.discountPercent,
      badge: p.badge,
    }));

  return Response.json({ plans: list });
}