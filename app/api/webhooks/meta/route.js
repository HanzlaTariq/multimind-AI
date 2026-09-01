import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import Connection from "@/models/Connection";
import InboxMessage from "@/models/InboxMessage";

// Receives Facebook + Instagram webhook events (new DMs, new comments) and
// normalizes them into InboxMessage rows for /dashboard/inbox. This route
// is unauthenticated by session — Meta calls it directly — so ownership
// is established by matching the page/IG account id in the payload
// against a saved Connection.accountId, not by a signed-in user.
//
// Required env vars (in addition to the existing META_APP_ID/META_APP_SECRET
// used by the OAuth connect flow):
//   META_WEBHOOK_VERIFY_TOKEN — any string you choose; enter the same
//     value in the Meta App Dashboard's webhook subscription setup. Proves
//     the subscription request actually came from you configuring it.
// META_APP_SECRET is reused here to verify the X-Hub-Signature-256 header
// Meta signs every event payload with, so a request claiming to be a
// webhook delivery but not actually from Meta gets rejected before it
// touches the DB.
//
// Subscribe this URL (https://<domain>/api/webhooks/meta) to the "feed"
// (comments) and "messages" fields for the Page product, and "comments" +
// "messages" for the Instagram product, in the Meta App Dashboard.

/** Meta's verification handshake, sent once when you save the webhook subscription. */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && process.env.META_WEBHOOK_VERIFY_TOKEN && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Verification failed", { status: 403 });
}

/** Every real event delivery — new comments, new DMs — arrives here. */
export async function POST(req) {
  const rawBody = await req.text();

  if (!verifySignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  // Meta expects a fast 200 regardless of what's inside — it retries
  // (and eventually unsubscribes you) on slow or non-200 responses. We
  // do the normalization/DB work inline since it's small per-event, but
  // any failure below still resolves to 200 so one bad event doesn't
  // trigger a retry storm; it's just dropped (logged server-side).
  try {
    await dbConnect();
    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    for (const entry of entries) {
      await handleEntry(payload.object, entry);
    }
  } catch (err) {
    console.error("Meta webhook processing failed:", err.message);
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}

function verifySignature(rawBody, signatureHeader) {
  if (!process.env.META_APP_SECRET) return false;
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const expected = crypto
    .createHmac("sha256", process.env.META_APP_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  // Both are hex strings of the same fixed length, so timingSafeEqual's
  // length requirement is satisfied without a manual length check.
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

/** One `entry` = one connected account's events for this delivery. */
async function handleEntry(object, entry) {
  const platform = object === "instagram" ? "instagram" : "facebook";
  const accountId = entry.id;
  if (!accountId) return;

  // The page/IG account id is globally unique on Meta's side, so we can
  // resolve the owning user from it without any auth context — this is
  // the whole reason Connection is looked up by (platform, accountId)
  // rather than scoped by user here.
  const connection = await Connection.findOne({ platform, accountId, status: "connected" });
  if (!connection) return; // event for an account nobody has connected (or has since disconnected)

  const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];
  for (const m of messaging) {
    await saveDm(connection, platform, m);
  }

  const changes = Array.isArray(entry.changes) ? entry.changes : [];
  for (const change of changes) {
    if (change.field === "feed" && change.value?.item === "comment") {
      await saveComment(connection, "facebook", change.value);
    } else if (change.field === "comments") {
      await saveComment(connection, "instagram", change.value);
    }
  }
}

async function saveDm(connection, platform, messagingEvent) {
  const senderId = messagingEvent.sender?.id;
  const text = messagingEvent.message?.text;
  const mid = messagingEvent.message?.mid;
  // Echoes are our own outgoing messages bounced back through the
  // webhook (Meta sends `is_echo: true` for messages the Page itself
  // sent) — skip them, the reply route already records outbound rows.
  if (!senderId || !text || !mid || messagingEvent.message?.is_echo) return;
  if (senderId === connection.accountId) return;

  await InboxMessage.findOneAndUpdate(
    { platform, externalId: mid },
    {
      user: connection.user,
      connection: connection._id,
      platform,
      type: "dm",
      direction: "inbound",
      threadId: `${platform}:dm:${senderId}`,
      externalId: mid,
      senderExternalId: senderId,
      text,
      status: "unread",
      raw: messagingEvent,
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

async function saveComment(connection, platform, value) {
  const commentId = value.comment_id || value.id;
  const postId = value.post_id || value.media?.id || null;
  const senderId = value.sender_id || value.from?.id || "";
  const senderName = value.sender_name || value.from?.username || value.from?.name || "";
  const text = value.message || value.text || "";
  const verb = value.verb; // Facebook only: "add" | "edit" | "remove" — ignore anything but new comments
  if (!commentId) return;
  if (verb && verb !== "add") return;
  // Don't file our own reply-to-a-comment webhook echo as an inbound row.
  if (senderId && senderId === connection.accountId) return;

  await InboxMessage.findOneAndUpdate(
    { platform, externalId: commentId },
    {
      user: connection.user,
      connection: connection._id,
      platform,
      type: "comment",
      direction: "inbound",
      threadId: `${platform}:comment:${postId || commentId}`,
      externalId: commentId,
      parentExternalId: value.parent_id && value.parent_id !== postId ? value.parent_id : null,
      postExternalId: postId,
      senderExternalId: senderId,
      senderName,
      text,
      status: "unread",
      raw: value,
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
}
