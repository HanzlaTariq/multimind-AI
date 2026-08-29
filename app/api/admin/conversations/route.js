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

  // Date range can still be filtered at the DB level (createdAt isn't
  // encrypted). Title is encrypted at rest, so a `q` search can't be
  // done as a Mongo regex anymore — the Conversation model's post-find
  // hook decrypts title for us, and we filter by it in the application
  // layer below instead.
  const dbFilter = {};
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from || to) {
    dbFilter.createdAt = {};
    if (from) dbFilter.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      dbFilter.createdAt.$lte = end;
    }
  }

  let items, total;

  if (q) {
    // Search path: fetch matching-by-date conversations (title is
    // decrypted by the model hook), filter by title in JS, then
    // paginate the filtered set. Capped to keep this bounded on very
    // large datasets.
    const ql = q.toLowerCase();
    const all = await Conversation.find(dbFilter)
      .select("title user turns isPublic shareId createdAt updatedAt")
      .populate("user", "name email")
      .sort({ updatedAt: -1 })
      .limit(5000)
      .lean();

    const matched = all.filter((c) => (c.title || "").toLowerCase().includes(ql));
    total = matched.length;
    items = matched.slice((page - 1) * limit, (page - 1) * limit + limit);
  } else {
    [items, total] = await Promise.all([
      Conversation.find(dbFilter)
        .select("title user turns isPublic shareId createdAt updatedAt")
        .populate("user", "name email")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(dbFilter),
    ]);
  }

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