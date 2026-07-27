import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { ensureReferralCode, REFERRAL_BONUS_CREDITS } from "@/lib/referral";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findById(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const code = await ensureReferralCode(user);

  const referredUsers = await User.find({ referredBy: user._id })
    .select("name email createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return Response.json({
    code,
    bonusCredits: REFERRAL_BONUS_CREDITS,
    referralCount: user.referralCount || 0,
    referralCreditsEarned: user.referralCreditsEarned || 0,
    referredUsers,
  });
}