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

  const conversations = await Conversation.find({ user: session.user.id })
    .select("title updatedAt createdAt")
    .sort({ updatedAt: -1 })
    .limit(50);

  return Response.json({ conversations });
}
