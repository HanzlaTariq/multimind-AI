import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";

// Builds a short "...text before MATCH text after..." snippet around the
// first place the query appears in a conversation, searching the title,
// then each turn's prompt, then each response's text, in that order.
function buildSnippet(conversation, query) {
  const q = query.toLowerCase();
  const RADIUS = 60;

  const excerpt = (text) => {
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return null;
    const start = Math.max(0, idx - RADIUS);
    const end = Math.min(text.length, idx + q.length + RADIUS);
    return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
  };

  const fromTitle = excerpt(conversation.title || "");
  if (fromTitle) return fromTitle;

  for (const turn of conversation.turns || []) {
    const fromPrompt = excerpt(turn.prompt || "");
    if (fromPrompt) return fromPrompt;
    for (const r of turn.responses || []) {
      const fromResponse = excerpt(r.text || "");
      if (fromResponse) return fromResponse;
    }
  }
  return "";
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) {
    return Response.json({ items: [] });
  }

  await dbConnect();

  const items = await Conversation.find(
    { user: session.user.id, $text: { $search: q } },
    { score: { $meta: "textScore" } }
  )
    .select("title turns updatedAt")
    .sort({ score: { $meta: "textScore" } })
    .limit(20)
    .lean();

  return Response.json({
    items: items.map((c) => ({
      _id: c._id,
      title: c.title,
      updatedAt: c.updatedAt,
      snippet: buildSnippet(c, q),
    })),
  });
}