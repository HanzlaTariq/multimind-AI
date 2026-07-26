import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAdmin, logAdminAction } from "@/lib/admin";

// Adjusts a user's credit balance by a signed amount (positive = bonus,
// negative = deduction) and records why, separately from setting an
// absolute value via PATCH /api/admin/users/[id]. Kept atomic so it can't
// race with the user's own credit-spending requests.
export async function POST(req, { params }) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;
  const session = check;

  const body = await req.json();
  const amount = Number(body.amount);
  const reason = (body.reason || "").trim();

  if (!Number.isFinite(amount) || amount === 0) {
    return Response.json({ error: "Amount must be a non-zero number" }, { status: 400 });
  }
  if (!reason) {
    return Response.json({ error: "A reason is required" }, { status: 400 });
  }

  await dbConnect();

  const user = await User.findById(params.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  user.credits = Math.max(0, (user.credits || 0) + amount);
  await user.save();

  await logAdminAction({
    session,
    action: "user.credit_grant",
    targetType: "user",
    targetId: user._id,
    targetLabel: user.email,
    details: { amount, reason, newBalance: user.credits },
  });

  return Response.json({ credits: user.credits });
}