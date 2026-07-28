import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Conversation from "@/models/Conversation";
import { requireAdmin } from "@/lib/admin";
import { creditsForPlan } from "@/lib/plans";

// Builds a zero-filled daily series over the last `days` days so the chart
// doesn't have gaps on days with no activity. `raw` rows look like
// { _id: "YYYY-MM-DD", count: N } from a $dateToString grouping.
function fillDailySeries(raw, days) {
  const byDate = new Map(raw.map((r) => [r._id, r.count]));
  const series = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, count: byDate.get(key) || 0 });
  }
  return series;
}

export async function GET(req) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const range = [7, 30, 90].includes(Number(searchParams.get("range")))
    ? Number(searchParams.get("range"))
    : 30;

  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const rangeStart = new Date(now - range * 24 * 60 * 60 * 1000);

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
    userGrowthRaw,
    conversationGrowthRaw,
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
    User.aggregate([
      { $match: { createdAt: { $gte: rangeStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    Conversation.aggregate([
      { $match: { createdAt: { $gte: rangeStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
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
  let allowanceTotal = 0;
  for (const [plan, count] of Object.entries(planBreakdown)) {
    allowanceTotal += count * (await creditsForPlan(plan));
  }
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
    growth: {
      range,
      users: fillDailySeries(userGrowthRaw, range),
      conversations: fillDailySeries(conversationGrowthRaw, range),
    },
  });
}