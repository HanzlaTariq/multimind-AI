// Thin wrapper around the handful of Google REST APIs the Invoice Parser
// Agent (and any future Google-powered node) needs: Drive (list/read
// files, OCR conversion), Sheets (append rows), and Gmail (send a
// summary email). Deliberately plain `fetch` calls rather than the
// `googleapis` npm package — that package is a large dependency for what
// is, per endpoint, a single JSON request, and it would be the only
// consumer of it in this codebase (see lib/aiProviders.js and
// lib/socialPosting.js, which take the same plain-fetch approach for
// Gemini/Graph API).
//
// Auth model: unlike Meta Page tokens (effectively non-expiring, see
// app/api/connections/meta/callback), Google OAuth access tokens expire
// in ~1 hour. So every call here first asks getFreshAccessToken() for a
// token, which transparently refreshes via the stored refresh_token when
// the cached access token is expired or close to it. Connection.expiresAt
// (already on the schema) tracks that expiry; accessToken/refreshToken
// stay encrypted at rest exactly like every other platform's tokens
// (models/Connection.js's pre-save hook handles that automatically).

import dbConnect from "@/lib/mongodb";
import Connection from "@/models/Connection";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE = "https://www.googleapis.com/drive/v3";
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

// Refresh a bit before the real expiry so a slow request never straddles
// the boundary and gets a 401 mid-call.
const EXPIRY_SAFETY_MARGIN_MS = 60 * 1000;

/**
 * Returns a live access token for a Google Connection, refreshing it
 * first if the cached one has expired (or is missing an expiry, which
 * shouldn't normally happen but is treated as "expired" to be safe).
 * Scoped to `userId` so one user can never use another's connection id.
 */
export async function getFreshAccessToken(connectionId, userId) {
  await dbConnect();

  const connection = await Connection.findOne({
    _id: connectionId,
    user: userId,
    platform: "google",
  }).select("+accessToken +refreshToken expiresAt status");

  if (!connection) {
    throw new Error("Connected Google account not found (or doesn't belong to this user)");
  }
  if (connection.status !== "connected") {
    throw new Error(`Connected Google account is ${connection.status}, not connected`);
  }

  const { accessToken, refreshToken } = connection.getDecryptedTokens();
  const stillValid = connection.expiresAt && connection.expiresAt.getTime() - Date.now() > EXPIRY_SAFETY_MARGIN_MS;
  if (stillValid && accessToken) {
    return accessToken;
  }

  if (!refreshToken) {
    // No refresh_token usually means the user connected without Google's
    // consent screen forcing `access_type=offline` + `prompt=consent`
    // (e.g. a re-auth on an account that had already granted access
    // once before). Only fix is reconnecting.
    connection.status = "expired";
    await connection.save();
    throw new Error("Google connection has expired and has no refresh token — reconnect it in Settings");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    // A refresh_token can go bad (user revoked access from their Google
    // Account page, password change, etc.) — surface that as "expired"
    // rather than a generic error so the Connections UI can prompt a
    // reconnect instead of just showing a red dot.
    connection.status = "expired";
    await connection.save();
    throw new Error(data?.error_description || "Google access token refresh failed — reconnect the account in Settings");
  }

  connection.accessToken = data.access_token;
  connection.expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);
  await connection.save();

  return data.access_token;
}

