import mongoose from "mongoose";

// One normalized inbound or outbound message/comment, from any connected
// platform's webhook (Phase 6 — Unified Inbox). The webhook handlers
// (app/api/webhooks/*) are the only writers of `direction: "inbound"`
// docs; the inbox reply route (app/api/inbox/[id]/reply) is the only
// writer of `direction: "outbound"` docs — so a thread's full history,
// both sides, lives in one collection/one query.
//
// `threadId` is what groups rows into a conversation in the UI. It's
// synthesized per platform+type rather than reused from any single
// platform field, since "what counts as one conversation" differs by
// platform (a DM thread vs. a comment thread on a specific post):
//   - DM / message:  `${platform}:dm:${otherPartyExternalId}`
//   - comment:       `${platform}:comment:${postId}`
const InboxMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    connection: { type: mongoose.Schema.Types.ObjectId, ref: "Connection", required: true },
    platform: {
      type: String,
      enum: ["instagram", "facebook", "whatsapp", "tiktok", "twitter"],
      required: true,
    },
    type: { type: String, enum: ["dm", "comment"], required: true },
    direction: { type: String, enum: ["inbound", "outbound"], required: true },

    threadId: { type: String, required: true },

    // The platform's own id for *this* message/comment. Required for
    // replies (Graph API replies target a specific comment id) and for
    // webhook-redelivery dedupe (see the unique index below) — Meta
    // retries webhook deliveries on timeout, so the same event can
    // arrive twice.
    externalId: { type: String, required: true },
    // For a comment, the id it's directly replying to (the platform's
    // own parent_id/comment_id chain) — null for a top-level comment or
    // any DM. Kept distinct from threadId (which groups by *post*, not
    // by direct parent) so the UI can still show flat chronological order
    // while replies still target the right node via `externalId` lookups.
    parentExternalId: { type: String, default: null },
    // The post a comment was left on. Null for DMs.
    postExternalId: { type: String, default: null },

    senderExternalId: { type: String, default: "" },
    senderName: { type: String, default: "" },
    text: { type: String, default: "" },

    // Only meaningful on inbound rows — outbound rows are implicitly
    // "sent". Left as "unread" until the inbox marks it read, and moved
    // to "replied" once an outbound row targeting the same thread is
    // created (see app/api/inbox/[id]/reply/route.js).
    status: { type: String, enum: ["unread", "read", "replied"], default: "unread" },

    // Trimmed webhook payload, kept for debugging a bad normalization —
    // never shown in the UI, never anything token-shaped.
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

// Dedupes redelivered webhook events for the same platform message.
InboxMessageSchema.index({ platform: 1, externalId: 1 }, { unique: true });
// Thread view: all rows in a conversation, oldest first.
InboxMessageSchema.index({ user: 1, threadId: 1, createdAt: 1 });
// Inbox list: latest activity per user, and unread-count queries.
InboxMessageSchema.index({ user: 1, createdAt: -1 });
InboxMessageSchema.index({ user: 1, status: 1 });

export default mongoose.models.InboxMessage || mongoose.model("InboxMessage", InboxMessageSchema);
