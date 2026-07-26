import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAdmin } from "@/lib/admin";

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const plan = searchParams.get("plan") || "";

  const filter = {};
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { email: re }];
  }
  if (plan) filter.plan = plan;

  const users = await User.find(filter)
    .select("name email plan credits isAdmin banned provider createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const header = ["Name", "Email", "Plan", "Credits", "Admin", "Banned", "Provider", "Joined"];
  const rows = users.map((u) => [
    u.name,
    u.email,
    u.plan,
    u.credits,
    u.isAdmin ? "yes" : "no",
    u.banned ? "yes" : "no",
    u.provider,
    new Date(u.createdAt).toISOString(),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="multimind-users-${Date.now()}.csv"`,
    },
  });
}