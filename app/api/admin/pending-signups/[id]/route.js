import dbConnect from "@/lib/mongodb";
import PendingSignup from "@/models/PendingSignup";
import { requireAdmin, logAdminAction } from "@/lib/admin";

export async function DELETE(req, { params }) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;
  const session = check;

  await dbConnect();

  const pending = await PendingSignup.findByIdAndDelete(params.id).lean();
  if (!pending) {
    return Response.json({ error: "Pending signup not found" }, { status: 404 });
  }

  await logAdminAction({
    session,
    action: "pending_signup.delete",
    targetType: "user",
    targetId: params.id,
    targetLabel: pending.email,
  });

  return Response.json({ success: true });
}