async function driveFetch(path, accessToken, options = {}) {
  const res = await fetch(`${DRIVE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || `Drive request failed (${res.status})`);
  }
  return res;
}

/** Files created/modified in `folderId` since `sinceIso` (or ever, if omitted), newest first. */
export async function driveListRecentFiles({ accessToken, folderId, sinceIso, pageSize = 25 }) {
  const clauses = [`'${folderId}' in parents`, "trashed = false"];
  if (sinceIso) clauses.push(`createdTime > '${sinceIso}'`);
  const q = encodeURIComponent(clauses.join(" and "));
  const fields = encodeURIComponent("files(id,name,mimeType,createdTime,webViewLink)");
  const res = await driveFetch(
    `/files?q=${q}&orderBy=createdTime&pageSize=${pageSize}&fields=${fields}`,
    accessToken,
  );
  const data = await res.json();
  return data.files || [];
}

export async function driveGetFile(fileId, accessToken) {
  const res = await driveFetch(
    `/files/${fileId}?fields=${encodeURIComponent("id,name,mimeType,webViewLink")}`,
    accessToken,
  );
  return res.json();
}

// Native Google Docs export straight to plain text.
async function exportGoogleDocText(fileId, accessToken) {
  const res = await driveFetch(`/files/${fileId}/export?mimeType=text/plain`, accessToken);
  return res.text();
}

// Everything that ISN'T already a Google Doc (PDF, scanned image, photo
// of a handwritten slip, a .docx someone uploaded, ...) goes through this:
// ask Drive to make a Google-Docs COPY of the file. When the source is a
// PDF or image, Drive silently runs the same OCR engine that powers
// "Open with Google Docs" on a scanned PDF, so the resulting copy is
// already machine-readable text — no separate OCR service/API key needed.
// The temp copy is deleted right after its text is read out, so it never
// clutters the user's Drive.
async function ocrConvertAndExtractText(fileId, accessToken) {
  const copyRes = await driveFetch(`/files/${fileId}/copy?fields=id`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mimeType: "application/vnd.google-apps.document" }),
  });
  const { id: tempDocId } = await copyRes.json();

  try {
    return await exportGoogleDocText(tempDocId, accessToken);
  } finally {
    // Best-effort cleanup — a failed delete shouldn't fail the whole
    // extraction, the temp doc is harmless clutter at worst.
    driveFetch(`/files/${tempDocId}`, accessToken, { method: "DELETE" }).catch(() => {});
  }
}

/**
 * Full text of a Drive file, whatever format it's in. Google Docs export
 * directly; everything else (PDF, image scans, Office docs, ...) goes
 * through the OCR-copy trick above.
 */
export async function driveExtractText(fileId, accessToken) {
  const meta = await driveGetFile(fileId, accessToken);
  const text =
    meta.mimeType === "application/vnd.google-apps.document"
      ? await exportGoogleDocText(fileId, accessToken)
      : await ocrConvertAndExtractText(fileId, accessToken);
  return { text: text.trim(), fileName: meta.name, webViewLink: meta.webViewLink };
}

/**
 * Appends rows to a sheet, writing a header row first if the sheet is
 * currently empty. Columns are derived from the union of every row
 * object's keys (in first-seen order) rather than a fixed schema, since
 * the whole point of this node is that the source document's columns
 * aren't known ahead of time (an invoice looks different from an order
 * slip). Returns how many data rows were written and a direct link to
 * the sheet.
 */
export async function sheetsAppendRows({ accessToken, spreadsheetId, sheetName, rows }) {
  if (!rows.length) {
    return { appendedCount: 0, sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` };
  }

  const range = encodeURIComponent(`${sheetName}!A1`);
  const existingRes = await fetch(
    `${SHEETS}/${spreadsheetId}/values/${encodeURIComponent(`${sheetName}!A1:Z1`)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const existingData = existingRes.ok ? await existingRes.json() : {};
  const hasHeader = (existingData.values?.[0]?.length || 0) > 0;

  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const values = rows.map((r) => columns.map((c) => (r[c] === undefined || r[c] === null ? "" : String(r[c]))));
  if (!hasHeader) values.unshift(columns);

  const res = await fetch(
    `${SHEETS}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || `Sheets append failed (${res.status})`);
  }

  return {
    appendedCount: rows.length,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

function base64UrlEncode(str) {
  return Buffer.from(str, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Sends an HTML email via the Gmail API, as the connected Google account. */
export async function gmailSendHtml({ accessToken, to, subject, html }) {
  const raw = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\r\n");

  const res = await fetch(GMAIL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: base64UrlEncode(raw) }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || `Gmail send failed (${res.status})`);
  }
  return res.json();
}
