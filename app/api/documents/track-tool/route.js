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

  // Atomic operations avoid the version-conflict ("VersionError") that a
  // find -> mutate -> save pattern can hit when two requests land close
  // together (e.g. React StrictMode double-invoking an effect in dev).
  await User.updateOne({ _id: session.user.id }, { $pull: { recentTools: { toolId } } });

  const user = await User.findByIdAndUpdate(
    session.user.id,
    {
      $push: {
        recentTools: {
          $each: [{ toolId, label, href, lastUsedAt: new Date() }],
          $position: 0,
          $slice: MAX_RECENTS,
        },
      },
    },
    { new: true }
  ).select("recentTools");

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({ recentTools: user.recentTools });
}