import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { getPlans, getUpgradablePlans, localPriceForPlan } from "@/lib/plans";
import { buildJazzCashFields, jazzCashCheckoutUrl } from "@/lib/jazzcash";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { plan } = await req.json();
  const upgradablePlans = await getUpgradablePlans();
  if (!upgradablePlans.includes(plan)) {
    return Response.json({ error: "Please choose a valid plan" }, { status: 400 });
  }

  const amountPKR = await localPriceForPlan(plan, "PKR");
  if (!amountPKR) {
    return Response.json({ error: "Pricing isn't set for this plan yet" }, { status: 500 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const txnRef = `T${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;

  try {
    const fields = buildJazzCashFields({
      amountPKR,
      txnRef,
      billReference: `plan-${plan}`,
      description: `MultiMind ${(await getPlans())[plan].label} plan — 1 month`,
      returnUrl: `${origin}/api/billing/jazzcash/callback`,
    });

    await Payment.create({
      user: user._id,
      gateway: "jazzcash",
      plan,
      amount: amountPKR,
      currency: "PKR",
      txnRef,
      status: "pending",
    });

    return Response.json({ checkoutUrl: jazzCashCheckoutUrl(), fields });
  } catch (err) {
    return Response.json({ error: err.message || "Couldn't start JazzCash checkout" }, { status: 500 });
  }
}