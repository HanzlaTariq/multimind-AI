import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Notification from "@/models/Notification";

// GET — notifications the signed-in user hasn't seen yet. Notifications are
// global (every signed-in user shares the same feed), but each user only
// ever sees notifications created after they joined, and only until they
// mark them seen — after that they drop out of the list entirely (not just
// the unread badge).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findById(session.user.id)
    .select("notificationsSeenAt createdAt")
    .lean();

  const since = user?.notificationsSeenAt
    ? new Date(user.notificationsSeenAt)
    : new Date(user?.createdAt || 0);

  const notifications = await Notification.find({ createdAt: { $gt: since } })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return Response.json({ notifications, unreadCount: notifications.length });
}

// PATCH — mark all current notifications as seen (called when the user
// opens the notification bell). Next GET call will only return
// notifications created after this moment.
export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();
  await User.findByIdAndUpdate(session.user.id, { notificationsSeenAt: new Date() });

  return Response.json({ success: true });
}