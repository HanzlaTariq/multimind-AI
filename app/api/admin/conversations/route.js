import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import { requireAdmin } from "@/lib/admin";

export async function GET(req) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;

  await dbConnect();
  // Ensure the User model is registered before we populate it below.
  void User;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  const filter = {};
  if (q) {
    filter.title = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const [items, total] = await Promise.all([
    Conversation.find(filter)
      .select("title user turns isPublic shareId createdAt updatedAt")
      .populate("user", "name email")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  const shaped = items.map((c) => ({
    _id: c._id,
    title: c.title,
    user: c.user,
    turnCount: c.turns?.length || 0,
    isPublic: c.isPublic,
    shareId: c.shareId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  return Response.json({
    items: shaped,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}