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
//   wired up; comment/DM replies need a real incoming-webhook context
//   (Phase 6 Unified Inbox) to know *which* comment/thread to reply to —
//   there's nothing to safely call yet.
//
// context: { previousOutput, connections, userId } — `connections` is a
// map of connectionId -> { platform, accountName } for display purposes;
// the real call functions below fetch the actual (decrypted) access token
// themselves, scoped to `userId`, right before use — the token is never
// threaded through `context` or logged.

import dbConnect from "@/lib/mongodb";
import Connection from "@/models/Connection";
import { routeToProvider } from "@/lib/providers";
import { PROVIDER_CALLERS } from "@/lib/aiProviders";
import { postFacebookFeed, postInstagramImage } from "@/lib/socialPosting";

function simulated(message, extra = {}) {
  return { simulated: true, message, ...extra };
}

const FLOWS_SYSTEM_PROMPT =
  "You write short-form social media content. Output only the requested text itself — no preamble, no quotation marks, no explaining what you wrote.";

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
async function generateText(prompt) {
  const provider = routeToProvider(prompt);
  if (!provider) {
    throw new Error("No AI provider is configured on the server (missing API keys)");
  }
  const caller = PROVIDER_CALLERS[provider.id];
  const result = await caller(prompt, [], FLOWS_SYSTEM_PROMPT);
  if (result.status !== "ok" || !result.text?.trim()) {
    throw new Error(result.text || `${provider.label} failed to respond`);
  }
  return result.text.trim();
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
    const text = await generateText(`${tonePrefix}Write a social media caption about: ${config.prompt}`);
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
    const text = await generateText(
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