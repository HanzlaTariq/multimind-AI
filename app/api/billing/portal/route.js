import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id);

  if (!user?.stripeCustomerId) {
    return Response.json({ error: "No billing account found yet" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/dashboard/settings`,
    });

    return Response.json({ url: portalSession.url });
  } catch (err) {
    console.error("Stripe portal error:", err);
    return Response.json({ error: err.message || "Couldn't open billing portal" }, { status: 500 });
  }
}