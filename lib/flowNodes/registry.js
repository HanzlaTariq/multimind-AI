// Every built-in node type gets one execute(config, context) function here.
// This is deliberately the ONLY place that knows how to "run" a node —
// the canvas, the palette, and the run route never branch on node type
// directly, they just call whatever's registered here for node.type. That
// makes adding a new node type in the future a two-file change: an entry
// in components/flows/nodeTypesConfig.js (what it looks like + its config
// form) and an entry here (what it does).
//
// Phase 5 status:
// - ai.generateCaption / ai.generateVideoScript: REAL — routed through the
//   same multi-provider text generation the chat feature uses
//   (lib/aiProviders.js), picked automatically by lib/providers.js.
// - platform.facebookPost / platform.instagramPost: REAL — actual Graph
//   API calls via lib/socialPosting.js, using the Page/IG access token
//   saved by the Phase 4 Meta OAuth connect flow.
// - ai.generateImage, and every other platform.* node (reply, DM, story,
//   WhatsApp, TikTok): still simulated. Images need an image-gen provider
//   wired up. Comment/DM replies specifically: the webhook receiver and
//   InboxMessage storage now exist (Phase 6 — see app/api/webhooks/meta
//   and app/dashboard/inbox), and replying is real *from the Inbox UI*
//   (app/api/inbox/[id]/reply, via lib/socialPosting's
//   replyToFacebookComment/replyToInstagramComment/send*Message). What's
//   still missing is wiring a flow run to a *specific* inbound comment/DM
//   id — these nodes only make sense today as manual/scheduled canvas
//   steps, which have no particular message to target. Making
//   trigger.newMessage fire a flow per-inbound-event (so these nodes have
//   something real to reply to) is future work, not yet built.
//
// context: { previousOutput, connections, userId } — `connections` is a
// map of connectionId -> { platform, accountName } for display purposes;
// the real call functions below fetch the actual (decrypted) access token
// themselves, scoped to `userId`, right before use — the token is never
// threaded through `context` or logged.

import dbConnect from "@/lib/mongodb";
import Connection from "@/models/Connection";
import User from "@/models/User";
import { generateText } from "@/lib/aiProviders";
import { postFacebookFeed, postInstagramImage } from "@/lib/socialPosting";
import { getFreshAccessToken, driveExtractText, sheetsAppendRows, gmailSendHtml } from "@/lib/googleClient";
import { invoiceParserSummaryHtml } from "@/lib/emailTemplates/invoiceParserSummary";
import { DEFAULT_EXTRACTION_PROMPT } from "./constants";

function simulated(message, extra = {}) {
  return { simulated: true, message, ...extra };
}

const FLOWS_SYSTEM_PROMPT =
  "You write short-form social media content. Output only the requested text itself — no preamble, no quotation marks, no explaining what you wrote.";

const STRUCTURED_EXTRACTION_SYSTEM_PROMPT =
  "You extract structured data from documents. You always respond with raw JSON only — never markdown code fences, never prose before or after the JSON, never an explanation of what you extracted.";

/** Looks up a connection's decrypted access token, scoped to this user. */
async function getConnectionToken(connectionId, userId) {
  await dbConnect();
  const connection = await Connection.findOne({ _id: connectionId, user: userId }).select(
    "+accessToken platform accountId accountName status",
  );
  if (!connection) throw new Error("Connected account not found (or doesn't belong to this user)");
  if (connection.status !== "connected") throw new Error(`Connected account is ${connection.status}, not connected`);
  const { accessToken } = connection.getDecryptedTokens();
  return { accessToken, accountId: connection.accountId, accountName: connection.accountName };
}

/** Runs a prompt through whichever configured AI provider best fits it. */
async function generateFlowText(prompt) {
  return generateText(prompt, FLOWS_SYSTEM_PROMPT);
}

