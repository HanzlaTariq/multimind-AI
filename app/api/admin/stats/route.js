import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Conversation from "@/models/Conversation";
import { requireAdmin } from "@/lib/admin";
import { creditsForPlan } from "@/lib/plans";

export async function GET() {
  const check = await requireAdmin();
  if (check instanceof Response) return check;

  await dbConnect();

  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    newUsers30d,
    bannedUsers,
    adminUsers,
    planBreakdownRaw,
    totalConversations,
    turnStatsRaw,
    topToolsRaw,
    creditsRaw,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ banned: true }),
    User.countDocuments({ isAdmin: true }),
    User.aggregate([{ $group: { _id: "$plan", count: { $sum: 1 } } }]),
    Conversation.countDocuments({}),
    Conversation.aggregate([
      { $project: { turnCount: { $size: { $ifNull: ["$turns", []] } } } },
      { $group: { _id: null, totalTurns: { $sum: "$turnCount" } } },
    ]),
    User.aggregate([
      { $unwind: { path: "$recentTools", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$recentTools.toolId",
          label: { $first: "$recentTools.label" },
          uses: { $sum: 1 },
        },
      },
      { $sort: { uses: -1 } },
      { $limit: 8 },
    ]),
    User.aggregate([
      { $group: { _id: "$plan", credits: { $sum: "$credits" } } },
    ]),
  ]);

  const planBreakdown = { free: 0, basic: 0, pro: 0, business: 0 };
  for (const row of planBreakdownRaw) {
    if (row._id in planBreakdown) planBreakdown[row._id] = row.count;
  }

  // Rough monthly-allowance total vs. what's actually still unused, as a
  // proxy for "credits consumed so far this cycle" per plan tier.
  const creditsRemainingByPlan = { free: 0, basic: 0, pro: 0, business: 0 };
  for (const row of creditsRaw) {
    if (row._id in creditsRemainingByPlan) creditsRemainingByPlan[row._id] = row.credits;
  }
  const allowanceTotal = Object.entries(planBreakdown).reduce(
    (sum, [plan, count]) => sum + count * creditsForPlan(plan),
    0
  );
  const remainingTotal = Object.values(creditsRemainingByPlan).reduce((a, b) => a + b, 0);

  return Response.json({
    users: {
      total: totalUsers,
      newLast7Days: newUsers7d,
      newLast30Days: newUsers30d,
      banned: bannedUsers,
      admins: adminUsers,
      byPlan: planBreakdown,
    },
    conversations: {
      total: totalConversations,
      totalTurns: turnStatsRaw[0]?.totalTurns || 0,
    },
    credits: {
      monthlyAllowanceTotal: allowanceTotal,
      remainingTotal,
      consumedEstimate: Math.max(0, allowanceTotal - remainingTotal),
    },
    topTools: topToolsRaw.map((t) => ({
      toolId: t._id,
      label: t.label,
      uses: t.uses,
    })),
  });
}