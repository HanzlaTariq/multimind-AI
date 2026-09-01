import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import InboxMessage from "@/models/InboxMessage";
import Connection from "@/models/Connection";

// One row per thread (not per message) — the latest message plus an
// unread count, sorted by most recent activity. The thread detail lives
// behind /api/inbox/[threadId].
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();
  const userId = new mongoose.Types.ObjectId(session.user.id);

  const threads = await InboxMessage.aggregate([
    { $match: { user: userId } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$threadId",
        platform: { $first: "$platform" },
        type: { $first: "$type" },
        connection: { $first: "$connection" },
        senderName: { $first: "$senderName" },
        senderExternalId: { $first: "$senderExternalId" },
        lastText: { $first: "$text" },
        lastDirection: { $first: "$direction" },
        lastCreatedAt: { $first: "$createdAt" },
        unreadCount: {
          $sum: {
            $cond: [{ $and: [{ $eq: ["$direction", "inbound"] }, { $eq: ["$status", "unread"] }] }, 1, 0],
          },
        },
      },
    },
    { $sort: { lastCreatedAt: -1 } },
    { $limit: 200 },
  ]);

  // Aggregation doesn't populate refs — resolve the small set of
  // connections these threads reference in one extra query instead.
  const connectionIds = [...new Set(threads.map((t) => String(t.connection)))];
  const connectionDocs = connectionIds.length
    ? await Connection.find({ _id: { $in: connectionIds } }).select("platform accountName").lean()
    : [];
  const connectionMap = Object.fromEntries(connectionDocs.map((c) => [String(c._id), c]));

  const result = threads.map((t) => ({
    threadId: t._id,
    platform: t.platform,
    type: t.type,
    accountName: connectionMap[String(t.connection)]?.accountName || "",
    senderName: t.senderName || "Unknown",
    lastText: t.lastText,
    lastDirection: t.lastDirection,
    lastCreatedAt: t.lastCreatedAt,
    unreadCount: t.unreadCount,
  }));

  return Response.json({ threads: result });
}
