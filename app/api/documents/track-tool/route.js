import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

const MAX_RECENTS = 6;

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { toolId, label, href } = await req.json();

  if (!toolId || !label || !href) {
    return Response.json({ error: "toolId, label and href are required" }, { status: 400 });
  }

  await dbConnect();

  const user = await User.findById(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const withoutThis = (user.recentTools || []).filter((t) => t.toolId !== toolId);
  withoutThis.unshift({ toolId, label, href, lastUsedAt: new Date() });
  user.recentTools = withoutThis.slice(0, MAX_RECENTS);

  await user.save();

  return Response.json({ recentTools: user.recentTools });
}