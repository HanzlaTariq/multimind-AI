import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  // Outside a project, only show conversations that don't belong to any
  // project — project chats live inside their project workspace instead,
  // keeping the main "Recents" list uncluttered.
  const filter = { user: session.user.id };
  filter.project = projectId ? projectId : null;

  const conversations = await Conversation.find(filter)
    .select("title updatedAt createdAt pinned project")
    .sort({ pinned: -1, updatedAt: -1 })
    .limit(100);

  return Response.json({ conversations });
}