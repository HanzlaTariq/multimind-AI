import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { verifyJazzCashCallback } from "@/lib/jazzcash";
import { applyLocalPlanPurchase } from "@/lib/plans";

// JazzCash POSTs the transaction result to this URL (pp_ReturnURL). We
// verify the secure hash, update our Payment record, and redirect the
// browser back into the app with a success/failure flag.
export async function POST(req) {
  await dbConnect();

  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;
  const formData = await req.formData();
  const fields = Object.fromEntries(formData.entries());

  const valid = verifyJazzCashCallback(fields);
  const txnRef = fields.pp_TxnRefNo;
  const responseCode = fields.pp_ResponseCode; // "000" = success

  const payment = await Payment.findOne({ txnRef, gateway: "jazzcash" });
  if (!payment) {
    return Response.redirect(`${origin}/dashboard/settings?payment=notfound`, 303);
  }

  payment.rawResponse = fields;

  if (!valid) {
    payment.status = "failed";
    await payment.save();
    return Response.redirect(`${origin}/dashboard/settings?payment=invalid`, 303);
  }

  if (responseCode !== "000") {
    payment.status = "failed";
    await payment.save();
    return Response.redirect(`${origin}/dashboard/settings?payment=failed`, 303);
  }

  payment.status = "completed";
  await payment.save();

  const user = await User.findById(payment.user);
  if (user) {
    applyLocalPlanPurchase(user, payment.plan);
    await user.save();
  }

  return Response.redirect(`${origin}/dashboard/settings?upgraded=1`, 303);
}

// Some JazzCash sandbox configurations redirect with GET instead of POST.
export async function GET(req) {
  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;
  return Response.redirect(`${origin}/dashboard/settings`, 303);
}