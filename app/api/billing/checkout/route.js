import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getStripe } from "@/lib/stripe";
import { priceIdForPlan } from "@/lib/plans";

export const runtime = "nodejs";

const UPGRADABLE_PLANS = ["basic", "pro", "business"];

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { plan } = await req.json();

  if (!UPGRADABLE_PLANS.includes(plan)) {
    return Response.json({ error: "Please choose a valid plan" }, { status: 400 });
  }

  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return Response.json(
      { error: `Billing isn't configured yet for the ${plan} plan on the server.` },
      { status: 500 }
    );
  }

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const stripe = getStripe();
    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/settings?upgraded=1`,
      cancel_url: `${origin}/dashboard/settings`,
      metadata: { userId: user._id.toString(), plan },
    });

    return Response.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return Response.json({ error: err.message || "Couldn't start checkout" }, { status: 500 });
  }
}