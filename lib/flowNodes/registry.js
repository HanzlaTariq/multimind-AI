// Every built-in node type gets one execute(config, context) function here.
// This is deliberately the ONLY place that knows how to "run" a node —
// the canvas, the palette, and the run route never branch on node type
// directly, they just call whatever's registered here for node.type. That
// makes adding a new node type in the future a two-file change: an entry
// in components/flows/nodeTypesConfig.js (what it looks like + its config
// form) and an entry here (what it does).
//
// None of these make real platform API calls yet — Phase 4 (OAuth) has to
// land first so there's a real access token to call with, and Phase 5
// replaces the naive array-order loop in the run route with a proper
// topological traversal that threads real node-to-node data through
// `context`. Until then, every executor returns a clearly-labeled
// simulated result so the UI/UX and this plugin seam can be built and
// tested end-to-end — exactly the "fake execution first" approach the
// plan calls for.
//
// context: { previousOutput, connections } — `connections` is a map of
// connectionId -> { platform, accountName } for whatever accounts the
// flow's platform nodes reference (fetched once per run, not per node).

function simulated(message, extra = {}) {
  return { simulated: true, message, ...extra };
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
    if (!config.prompt) return simulated("No prompt set — nothing to generate", { output: "" });
    // Placeholder generation: Phase 5 routes this through lib/providers.js
    // (the same AI router the chat feature uses) instead of templating.
    const text = `[${config.tone || "casual"} caption] ${config.prompt}`;
    return simulated("Generated a caption (simulated, not a real AI call yet)", { output: text });
  },

  "ai.generateImage": async (config) => {
    if (!config.prompt) return simulated("No prompt set — nothing to generate", { output: null });
    return simulated(`Would generate a ${config.style || "photorealistic"} image (simulated)`, {
      output: { prompt: config.prompt, style: config.style || "photorealistic" },
    });
  },

  "ai.generateVideoScript": async (config) => {
    if (!config.prompt) return simulated("No prompt set — nothing to generate", { output: "" });
    return simulated("Generated a video script (simulated)", {
      output: `[~${config.durationSeconds || 30}s script] ${config.prompt}`,
    });
  },

  "platform.instagramPost": async (config, context) => platformAction(config, context, "post to Instagram"),
  "platform.instagramStory": async (config, context) => platformAction(config, context, "post an Instagram Story"),
  "platform.instagramReply": async (config, context) => platformAction(config, context, "reply on Instagram"),
  "platform.instagramDm": async (config, context) => platformAction(config, context, "send an Instagram DM"),
  "platform.facebookPost": async (config, context) => platformAction(config, context, "post to Facebook"),
  "platform.facebookReply": async (config, context) => platformAction(config, context, "reply on Facebook"),
  "platform.facebookMessage": async (config, context) => platformAction(config, context, "send a Facebook message"),
  "platform.whatsappSend": async (config, context) => platformAction(config, context, "send a WhatsApp message"),
  "platform.whatsappTemplate": async (config, context) =>
    platformAction(config, context, `send WhatsApp template "${config.templateName || "(unnamed)"}"`),
  "platform.tiktokUpload": async (config, context) => platformAction(config, context, "upload a TikTok video"),

  "logic.condition": async (config, context) => {
    const subject = context.previousOutput ?? "";
    const value = String(subject);
    let passed;
    if (config.operator === "equals") passed = value === config.value;
    else if (config.operator === "notEmpty") passed = value.trim().length > 0;
    else passed = value.includes(config.value || "");
    return simulated(`Condition ${passed ? "passed" : "did not pass"} (simulated check)`, { output: passed });
  },

  "logic.delay": async (config) => simulated(`Would wait ${config.durationMinutes || 5} minute(s)`),

  "logic.loop": async (config) => simulated(`Would repeat over: ${config.overField || "(not set)"}`),
};

function platformAction(config, context, actionLabel) {
  if (!config.connectionId) {
    return simulated(`No account selected — can't ${actionLabel}`, { output: null });
  }
  const account = context.connections?.[config.connectionId];
  const accountLabel = account ? account.accountName : "the connected account";
  return simulated(`Would ${actionLabel} as ${accountLabel} (simulated — no live post made)`, {
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
    return { simulated: true, error: err.message || "Node execution failed" };
  }
}
