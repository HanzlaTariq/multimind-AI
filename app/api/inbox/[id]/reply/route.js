import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Connection from "@/models/Connection";
import InboxMessage from "@/models/InboxMessage";
import {
  replyToFacebookComment,
  replyToInstagramComment,
  sendFacebookMessage,
  sendInstagramMessage,
} from "@/lib/socialPosting";

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { text } = await req.json();
  if (!text || !text.trim()) {
    return Response.json({ error: "Reply text is required" }, { status: 400 });
  }

  await dbConnect();
  const threadId = decodeURIComponent(params.id);

  // Reply targeting: a comment reply always targets the most recent
  // inbound comment (Graph API replies are addressed to a specific
  // comment id, not "the thread"); a DM reply targets whoever sent the
  // most recent inbound message, since that's who the Send API will
  // actually deliver to.
  const lastInbound = await InboxMessage.findOne({
    user: session.user.id,
    threadId,
    direction: "inbound",
  }).sort({ createdAt: -1 });

  if (!lastInbound) {
    return Response.json({ error: "Nothing to reply to in this thread yet" }, { status: 404 });
  }

  const connection = await Connection.findOne({ _id: lastInbound.connection, user: session.user.id }).select(
    "+accessToken platform accountId status",
  );
  if (!connection) {
    return Response.json({ error: "Connected account not found" }, { status: 404 });
  }
  if (connection.status !== "connected") {
    return Response.json({ error: `Connected account is ${connection.status} — reconnect it first` }, { status: 409 });
  }

  const { accessToken } = connection.getDecryptedTokens();
  const trimmed = text.trim();

  try {
    let externalId;

    if (lastInbound.type === "comment") {
      const replyFn = lastInbound.platform === "instagram" ? replyToInstagramComment : replyToFacebookComment;
      const { replyId } = await replyFn({
        commentId: lastInbound.externalId,
        pageAccessToken: accessToken,
        message: trimmed,
      });
      externalId = replyId;
    } else if (lastInbound.platform === "instagram") {
      const { messageId } = await sendInstagramMessage({
        igUserId: connection.accountId,
        pageAccessToken: accessToken,
        recipientId: lastInbound.senderExternalId,
        text: trimmed,
      });
      externalId = messageId;
    } else {
      const { messageId } = await sendFacebookMessage({
        pageAccessToken: accessToken,
        recipientId: lastInbound.senderExternalId,
        text: trimmed,
      });
      externalId = messageId;
    }

    const outboundMessage = await InboxMessage.create({
      user: session.user.id,
      connection: connection._id,
      platform: lastInbound.platform,
      type: lastInbound.type,
      direction: "outbound",
      threadId,
      externalId: externalId || `local:${Date.now()}`,
      parentExternalId: lastInbound.type === "comment" ? lastInbound.externalId : null,
      postExternalId: lastInbound.postExternalId,
      senderExternalId: lastInbound.senderExternalId,
      senderName: "You",
      text: trimmed,
      status: "read",
    });

    await InboxMessage.updateMany(
      { user: session.user.id, threadId, direction: "inbound", status: { $ne: "replied" } },
      { status: "replied" },
    );

    return Response.json({ message: outboundMessage });
  } catch (err) {
    return Response.json({ error: err.message || "Reply failed" }, { status: 500 });
  }
}
