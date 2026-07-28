import crypto from "crypto";

// Razorpay setup (env vars needed):
//   RAZORPAY_KEY_ID       — from your Razorpay dashboard (Settings → API Keys)
//   RAZORPAY_KEY_SECRET   — from your Razorpay dashboard (Settings → API Keys)
//
// Sign up at https://razorpay.com — test-mode keys work immediately for
// development; live keys need KYC/business verification before go-live.

function authHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay isn't configured on the server yet");
  }
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

// Creates a Razorpay order for the given amount (in whole rupees). Razorpay
// wants amounts in paise (rupees x 100).
export async function createRazorpayOrder({ amountINR, receipt, notes }) {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: Math.round(amountINR * 100),
      currency: "INR",
      receipt,
      notes,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.description || "Couldn't create Razorpay order");
  }
  return data; // { id, amount, currency, ... }
}

// After checkout.js completes on the client, Razorpay hands back
// razorpay_order_id + razorpay_payment_id + razorpay_signature. Verify that
// signature server-side before trusting the payment succeeded.
export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}