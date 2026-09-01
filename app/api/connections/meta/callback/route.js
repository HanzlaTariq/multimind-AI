import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Connection from "@/models/Connection";

const META_OAUTH_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${META_OAUTH_VERSION}`;

function getRedirectUri(req) {
  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;
  return `${origin}/api/connections/meta/callback`;
}

function settingsRedirect(req, params) {
  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;
  const url = new URL("/dashboard/settings", origin);
  url.searchParams.set("tab", "connections");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return Response.redirect(url.toString());
}

function readCookie(req, name) {
  const raw = req.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.redirect(new URL("/login", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const metaError = url.searchParams.get("error_description") || url.searchParams.get("error");

  const expectedState = readCookie(req, "meta_oauth_state");

  // Clear the state cookie regardless of outcome — it's single-use.
  const clearCookie = `meta_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

  if (metaError) {
    const res = settingsRedirect(req, { connect_error: "denied" });
    res.headers.append("Set-Cookie", clearCookie);
    return res;
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    const res = settingsRedirect(req, { connect_error: "state_mismatch" });
    res.headers.append("Set-Cookie", clearCookie);
    return res;
  }

  try {
    await dbConnect();

    // 1. Exchange the auth code for a short-lived user access token.
    const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", process.env.META_APP_ID);
    tokenUrl.searchParams.set("client_secret", process.env.META_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", getRedirectUri(req));
    tokenUrl.searchParams.set("code", code);

    const shortLivedRes = await fetch(tokenUrl.toString());
    const shortLivedData = await shortLivedRes.json();
    if (!shortLivedRes.ok || !shortLivedData.access_token) {
      throw new Error(shortLivedData?.error?.message || "Code exchange failed");
    }

    // 2. Exchange the short-lived user token for a long-lived one (~60
    // days). Page tokens minted from a long-lived user token effectively
    // don't expire as long as the user stays an admin of the Page.
    const longLivedUrl = new URL(`${GRAPH}/oauth/access_token`);
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", process.env.META_APP_ID);
    longLivedUrl.searchParams.set("client_secret", process.env.META_APP_SECRET);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedData.access_token);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedRes.json();
    const userAccessToken = longLivedData.access_token || shortLivedData.access_token;

    // 3. List every Facebook Page this user administers, each with its
    // own Page access token (needed for posting as the Page, not as the
    // person).
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`,
    );
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok) {
      throw new Error(pagesData?.error?.message || "Could not list Facebook Pages");
    }
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      const res = settingsRedirect(req, { connect_error: "no_pages" });
      res.headers.append("Set-Cookie", clearCookie);
      return res;
    }

    let facebookCount = 0;
    let instagramCount = 0;

    for (const page of pages) {
      await Connection.findOneAndUpdate(
        { user: session.user.id, platform: "facebook", accountId: page.id },
        {
          user: session.user.id,
          platform: "facebook",
          accountId: page.id,
          accountName: page.name,
          accessToken: page.access_token,
          status: "connected",
          expiresAt: null, // Page tokens from a long-lived user token don't carry a normal expiry
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      facebookCount += 1;

      // 4. Check if this Page has a linked Instagram Business/Creator
      // account. If so, save that too — it's controlled via the same
      // Page access token, just a different Graph API node.
      const igRes = await fetch(
        `${GRAPH}/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token}`,
      );
      const igData = await igRes.json();
      const igAccount = igData.instagram_business_account;

      if (igAccount?.id) {
        await Connection.findOneAndUpdate(
          { user: session.user.id, platform: "instagram", accountId: igAccount.id },
          {
            user: session.user.id,
            platform: "instagram",
            accountId: igAccount.id,
            accountName: igAccount.username || page.name,
            accessToken: page.access_token, // IG Graph API calls use the linked Page's token
            status: "connected",
            expiresAt: null,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        instagramCount += 1;
      }
    }

    const res = settingsRedirect(req, {
      connected: "1",
      fb: String(facebookCount),
      ig: String(instagramCount),
    });
    res.headers.append("Set-Cookie", clearCookie);
    return res;
  } catch (err) {
    const res = settingsRedirect(req, { connect_error: "unknown" });
    res.headers.append("Set-Cookie", clearCookie);
    console.error("Meta OAuth callback failed:", err.message);
    return res;
  }
}