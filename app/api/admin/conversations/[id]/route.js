import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import { requireAdmin, logAdminAction } from "@/lib/admin";

export async function GET(req, { params }) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;

  await dbConnect();
  void User;

  const conversation = await Conversation.findById(params.id)
    .populate("user", "name email")
    .lean();

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json({ conversation });
}

export async function DELETE(req, { params }) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;
  const session = check;

  await dbConnect();

  const conversation = await Conversation.findByIdAndDelete(params.id).lean();
  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  await logAdminAction({
    session,
    action: "conversation.delete",
    targetType: "conversation",
    targetId: params.id,
    targetLabel: conversation.title,
  });

  return Response.json({ success: true });
}