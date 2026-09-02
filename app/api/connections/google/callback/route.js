import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Connection from "@/models/Connection";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function getRedirectUri(req) {
  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;
  return `${origin}/api/connections/google/callback`;
}

function settingsRedirect(req, params) {
  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;
  const url = new URL("/dashboard/settings", origin);
  url.searchParams.set("tab", "connections");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url.toString());
}

function clearStateCookie(res) {
  res.cookies.set("google_oauth_state", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });
  return res;
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
  const googleError = url.searchParams.get("error");

  const expectedState = readCookie(req, "google_oauth_state");

  if (googleError) {
    return clearStateCookie(settingsRedirect(req, { connect_error: "denied" }));
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return clearStateCookie(settingsRedirect(req, { connect_error: "state_mismatch" }));
  }

  try {
    await dbConnect();

    // 1. Exchange the auth code for tokens. With access_type=offline +
    // prompt=consent (set in ../authorize/route.js) this includes a
    // refresh_token, needed since Google access tokens only last ~1hr —
    // see lib/googleClient.js's getFreshAccessToken.
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: getRedirectUri(req),
        code,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData?.error_description || "Code exchange failed");
    }

    // 2. Who is this? Google connections are identified by the Google
    // account's own user id (`sub`), matching the (user, platform,
    // accountId) uniqueness the Connection schema already enforces for
    // every other platform.
    const userInfoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();
    if (!userInfoRes.ok || !userInfo.id) {
      throw new Error("Could not read the connected Google account's identity");
    }

    // $set (not a bare replacement object like the Meta callback uses) —
    // deliberately, so that a re-consent that comes back WITHOUT a fresh
    // refresh_token (Google only issues one the first time, or when
    // scopes change) doesn't wipe out the working one already saved. A
    // bare replacement document would drop any field not included here.
    await Connection.findOneAndUpdate(
      { user: session.user.id, platform: "google", accountId: userInfo.id },
      {
        $set: {
          user: session.user.id,
          platform: "google",
          accountId: userInfo.id,
          accountName: userInfo.email || "Google account",
          accessToken: tokenData.access_token,
          expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
          status: "connected",
          ...(tokenData.refresh_token ? { refreshToken: tokenData.refresh_token } : {}),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return clearStateCookie(settingsRedirect(req, { connected: "1", google: "1" }));
  } catch (err) {
    console.error("Google OAuth callback failed:", err.message);
    return clearStateCookie(settingsRedirect(req, { connect_error: "unknown" }));
  }
}