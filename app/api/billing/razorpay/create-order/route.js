import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { localPriceForPlan } from "@/lib/plans";
import { createRazorpayOrder } from "@/lib/razorpay";

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

  const amountINR = localPriceForPlan(plan, "INR");
  if (!amountINR) {
    return Response.json({ error: "Pricing isn't set for this plan yet" }, { status: 500 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const order = await createRazorpayOrder({
      amountINR,
      receipt: `${user._id}-${Date.now()}`,
      notes: { userId: String(user._id), plan },
    });

    await Payment.create({
      user: user._id,
      gateway: "razorpay",
      plan,
      amount: amountINR,
      currency: "INR",
      txnRef: order.id,
      gatewayOrderId: order.id,
      status: "pending",
    });

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    return Response.json({ error: err.message || "Couldn't start Razorpay checkout" }, { status: 500 });
  }
}