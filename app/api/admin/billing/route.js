import { requireAdmin } from "@/lib/admin";
import { getStripe } from "@/lib/stripe";
import { planForPriceId } from "@/lib/plans";

// Normalizes a subscription's price to a monthly amount so yearly and
// monthly plans can be summed into a single MRR figure.
function monthlyAmount(price) {
  if (!price?.unit_amount || !price?.recurring?.interval) return 0;
  const { unit_amount, recurring } = price;
  const perCycle = unit_amount / 100;
  if (recurring.interval === "year") return perCycle / 12;
  if (recurring.interval === "week") return perCycle * 4.345;
  if (recurring.interval === "day") return perCycle * 30;
  return perCycle; // month
}

export async function GET() {
  const check = await requireAdmin();
  if (check instanceof Response) return check;

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return Response.json({ configured: false, error: err.message });
  }

  try {
    // NOTE: capped at 100 subscriptions per status for simplicity. If this
    // project grows past that, switch to cursor-based pagination here.
    const [activeSubs, trialingSubs] = await Promise.all([
      stripe.subscriptions.list({
        status: "active",
        limit: 100,
        expand: ["data.customer", "data.items.data.price"],
      }),
      stripe.subscriptions.list({
        status: "trialing",
        limit: 100,
        expand: ["data.customer"],
      }),
    ]);

    let mrr = 0;
    const byPlan = { basic: 0, pro: 0, business: 0, other: 0 };
    const subscriptions = activeSubs.data.map((sub) => {
      const price = sub.items?.data?.[0]?.price;
      const amount = monthlyAmount(price);
      mrr += amount;
      const plan = (price?.id && planForPriceId(price.id)) || "other";
      byPlan[plan] = (byPlan[plan] || 0) + 1;

      const customer = sub.customer;
      return {
        id: sub.id,
        customerEmail: typeof customer === "object" ? customer?.email : null,
        customerName: typeof customer === "object" ? customer?.name : null,
        plan,
        monthlyAmount: Math.round(amount * 100) / 100,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        status: sub.status,
      };
    });

    return Response.json({
      configured: true,
      mrr: Math.round(mrr * 100) / 100,
      activeCount: activeSubs.data.length,
      trialingCount: trialingSubs.data.length,
      byPlan,
      subscriptions: subscriptions.sort((a, b) => b.monthlyAmount - a.monthlyAmount),
    });
  } catch (err) {
    console.error("Admin billing fetch failed:", err);
    return Response.json({ configured: true, error: err.message }, { status: 500 });
  }
}