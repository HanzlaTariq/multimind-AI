import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Kicks off the Meta (Facebook + Instagram) OAuth flow. Both platforms
// share the same Graph API app and consent dialog — a user grants access
// to their Facebook Pages, and any Instagram Business account linked to
// those Pages comes along for free (see the callback route).
//
// This route only *starts* the flow — it never talks to Graph API itself,
// it just redirects the browser to Meta's login dialog. All the real work
// (code exchange, saving Connection docs) happens in ../callback.

const META_OAUTH_VERSION = "v21.0";

// Permissions needed to: list Pages, read their basic info, post to them,
// and read/publish to a linked Instagram Business account. Each of these
// needs Meta App Review approval before it works for accounts other than
// your own app's testers/admins — see the note in ../callback/route.js.
const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_manage_metadata",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");

function getRedirectUri(req) {
  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;
  return `${origin}/api/connections/meta/callback`;
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.redirect(new URL("/login", req.url));
  }

  if (!process.env.META_APP_ID) {
    return Response.json(
      { error: "META_APP_ID is not configured on the server yet." },
      { status: 500 },
    );
  }

  // Random, single-use state value. We store it in a short-lived httpOnly
  // cookie and expect Meta to echo it back on the callback — this is what
  // stops an attacker from tricking a signed-in user into linking the
  // attacker's Facebook Page to the victim's MultiMind account (CSRF on
  // the OAuth dance).
  const state = crypto.randomBytes(24).toString("hex");

  const dialogUrl = new URL(`https://www.facebook.com/${META_OAUTH_VERSION}/dialog/oauth`);
  dialogUrl.searchParams.set("client_id", process.env.META_APP_ID);
  dialogUrl.searchParams.set("redirect_uri", getRedirectUri(req));
  dialogUrl.searchParams.set("state", state);
  dialogUrl.searchParams.set("scope", SCOPES);
  dialogUrl.searchParams.set("response_type", "code");

  const res = Response.redirect(dialogUrl.toString());
  res.headers.append(
    "Set-Cookie",
    `meta_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
  return res;
}