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