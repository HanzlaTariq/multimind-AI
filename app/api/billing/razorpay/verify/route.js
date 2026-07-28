import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { applyLocalPlanPurchase } from "@/lib/plans";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return Response.json({ error: "Missing payment details" }, { status: 400 });
  }

  const valid = verifyRazorpaySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  await dbConnect();
  const payment = await Payment.findOne({
    gatewayOrderId: razorpay_order_id,
    gateway: "razorpay",
    user: session.user.id,
  });

  if (!payment) {
    return Response.json({ error: "Payment record not found" }, { status: 404 });
  }

  if (!valid) {
    payment.status = "failed";
    await payment.save();
    return Response.json({ error: "Payment signature didn't verify" }, { status: 400 });
  }

  payment.status = "completed";
  payment.rawResponse = { razorpay_payment_id };
  await payment.save();

  const user = await User.findById(session.user.id);
  await applyLocalPlanPurchase(user, payment.plan);
  await user.save();

  return Response.json({ success: true, plan: payment.plan });
}