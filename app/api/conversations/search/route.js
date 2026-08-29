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

  // Message content (turns.prompt / turns.responses.text) is encrypted
  // at rest, so it can't be searched with a Mongo $text index anymore —
  // the Conversation model's post-find hook decrypts it for us here,
  // and we filter in the application layer instead. Title stays
  // unencrypted and is checked the same way.
  //
  // This is capped to the user's most recently updated 300 conversations
  // for performance. For very large per-user histories, a proper
  // solution would be a separate encrypted search index (e.g. HMAC'd
  // tokens per word) — flagging that as a possible future improvement.
  const candidates = await Conversation.find({ user: session.user.id })
    .select("title turns updatedAt")
    .sort({ updatedAt: -1 })
    .limit(300)
    .lean();

  const ql = q.toLowerCase();
  const matches = candidates.filter((c) => {
    if ((c.title || "").toLowerCase().includes(ql)) return true;
    for (const turn of c.turns || []) {
      if ((turn.prompt || "").toLowerCase().includes(ql)) return true;
      for (const r of turn.responses || []) {
        if ((r.text || "").toLowerCase().includes(ql)) return true;
      }
    }
    return false;
  });

  const items = matches.slice(0, 20);

  return Response.json({
    items: items.map((c) => ({
      _id: c._id,
      title: c.title,
      updatedAt: c.updatedAt,
      snippet: buildSnippet(c, q),
    })),
  });
}