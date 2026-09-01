import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Connection from "@/models/Connection";
import { getFacebookRecentPosts, getInstagramRecentPosts } from "@/lib/socialPosting";
import { computeEngagementStats } from "@/lib/growthInsights";
import { generateText } from "@/lib/aiProviders";

const SYSTEM_PROMPT =
  "You are a social media growth analyst. You only make claims that follow " +
  "directly from the engagement data you're given about one specific account " +
  "— you never promise growth, virality, or guaranteed results, and you say so " +
  "if the data is too thin to conclude much. Output plain text with three short " +
  "sections titled exactly 'Best posting time:', 'Hashtags worth reusing:', and " +
  "'Content ideas:' — a sentence or two under the first two, 3-4 bullet ideas " +
  "under the third. No preamble, no markdown headers, no disclaimers beyond " +
  "what's asked for.";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connectionId");
  if (!connectionId) {
    return Response.json({ error: "connectionId is required" }, { status: 400 });
  }

  await dbConnect();

  const connection = await Connection.findOne({ _id: connectionId, user: session.user.id }).select(
    "+accessToken platform accountId accountName status",
  );
  if (!connection) {
    return Response.json({ error: "Connected account not found" }, { status: 404 });
  }
  if (connection.status !== "connected") {
    return Response.json({ error: `Connected account is ${connection.status} — reconnect it first` }, { status: 409 });
  }
  if (connection.platform !== "facebook" && connection.platform !== "instagram") {
    return Response.json(
      { error: `Growth Suggestions isn't available for ${connection.platform} yet` },
      { status: 400 },
    );
  }

  const { accessToken } = connection.getDecryptedTokens();

  let posts;
  try {
    posts =
      connection.platform === "instagram"
        ? await getInstagramRecentPosts({ igUserId: connection.accountId, pageAccessToken: accessToken })
        : await getFacebookRecentPosts({ pageId: connection.accountId, pageAccessToken: accessToken });
  } catch (err) {
    return Response.json({ error: err.message || "Couldn't fetch post history" }, { status: 502 });
  }

  const stats = computeEngagementStats(posts);

  if (stats.insufficientData) {
    return Response.json({
      accountName: connection.accountName,
      platform: connection.platform,
      stats,
      aiSuggestions: null,
      note: "Not enough recent posts with engagement data yet to spot a reliable pattern — post a few more and check back.",
    });
  }

  const dataSummary = [
    `Account: ${connection.accountName} (${connection.platform})`,
    `Posts analyzed: ${stats.totalPosts}, average engagement (likes+comments+shares): ${stats.avgEngagement.toFixed(1)}`,
    stats.bestHour ? `Highest-average-engagement hour: ${stats.bestHour.bucket}:00 local time (${stats.bestHour.postCount} posts, avg ${stats.bestHour.avgEngagement.toFixed(1)})` : "",
    stats.bestDay ? `Highest-average-engagement day: ${stats.bestDay.bucket} (${stats.bestDay.postCount} posts, avg ${stats.bestDay.avgEngagement.toFixed(1)})` : "",
    stats.topHashtags.length
      ? `Hashtags this account has used, ranked by avg engagement: ${stats.topHashtags.map((h) => `${h.tag} (used ${h.useCount}x, avg ${h.avgEngagement.toFixed(1)})`).join(", ")}`
      : "No hashtags found in recent captions.",
    `Top-performing recent post(s): ${stats.topPosts.map((p) => `"${(p.text || "(no caption)").slice(0, 120)}" — ${p.engagement} engagement`).join(" | ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  let aiSuggestions = null;
  try {
    aiSuggestions = await generateText(
      `Here is this account's real recent post performance:\n\n${dataSummary}\n\nBased only on this, give posting-time, hashtag, and content-idea suggestions.`,
      SYSTEM_PROMPT,
    );
  } catch (err) {
    // Stats are still useful without the AI layer on top — degrade
    // gracefully instead of failing the whole response.
    aiSuggestions = null;
  }

  return Response.json({
    accountName: connection.accountName,
    platform: connection.platform,
    stats,
    aiSuggestions,
    note: "Suggestions are patterns from this account's own recent history — not a growth guarantee.",
  });
}
