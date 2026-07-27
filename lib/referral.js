import crypto from "crypto";
import User from "@/models/User";

export const REFERRAL_BONUS_CREDITS = 100;

function randomCode() {
  // 6 uppercase alphanumeric chars, e.g. "K3F9QD" — short enough to share,
  // long enough that collisions are rare.
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

/**
 * Returns the user's referral code, generating and saving one first if
 * they don't have one yet (covers accounts created before this feature
 * existed). Retries on the rare unique-index collision.
 */
export async function ensureReferralCode(user) {
  if (user.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      user.referralCode = code;
      await user.save();
      return code;
    } catch (err) {
      if (err?.code === 11000) continue; // duplicate key — try again
      throw err;
    }
  }
  throw new Error("Could not generate a unique referral code");
}

/**
 * Applies a referral bonus: credits the referrer and returns the referrer's
 * id so the caller can set it as the new user's `referredBy`. Safe to call
 * with an empty/invalid code — it just does nothing and returns null.
 */
export async function applyReferralBonus(referralCode) {
  if (!referralCode) return null;

  const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase() });
  if (!referrer) return null;

  referrer.credits = (referrer.credits || 0) + REFERRAL_BONUS_CREDITS;
  referrer.referralCount = (referrer.referralCount || 0) + 1;
  referrer.referralCreditsEarned = (referrer.referralCreditsEarned || 0) + REFERRAL_BONUS_CREDITS;
  await referrer.save();

  return referrer._id;
}