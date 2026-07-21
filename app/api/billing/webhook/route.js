import { getStripe } from "@/lib/stripe";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { planForPriceId, creditsForPlan } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req) {
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("Stripe webhook: not configured —", err.message);
    return Response.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  await dbConnect();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object;
        const userId = checkoutSession.metadata?.userId;
        const plan = checkoutSession.metadata?.plan || "basic";
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            plan,
            stripeSubscriptionId: checkoutSession.subscription,
            credits: creditsForPlan(plan),
            creditsResetAt: new Date(),
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const isActive = ["active", "trialing"].includes(subscription.status);
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const matchedPlan = priceId ? planForPriceId(priceId) : null;

        const user = await User.findOne({ stripeSubscriptionId: subscription.id });
        if (user) {
          if (!isActive) {
            user.plan = "free";
            user.credits = creditsForPlan("free");
          } else if (matchedPlan) {
            // Plan may have changed (upgrade/downgrade) — sync credits to the new tier
            if (user.plan !== matchedPlan) {
              user.credits = creditsForPlan(matchedPlan);
            }
            user.plan = matchedPlan;
          }
          user.creditsResetAt = new Date();
          await user.save();
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await User.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          { plan: "free", stripeSubscriptionId: "", credits: creditsForPlan("free"), creditsResetAt: new Date() }
        );
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handling error:", err);
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}