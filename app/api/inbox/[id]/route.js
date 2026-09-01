import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import InboxMessage from "@/models/InboxMessage";

// `params.id` is a threadId (see models/InboxMessage.js for its shape),
// URL-encoded by the client since it contains colons.

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();
  const threadId = decodeURIComponent(params.id);

  const messages = await InboxMessage.find({ user: session.user.id, threadId })
    .sort({ createdAt: 1 })
    .lean();

  if (!messages.length) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }

  return Response.json({ messages });
}

/** Marks every unread inbound message in the thread as read (opening the thread does this). */
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();
  const threadId = decodeURIComponent(params.id);

  await InboxMessage.updateMany(
    { user: session.user.id, threadId, direction: "inbound", status: "unread" },
    { status: "read" },
  );

  return Response.json({ ok: true });
}
