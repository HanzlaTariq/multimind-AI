import { getStripe } from "@/lib/stripe";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

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
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            plan: "pro",
            stripeSubscriptionId: checkoutSession.subscription,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const isActive = ["active", "trialing"].includes(subscription.status);
        await User.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          { plan: isActive ? "pro" : "free" }
        );
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await User.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          { plan: "free", stripeSubscriptionId: "" }
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