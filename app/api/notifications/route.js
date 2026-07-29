import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Notification from "@/models/Notification";

// GET — the most recent notifications (credit-cost changes, etc.) plus how
// many the signed-in user hasn't seen yet. Notifications are global (every
// user sees the same feed); only the "seen" marker is per-user.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  const [user, notifications] = await Promise.all([
    User.findById(session.user.id).select("notificationsSeenAt").lean(),
    Notification.find({}).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  const seenAt = user?.notificationsSeenAt ? new Date(user.notificationsSeenAt) : null;
  const unreadCount = notifications.filter((n) => !seenAt || new Date(n.createdAt) > seenAt).length;

  return Response.json({ notifications, unreadCount });
}

// PATCH — mark all current notifications as seen (called when the user
// opens the notification bell).
export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();
  await User.findByIdAndUpdate(session.user.id, { notificationsSeenAt: new Date() });

  return Response.json({ success: true });
}