const EXECUTORS = {
  "trigger.manual": async () => simulated("Manually triggered"),

  "trigger.schedule": async (config) => {
    const time = config.time || "09:00";
    const cadence = config.frequency === "weekly" ? `every ${config.dayOfWeek || "Mon"}` : "daily";
    return simulated(`Would fire ${cadence} at ${time}`);
  },

  "trigger.newMessage": async (config) =>
    simulated(`Would fire on a new ${config.eventType || "dm"} on ${config.platform || "instagram"}`),

  "ai.generateCaption": async (config) => {
    if (!config.prompt) return { error: "No prompt set — nothing to generate" };
    const tonePrefix = config.tone ? `Tone: ${config.tone}. ` : "";
    const text = await generateFlowText(`${tonePrefix}Write a social media caption about: ${config.prompt}`);
    return { output: text, message: "Caption generated" };
  },

  "ai.generateImage": async (config) => {
    if (!config.prompt) return simulated("No prompt set — nothing to generate", { output: null });
    return simulated(`Would generate a ${config.style || "photorealistic"} image (simulated — no image-gen provider wired up yet)`, {
      output: { prompt: config.prompt, style: config.style || "photorealistic" },
    });
  },

  "ai.generateVideoScript": async (config) => {
    if (!config.prompt) return { error: "No prompt set — nothing to generate" };
    const text = await generateFlowText(
      `Write a ${config.durationSeconds || 30}-second short-form video script about: ${config.prompt}`,
    );
    return { output: text, message: "Video script generated" };
  },

  "platform.instagramPost": async (config, context) => {
    if (!config.connectionId) return { error: "No account selected — can't post to Instagram" };

    const caption = config.caption || (typeof context.previousOutput === "string" ? context.previousOutput : "");
    const imageUrl =
      config.imageUrl ||
      (typeof context.previousOutput === "string" && /^https?:\/\/.+\.(jpe?g|png)(\?.*)?$/i.test(context.previousOutput)
        ? context.previousOutput
        : null);

    if (!imageUrl) {
      return {
        error:
          "Instagram needs a public image URL — set one in the node's Image URL field (the Generate Image node is still simulated and can't supply a real one yet)",
      };
    }

    try {
      const { accessToken, accountId, accountName } = await getConnectionToken(
        config.connectionId,
        context.userId,
      );
      const { postId } = await postInstagramImage({
        igUserId: accountId,
        pageAccessToken: accessToken,
        imageUrl,
        caption,
      });
      return { output: { postId }, message: `Posted to Instagram as ${accountName} (post id: ${postId})` };
    } catch (err) {
      return { error: err.message || "Instagram post failed" };
    }
  },

  "platform.facebookPost": async (config, context) => {
    if (!config.connectionId) return { error: "No account selected — can't post to Facebook" };

    const message =
      config.message || (typeof context.previousOutput === "string" ? context.previousOutput : "");
    if (!message) {
      return { error: "Nothing to post — connect an AI content node upstream or set a Message override" };
    }

    try {
      const { accessToken, accountId, accountName } = await getConnectionToken(
        config.connectionId,
        context.userId,
      );
      const { postId } = await postFacebookFeed({
        pageId: accountId,
        pageAccessToken: accessToken,
        message,
        link: config.link || undefined,
      });
      return { output: { postId }, message: `Posted to Facebook Page ${accountName} (post id: ${postId})` };
    } catch (err) {
      return { error: err.message || "Facebook post failed" };
    }
  },

  "platform.instagramStory": async (config, context) => platformNotYetLive(config, context, "post an Instagram Story"),
  "platform.instagramReply": async (config, context) =>
    platformNotYetLive(config, context, "reply on Instagram", "needs a real incoming-comment webhook (Phase 6)"),
  "platform.instagramDm": async (config, context) =>
    platformNotYetLive(config, context, "send an Instagram DM", "needs a real incoming-DM webhook (Phase 6)"),
  "platform.facebookReply": async (config, context) =>
    platformNotYetLive(config, context, "reply on Facebook", "needs a real incoming-comment webhook (Phase 6)"),
  "platform.facebookMessage": async (config, context) =>
    platformNotYetLive(config, context, "send a Facebook message", "needs a real incoming-message webhook (Phase 6)"),
  "platform.whatsappSend": async (config, context) =>
    platformNotYetLive(config, context, "send a WhatsApp message", "WhatsApp connect flow isn't built yet"),
  "platform.whatsappTemplate": async (config, context) =>
    platformNotYetLive(
      config,
      context,
      `send WhatsApp template "${config.templateName || "(unnamed)"}"`,
      "WhatsApp connect flow isn't built yet",
    ),
  "platform.tiktokUpload": async (config, context) =>
    platformNotYetLive(config, context, "upload a TikTok video", "TikTok connect flow isn't built yet"),

  "logic.condition": async (config, context) => {
    const subject = context.previousOutput ?? "";
    const value = String(subject);
    let passed;
    if (config.operator === "equals") passed = value === config.value;
    else if (config.operator === "notEmpty") passed = value.trim().length > 0;
    else passed = value.includes(config.value || "");
    return { output: passed, message: `Condition ${passed ? "passed" : "did not pass"}` };
  },

  "logic.delay": async (config) => simulated(`Would wait ${config.durationMinutes || 5} minute(s) (simulated — no real scheduling yet)`),

  "logic.loop": async (config) => simulated(`Would repeat over: ${config.overField || "(not set)"} (simulated)`),

  // --- Invoice Parser Agent nodes ------------------------------------------
  // See the module comment at the top: `context.triggerSeed` is only
  // present when lib/flowNodes/runFlow.js was called by the Drive-poll
  // cron with a specific file it just found (app/api/cron/drive-poll).
  // On a manual Run from the canvas there's no real file to react to, so
  // this behaves like every other trigger node and just describes what
  // it would do.
  "trigger.driveNewFile": async (config, context) => {
    if (context.triggerSeed) {
      return {
        output: { connectionId: config.connectionId, ...context.triggerSeed },
        message: `New file detected: ${context.triggerSeed.fileName}`,
      };
    }
    if (!config.connectionId || !config.folderId) {
      return simulated("No Drive account/folder selected yet — can't watch for new files", { output: null });
    }
    return simulated(`Would fire when a new file is added to the connected Drive folder`);
  },

  // No config of its own — takes whatever the trigger handed downstream
  // (connectionId + fileId) and turns the file into plain text, OCR'ing
  // automatically if it isn't already a Google Doc (see driveExtractText).
  "action.extractDocument": async (_config, context) => {
    const prev = context.previousOutput;
    if (!prev?.fileId || !prev?.connectionId) {
      return { error: "No file to extract — connect this after a trigger that provides one" };
    }
    try {
      const accessToken = await getFreshAccessToken(prev.connectionId, context.userId);
      const { text, fileName, webViewLink } = await driveExtractText(prev.fileId, accessToken);
      if (!text) {
        return { error: `Extracted no text from "${fileName}" — the file may be empty or unreadable` };
      }
      return {
        output: { ...prev, fileName, webViewLink, text },
        message: `Extracted ${text.length.toLocaleString()} characters from ${fileName}`,
      };
    } catch (err) {
      return { error: err.message || "Document extraction failed" };
    }
  },

  "ai.extractStructuredData": async (config, context) => {
    const prev = context.previousOutput;
    if (!prev?.text) {
      return { error: "No document text to extract from — connect this after an Extract Document node" };
    }

    const prompt = `${config.extractionPrompt || DEFAULT_EXTRACTION_PROMPT}\n\n---\nDOCUMENT TEXT:\n${prev.text}`;

    let raw;
    try {
      raw = await generateText(prompt, STRUCTURED_EXTRACTION_SYSTEM_PROMPT);
    } catch (err) {
      return { error: err.message || "AI extraction failed" };
    }

    // Models sometimes wrap JSON in ```json fences despite instructions
    // not to — strip those before parsing rather than failing outright.
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

    let rows;
    try {
      const parsed = JSON.parse(cleaned);
      rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rows) ? parsed.rows : null;
      if (!rows) throw new Error("Response was valid JSON but not an array of rows");
    } catch (parseErr) {
      // Per the spec: don't drop this silently. The row(s) are skipped,
      // but the failure is recorded in this node's log entry (which the
      // run route already writes to FlowRun.logs) and surfaced to the
      // user later in the summary email via failedCount.
      return {
        error: `Could not parse AI response as structured data: ${parseErr.message}`,
        output: { ...prev, rows: [], failedCount: 1 },
      };
    }

    return {
      output: { ...prev, rows, failedCount: 0 },
      message: `Extracted ${rows.length} row${rows.length === 1 ? "" : "s"}`,
    };
  },

  "action.appendToSheet": async (config, context) => {
    const prev = context.previousOutput;
    if (!config.connectionId || !config.spreadsheetId || !config.sheetName) {
      return { error: "Sheet not configured — set the account, spreadsheet, and sheet name" };
    }
    const rows = prev?.rows || [];
    try {
      const accessToken = await getFreshAccessToken(config.connectionId, context.userId);
      const { appendedCount, sheetUrl } = await sheetsAppendRows({
        accessToken,
        spreadsheetId: config.spreadsheetId,
        sheetName: config.sheetName,
        rows,
      });
      return {
        output: { ...prev, appendedCount, sheetUrl },
        message: appendedCount
          ? `Added ${appendedCount} row${appendedCount === 1 ? "" : "s"} to the sheet`
          : "Nothing to append — no rows were extracted",
      };
    } catch (err) {
      return { error: err.message || "Appending to sheet failed" };
    }
  },

  "action.sendEmail": async (config, context) => {
    const prev = context.previousOutput || {};
    if (!config.connectionId) {
      return { error: "No Gmail account selected — can't send the summary email" };
    }
    try {
      await dbConnect();
      const toEmail = config.toEmail || (await User.findById(context.userId).select("email").lean())?.email;
      if (!toEmail) {
        return { error: "No recipient email set, and couldn't fall back to the account's own email" };
      }

      const accessToken = await getFreshAccessToken(config.connectionId, context.userId);
      const rowCount = prev.appendedCount ?? prev.rows?.length ?? 0;
      const html = invoiceParserSummaryHtml({
        fileName: prev.fileName || "the source file",
        fileWebViewLink: prev.webViewLink || "#",
        rowCount,
        failedCount: prev.failedCount || 0,
        sheetUrl: prev.sheetUrl || "#",
      });

      await gmailSendHtml({
        accessToken,
        to: toEmail,
        subject: `${rowCount} row${rowCount === 1 ? "" : "s"} extracted from ${prev.fileName || "your document"}`,
        html,
      });
      return { output: { message: "Email sent" }, message: `Summary email sent to ${toEmail}` };
    } catch (err) {
      return { error: err.message || "Sending the summary email failed" };
    }
  },
};

function platformNotYetLive(config, context, actionLabel, reason = "not connected yet") {
  if (!config.connectionId) {
    return simulated(`No account selected — can't ${actionLabel}`, { output: null });
  }
  const account = context.connections?.[config.connectionId];
  const accountLabel = account ? account.accountName : "the connected account";
  return simulated(`Would ${actionLabel} as ${accountLabel} — ${reason}`, {
    output: { connectionId: config.connectionId },
  });
}

export function getExecutor(nodeType) {
  return EXECUTORS[nodeType] || null;
}

export async function executeNode(nodeType, config = {}, context = {}) {
  const executor = getExecutor(nodeType);
  if (!executor) {
    return simulated(`No executor registered for node type "${nodeType}"`);
  }
  try {
    return await executor(config, context);
  } catch (err) {
    return { error: err.message || "Node execution failed" };
  }
}