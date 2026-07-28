import crypto from "crypto";

// JazzCash setup (env vars needed):
//   JAZZCASH_MERCHANT_ID       — from your JazzCash merchant dashboard
//   JAZZCASH_PASSWORD          — from your JazzCash merchant dashboard
//   JAZZCASH_INTEGRITY_SALT    — from your JazzCash merchant dashboard
//   JAZZCASH_ENV               — "sandbox" (default) or "live"
//
// Sign up for a merchant account at https://www.jazzcash.com.pk/business/ —
// sandbox credentials are issued first for testing before you go live.

const SANDBOX_URL =
  "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";
const LIVE_URL =
  "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";

export function jazzCashCheckoutUrl() {
  return process.env.JAZZCASH_ENV === "live" ? LIVE_URL : SANDBOX_URL;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDateTime(date) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

// JazzCash wants the secure hash built from every pp_ field (alphabetically
// by key, excluding pp_SecureHash itself), joined with "&", with the
// integrity salt prepended — then HMAC-SHA256'd with the integrity salt as
// the key. This mirrors JazzCash's official PHP/Node sample integrations.
export function buildSecureHash(fields, integritySalt) {
  const sortedKeys = Object.keys(fields)
    .filter((k) => k !== "pp_SecureHash" && fields[k] !== "" && fields[k] !== undefined)
    .sort();
  const joined = sortedKeys.map((k) => fields[k]).join("&");
  const hashString = `${integritySalt}&${joined}`;
  return crypto.createHmac("sha256", integritySalt).update(hashString).digest("hex").toUpperCase();
}

// Builds the full set of form fields to auto-POST to JazzCash's checkout page.
export function buildJazzCashFields({ amountPKR, txnRef, billReference, description, returnUrl }) {
  const merchantId = process.env.JAZZCASH_MERCHANT_ID;
  const password = process.env.JAZZCASH_PASSWORD;
  const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;

  if (!merchantId || !password || !integritySalt) {
    throw new Error("JazzCash isn't configured on the server yet");
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour expiry window

  const fields = {
    pp_Version: "1.1",
    pp_TxnType: "MWALLET",
    pp_Language: "EN",
    pp_MerchantID: merchantId,
    pp_Password: password,
    pp_TxnRefNo: txnRef,
    pp_Amount: String(Math.round(amountPKR * 100)), // JazzCash wants paisa (amount x 100)
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: formatDateTime(now),
    pp_BillReference: billReference,
    pp_Description: description,
    pp_TxnExpiryDateTime: formatDateTime(expiry),
    pp_ReturnURL: returnUrl,
  };

  const secureHash = buildSecureHash(fields, integritySalt);

  return { ...fields, pp_SecureHash: secureHash };
}

// Verifies a callback POST actually came from JazzCash by recomputing the hash.
export function verifyJazzCashCallback(fields) {
  const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
  if (!integritySalt) return false;
  const expected = buildSecureHash(fields, integritySalt);
  return expected === fields.pp_SecureHash;
}