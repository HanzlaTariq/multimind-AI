import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAdmin } from "@/lib/admin";

export async function GET(req) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const plan = searchParams.get("plan") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  const filter = {};
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { email: re }];
  }
  if (plan) filter.plan = plan;

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("name email image plan credits creditsResetAt isAdmin banned provider createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return Response.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}