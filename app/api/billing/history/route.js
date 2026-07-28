import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Local (JazzCash / Razorpay) payments — completed ones only, most recent first.
  const localPayments = await Payment.find({ user: user._id, status: "completed" })
    .sort({ createdAt: -1 })
    .limit(50);

  const history = localPayments.map((p) => ({
    date: p.createdAt,
    plan: p.plan,
    amount: p.amount,
    currency: p.currency,
    gateway: p.gateway,
    reference: p.gateway === "razorpay" ? p.rawResponse?.razorpay_payment_id || p.txnRef : p.txnRef,
  }));

  let nextDueDate = null;
  let nextDueSource = null;

  // A locally-purchased plan expires on a fixed date (no auto-renew).
  if (user.planExpiresAt) {
    nextDueDate = user.planExpiresAt;
    nextDueSource = "local";
  }

  // Stripe invoices + the subscription's next billing date, if subscribed.
  if (user.stripeCustomerId) {
    try {
      const stripe = getStripe();
      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 50,
      });

      for (const inv of invoices.data) {
        if (inv.status !== "paid") continue;
        history.push({
          date: new Date(inv.created * 1000),
          plan: inv.lines?.data?.[0]?.price?.nickname || inv.lines?.data?.[0]?.description || "Subscription",
          amount: inv.amount_paid / 100,
          currency: (inv.currency || "usd").toUpperCase(),
          gateway: "stripe",
          reference: inv.number || inv.id,
          receiptUrl: inv.hosted_invoice_url,
        });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        if (["active", "trialing"].includes(subscription.status) && subscription.current_period_end) {
          nextDueDate = new Date(subscription.current_period_end * 1000);
          nextDueSource = "stripe";
        }
      }
    } catch (err) {
      // Stripe not configured, or customer/subscription not found — skip
      // Stripe data rather than failing the whole history request.
    }
  }

  history.sort((a, b) => new Date(b.date) - new Date(a.date));

  return Response.json({ history, nextDueDate, nextDueSource });
}