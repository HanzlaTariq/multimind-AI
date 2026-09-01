import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Kicks off Google OAuth for the Invoice Parser Agent (and any future
// Google-powered node): Drive read access to find/read the source file,
// Sheets write access to append extracted rows, Gmail send access for
// the summary email. One consent screen, one Connection doc covers all
// three — see app/api/connections/google/callback/route.js.
//
// Mirrors app/api/connections/meta/authorize/route.js's shape (same
// state-cookie CSRF protection), swapped for Google's dialog + scopes.

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function getRedirectUri(req) {
  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;
  return `${origin}/api/connections/google/callback`;
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.redirect(new URL("/login", req.url));
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return Response.json(
      { error: "GOOGLE_CLIENT_ID is not configured on the server yet." },
      { status: 500 },
    );
  }

  const state = crypto.randomBytes(24).toString("hex");

  const dialogUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  dialogUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  dialogUrl.searchParams.set("redirect_uri", getRedirectUri(req));
  dialogUrl.searchParams.set("state", state);
  dialogUrl.searchParams.set("scope", SCOPES);
  dialogUrl.searchParams.set("response_type", "code");
  // access_type=offline + prompt=consent is what makes Google actually
  // hand back a refresh_token — without both, a user who'd previously
  // granted access (even to a different scope set) can silently get a
  // code-exchange response with no refresh_token at all.
  dialogUrl.searchParams.set("access_type", "offline");
  dialogUrl.searchParams.set("prompt", "consent");
  dialogUrl.searchParams.set("include_granted_scopes", "true");

  const res = Response.redirect(dialogUrl.toString());
  res.headers.append(
    "Set-Cookie",
    `google_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
  return res;
}
