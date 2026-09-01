// Actual Graph API calls, used by lib/flowNodes/registry.js once a flow
// has a real Connection (Phase 4) to post through. Kept separate from the
// registry so the HTTP/Graph-API details don't clutter the node-dispatch
// logic, and so lib/connections/meta callback route could reuse these
// later if needed (e.g. a "test post" button).

const META_OAUTH_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${META_OAUTH_VERSION}`;

/**
 * Posts a text (optionally link) update to a Facebook Page's feed.
 * pageAccessToken must be the Page's own access token (not the user's).
 */
export async function postFacebookFeed({ pageId, pageAccessToken, message, link }) {
  const body = new URLSearchParams({ access_token: pageAccessToken, message: message || "" });
  if (link) body.set("link", link);

  const res = await fetch(`${GRAPH}/${pageId}/feed`, { method: "POST", body });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Facebook post failed");
  }
  return { postId: data.id };
}

/**
 * Publishes an image post to an Instagram Business account. Graph API
 * requires a two-step dance: create a media container from a *publicly
 * reachable* image URL, then publish that container. There's no
 * text-only IG feed post — imageUrl is required.
 */
export async function postInstagramImage({ igUserId, pageAccessToken, imageUrl, caption }) {
  if (!imageUrl) {
    throw new Error("Instagram posts need an image URL — text-only posts aren't supported by the Graph API");
  }

  const containerBody = new URLSearchParams({
    access_token: pageAccessToken,
    image_url: imageUrl,
    caption: caption || "",
  });
  const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    body: containerBody,
  });
  const containerData = await containerRes.json();
  if (!containerRes.ok || !containerData.id) {
    throw new Error(containerData?.error?.message || "Instagram media container creation failed");
  }

  const publishBody = new URLSearchParams({
    access_token: pageAccessToken,
    creation_id: containerData.id,
  });
  const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: "POST",
    body: publishBody,
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData.id) {
    throw new Error(publishData?.error?.message || "Instagram publish failed");
  }

  return { postId: publishData.id };
}

// --- Unified Inbox (Phase 6): replying to comments and sending DMs -------
// Used by app/api/inbox/[id]/reply/route.js. Kept separate per-platform
// like the post functions above, even though FB/IG share an app — the
// Graph API node shape differs enough (comments vs. replies endpoint,
// messaging recipient id) that folding them into one function would just
// mean branching inside it anyway.

/** Replies to a Facebook Page comment. Returns the new reply's id. */
export async function replyToFacebookComment({ commentId, pageAccessToken, message }) {
  const body = new URLSearchParams({ access_token: pageAccessToken, message: message || "" });
  const res = await fetch(`${GRAPH}/${commentId}/comments`, { method: "POST", body });
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(data?.error?.message || "Facebook comment reply failed");
  }
  return { replyId: data.id };
}

/** Replies to an Instagram comment. Returns the new reply's id. */
export async function replyToInstagramComment({ commentId, pageAccessToken, message }) {
  const body = new URLSearchParams({ access_token: pageAccessToken, message: message || "" });
  const res = await fetch(`${GRAPH}/${commentId}/replies`, { method: "POST", body });
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(data?.error?.message || "Instagram comment reply failed");
  }
  return { replyId: data.id };
}

/**
 * Sends a Messenger DM from a Facebook Page to a person who has already
 * messaged it (the Send API only allows replying within Meta's messaging
 * window, not cold outreach — that's a platform rule, not something this
 * function can work around).
 */
export async function sendFacebookMessage({ pageAccessToken, recipientId, text }) {
  const res = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  const data = await res.json();
  if (!res.ok || !data.message_id) {
    throw new Error(data?.error?.message || "Facebook message send failed");
  }
  return { messageId: data.message_id };
}

/** Sends an Instagram DM reply, same constraints as sendFacebookMessage. */
export async function sendInstagramMessage({ igUserId, pageAccessToken, recipientId, text }) {
  const res = await fetch(`${GRAPH}/${igUserId}/messages?access_token=${encodeURIComponent(pageAccessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  const data = await res.json();
  if (!res.ok || !data.message_id) {
    throw new Error(data?.error?.message || "Instagram message send failed");
  }
  return { messageId: data.message_id };
}

// --- Growth Suggestions (Phase 7): recent post + engagement history -----
// Used by app/api/growth/suggestions/route.js to ground the AI's posting
// suggestions in what this account has actually posted, instead of
// generic advice. Both functions return a common shape — { id, text,
// createdAt, likeCount, commentCount, permalink } — so the caller doesn't
// need to branch on platform when computing stats.

/** Recent posts + basic engagement counts from a Facebook Page's feed. */
export async function getFacebookRecentPosts({ pageId, pageAccessToken, limit = 25 }) {
  const url = new URL(`${GRAPH}/${pageId}/posts`);
  url.searchParams.set("access_token", pageAccessToken);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set(
    "fields",
    "id,message,created_time,permalink_url,likes.summary(true).limit(0),comments.summary(true).limit(0),shares",
  );

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Couldn't fetch Facebook post history");
  }

  return (data.data || []).map((p) => ({
    id: p.id,
    text: p.message || "",
    createdAt: p.created_time,
    likeCount: p.likes?.summary?.total_count || 0,
    commentCount: p.comments?.summary?.total_count || 0,
    shareCount: p.shares?.count || 0,
    permalink: p.permalink_url || null,
  }));
}

/** Recent posts + basic engagement counts from an Instagram Business account. */
export async function getInstagramRecentPosts({ igUserId, pageAccessToken, limit = 25 }) {
  const url = new URL(`${GRAPH}/${igUserId}/media`);
  url.searchParams.set("access_token", pageAccessToken);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", "id,caption,timestamp,permalink,like_count,comments_count,media_type");

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Couldn't fetch Instagram post history");
  }

  return (data.data || []).map((p) => ({
    id: p.id,
    text: p.caption || "",
    createdAt: p.timestamp,
    likeCount: p.like_count || 0,
    commentCount: p.comments_count || 0,
    mediaType: p.media_type,
    permalink: p.permalink || null,
  }));
}