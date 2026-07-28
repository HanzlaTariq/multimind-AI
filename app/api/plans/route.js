import { getPlans } from "@/lib/plans";

// Public endpoint — powers the pricing cards on the user-facing Settings
// page. Always reflects whatever the admin has set in /admin/plans
// (credits, price, discount%) within ~30 seconds, since it reads through
// the same cached getPlans() the rest of the app uses.
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