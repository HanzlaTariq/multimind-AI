import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Conversation from "@/models/Conversation";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { PLANS, creditsForPlan } from "@/lib/plans";

export async function GET(req, { params }) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;

  await dbConnect();

  const user = await User.findById(params.id)
    .select("-password")
    .lean();

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const conversationCount = await Conversation.countDocuments({ user: params.id });

  return Response.json({ user, conversationCount });
}

export async function PATCH(req, { params }) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;
  const session = check;

  await dbConnect();

  const body = await req.json();
  const update = {};

  if (typeof body.plan === "string") {
    if (!(body.plan in PLANS)) {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }
    update.plan = body.plan;
    // If credits weren't explicitly provided too, refresh the allowance
    // to match the new plan so the change takes effect immediately.
    if (typeof body.credits !== "number") {
      update.credits = creditsForPlan(body.plan);
    }
  }

  if (typeof body.credits === "number") {
    update.credits = Math.max(0, Math.floor(body.credits));
  }

  if (typeof body.isAdmin === "boolean") {
    if (params.id === session.user.id && body.isAdmin === false) {
      return Response.json(
        { error: "You can't remove your own admin access" },
        { status: 400 }
      );
    }
    update.isAdmin = body.isAdmin;
  }

  if (typeof body.banned === "boolean") {
    if (params.id === session.user.id && body.banned === true) {
      return Response.json({ error: "You can't ban your own account" }, { status: 400 });
    }
    update.banned = body.banned;
    update.bannedReason = body.banned ? body.bannedReason || "" : "";
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const user = await User.findByIdAndUpdate(params.id, update, {
    new: true,
    runValidators: true,
  })
    .select("-password")
    .lean();

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  await logAdminAction({
    session,
    action: "user.update",
    targetType: "user",
    targetId: user._id,
    targetLabel: user.email,
    details: update,
  });

  return Response.json({ user });
}

export async function DELETE(req, { params }) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;
  const session = check;

  if (params.id === session.user.id) {
    return Response.json({ error: "You can't delete your own account" }, { status: 400 });
  }

  await dbConnect();

  const user = await User.findByIdAndDelete(params.id).lean();
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  await Conversation.deleteMany({ user: params.id });

  await logAdminAction({
    session,
    action: "user.delete",
    targetType: "user",
    targetId: params.id,
    targetLabel: user.email,
  });

  return Response.json({ success: true });
}