import dbConnect from "@/lib/mongodb";
import PendingSignup from "@/models/PendingSignup";
import { requireAdmin } from "@/lib/admin";

export async function GET(req) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  const [items, total] = await Promise.all([
    PendingSignup.find({})
      .select("name email createdAt expiresAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PendingSignup.countDocuments({}),
  ]);

  return Response.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}