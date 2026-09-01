// The built-in node library. Each entry is metadata + a `configSchema`
// (which fields the inspector renders, stored under node.data.config) plus
// a `type` string the execution engine keys off. This file stays plain
// data — server and client code, and the execute-function registry in
// lib/flowNodes/registry.js, all import from here — so adding a new node
// type is meant to mean "add one entry below", not "touch the canvas,
// palette, inspector, or execution engine code".
//
// icon values are lucide-react export names, resolved to components in
// components/flows/nodeIcons.js (kept separate so this file stays plain
// data and can be imported from both server and client code).
//
// configSchema field shape:
//   { key, label, type: "text"|"textarea"|"select"|"time"|"number",
//     placeholder?, helpText?, options?: [{value,label}], default? }

export const NODE_CATEGORIES = {
  trigger: { label: "Triggers", accent: "amber" },
  ai: { label: "AI Content", accent: "violet" },
  platform: { label: "Platform Actions", accent: "sky" },
  logic: { label: "Logic", accent: "emerald" },
  // Google Workspace-powered nodes (Invoice Parser Agent template): a
  // Drive file trigger, document/OCR text extraction, and actions that
  // write to Sheets or send through Gmail. Kept as its own category
  // rather than folded into "platform" since these aren't social
  // accounts and don't share that category's connection semantics
  // (a Google connection covers Drive+Sheets+Gmail together, not one
  // account per service).
  google: { label: "Google Workspace", accent: "emerald" },
};

export const NODE_TYPES = [
  // --- Triggers ----------------------------------------------------------
  {
    type: "trigger.manual",
    category: "trigger",
    label: "Manual Trigger",
    icon: "Play",
    description: "Starts the flow when you press Run",
    configSchema: [],
  },
  {
    type: "trigger.schedule",
    category: "trigger",
    label: "Schedule Trigger",
    icon: "Clock",
    description: "Starts the flow on a recurring schedule",
    configSchema: [
      {
        key: "frequency",
        label: "Repeats",
        type: "select",
        default: "daily",
        options: [
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
        ],
      },
      {
        key: "dayOfWeek",
        label: "Day of week",
        type: "select",
        default: "mon",
        showIf: { key: "frequency", equals: "weekly" },
        options: [
          { value: "mon", label: "Monday" },
          { value: "tue", label: "Tuesday" },
          { value: "wed", label: "Wednesday" },
          { value: "thu", label: "Thursday" },
          { value: "fri", label: "Friday" },
          { value: "sat", label: "Saturday" },
          { value: "sun", label: "Sunday" },
        ],
      },
      { key: "time", label: "Time", type: "time", default: "09:00" },
    ],
  },
  {
    type: "trigger.newMessage",
    category: "trigger",
    label: "New DM / Comment",
    icon: "Webhook",
    description: "Starts the flow when someone DMs or comments",
    configSchema: [
      {
        key: "platform",
        label: "Platform",
        type: "select",
        default: "instagram",
        options: [
          { value: "instagram", label: "Instagram" },
          { value: "facebook", label: "Facebook" },
          { value: "whatsapp", label: "WhatsApp" },
        ],
      },
      {
        key: "eventType",
        label: "Event",
        type: "select",
        default: "dm",
        options: [
          { value: "dm", label: "New direct message" },
          { value: "comment", label: "New comment" },
        ],
      },
    ],
  },

  {
    type: "trigger.driveNewFile",
    category: "trigger",
    label: "New File in Drive Folder",
    icon: "FolderSearch",
    description: "Starts the flow when a new file lands in a Google Drive folder",
    configSchema: [
      { key: "connectionId", label: "Google account", type: "connection", platform: "google" },
      {
        key: "folderId",
        label: "Folder ID",
        type: "text",
        placeholder: "e.g. 1A2b3C4d5E6f... (from the folder's Drive URL)",
        helpText: "Open the folder in Drive and copy the id from the end of its URL.",
      },
    ],
  },

  // --- AI Content ----------------------------------------------------------
  {
    type: "ai.generateCaption",
    category: "ai",
    label: "Generate Caption",
    icon: "Sparkles",
    description: "Writes a caption from a prompt",
    configSchema: [
      { key: "prompt", label: "Prompt", type: "textarea", placeholder: "e.g. A caption for a sunset photo at the beach, upbeat and short" },
      {
        key: "tone",
        label: "Tone",
        type: "select",
        default: "casual",
        options: [
          { value: "casual", label: "Casual" },
          { value: "professional", label: "Professional" },
          { value: "playful", label: "Playful" },
        ],
      },
    ],
  },
  {
    type: "ai.generateImage",
    category: "ai",
    label: "Generate Image",
    icon: "ImageIcon",
    description: "Creates an image from a prompt",
    configSchema: [
      { key: "prompt", label: "Prompt", type: "textarea", placeholder: "e.g. Minimalist product shot on a white background" },
      {
        key: "style",
        label: "Style",
        type: "select",
        default: "photorealistic",
        options: [
          { value: "photorealistic", label: "Photorealistic" },
          { value: "illustration", label: "Illustration" },
          { value: "minimal", label: "Minimal" },
        ],
      },
    ],
  },
  {
    type: "ai.generateVideoScript",
    category: "ai",
    label: "Generate Video Script",
    icon: "Clapperboard",
    description: "Writes a short-form video script from a prompt",
    configSchema: [
      { key: "prompt", label: "Prompt", type: "textarea", placeholder: "e.g. 30-second Reel introducing our new product" },
      { key: "durationSeconds", label: "Target length (seconds)", type: "number", default: 30 },
    ],
  },

  // --- Platform Actions ----------------------------------------------------
  {
    type: "platform.instagramPost",
    category: "platform",
    label: "Instagram: Post",
    icon: "Instagram",
    description: "Publishes a post to Instagram",
    configSchema: [
      { key: "connectionId", label: "Account", type: "connection", platform: "instagram" },
      // Graph API has no text-only IG post — a public image URL is
      // required. Falls back to an upstream node's output if this is left
      // blank and that output already looks like an image URL.
      { key: "imageUrl", label: "Image URL", type: "text", placeholder: "https://... (required by Instagram)" },
      { key: "caption", label: "Caption (optional override)", type: "textarea", placeholder: "Leave blank to use the connected node's output" },
    ],
  },
  {
    type: "platform.instagramStory",
    category: "platform",
    label: "Instagram: Story",
    icon: "BookImage",
    description: "Publishes a story to Instagram",
    configSchema: [{ key: "connectionId", label: "Account", type: "connection", platform: "instagram" }],
  },
  {
    type: "platform.instagramReply",
    category: "platform",
    label: "Instagram: Reply to Comment",
    icon: "MessageSquareReply",
    description: "Replies to a comment on Instagram",
    configSchema: [{ key: "connectionId", label: "Account", type: "connection", platform: "instagram" }],
  },
  {
    type: "platform.instagramDm",
    category: "platform",
    label: "Instagram: Send DM",
    icon: "Send",
    description: "Sends a direct message on Instagram",
    configSchema: [{ key: "connectionId", label: "Account", type: "connection", platform: "instagram" }],
  },
  {
    type: "platform.facebookPost",
    category: "platform",
    label: "Facebook: Post",
    icon: "Facebook",
    description: "Publishes a post to Facebook",
    configSchema: [
      { key: "connectionId", label: "Account", type: "connection", platform: "facebook" },
      { key: "message", label: "Message (optional override)", type: "textarea", placeholder: "Leave blank to use the connected node's output" },
      { key: "link", label: "Link (optional)", type: "text", placeholder: "https://..." },
    ],
  },
  {
    type: "platform.facebookReply",
    category: "platform",
    label: "Facebook: Reply to Comment",
    icon: "MessageSquareReply",
    description: "Replies to a comment on Facebook",
    configSchema: [{ key: "connectionId", label: "Account", type: "connection", platform: "facebook" }],
  },
  {
    type: "platform.facebookMessage",
    category: "platform",
    label: "Facebook: Send Message",
    icon: "Send",
    description: "Sends a Messenger message",
    configSchema: [{ key: "connectionId", label: "Account", type: "connection", platform: "facebook" }],
  },
  {
    type: "platform.whatsappSend",
    category: "platform",
    label: "WhatsApp: Send Message",
    icon: "MessageCircle",
    description: "Sends a WhatsApp message",
    configSchema: [{ key: "connectionId", label: "Account", type: "connection", platform: "whatsapp" }],
  },
  {
    type: "platform.whatsappTemplate",
    category: "platform",
    label: "WhatsApp: Send Template",
    icon: "Send",
    description: "Sends a pre-approved WhatsApp template message",
    configSchema: [
      { key: "connectionId", label: "Account", type: "connection", platform: "whatsapp" },
      { key: "templateName", label: "Template name", type: "text", placeholder: "e.g. order_confirmation" },
    ],
  },
  {
    type: "platform.tiktokUpload",
    category: "platform",
    label: "TikTok: Upload Video",
    icon: "Video",
    description: "Uploads a video to TikTok",
    configSchema: [{ key: "connectionId", label: "Account", type: "connection", platform: "tiktok" }],
  },

  // --- Logic ---------------------------------------------------------------
  {
    type: "logic.condition",
    category: "logic",
    label: "Condition",
    icon: "GitBranch",
    description: "Branches the flow based on a check",
    configSchema: [
      { key: "field", label: "Check", type: "text", placeholder: "e.g. previous step's output" },
      {
        key: "operator",
        label: "Operator",
        type: "select",
        default: "contains",
        options: [
          { value: "contains", label: "Contains" },
          { value: "equals", label: "Equals" },
          { value: "notEmpty", label: "Is not empty" },
        ],
      },
      { key: "value", label: "Value", type: "text" },
    ],
  },
  {
    type: "logic.delay",
    category: "logic",
    label: "Delay",
    icon: "Timer",
    description: "Waits before continuing",
    configSchema: [
      { key: "durationMinutes", label: "Wait for (minutes)", type: "number", default: 5 },
    ],
  },
  {
    type: "logic.loop",
    category: "logic",
    label: "Loop",
    icon: "Repeat",
    description: "Repeats the next steps for multiple accounts",
    configSchema: [
      { key: "overField", label: "Repeat over", type: "text", placeholder: "e.g. connected accounts" },
    ],
  },

  // --- Google Workspace ------------------------------------------------
  // Invoice Parser Agent template chain: trigger.driveNewFile (above, in
  // Triggers) -> extractDocument -> extractStructuredData -> appendToSheet
  // -> sendEmail. See lib/flowNodes/registry.js for what each one does.
  {
    type: "action.extractDocument",
    category: "google",
    label: "Extract Document Text",
    icon: "FileText",
    description: "Reads the full text out of the file from the previous step, OCR'ing scans/PDFs automatically",
    configSchema: [],
  },
  {
    type: "ai.extractStructuredData",
    category: "google",
    label: "AI: Extract Structured Data",
    icon: "Brain",
    description: "Turns extracted text into a JSON array of rows using AI",
    configSchema: [
      {
        key: "extractionPrompt",
        label: "Extraction prompt",
        type: "textarea",
        placeholder: "Describe what to pull out and how to shape it as JSON",
        helpText: "Pre-filled with a generic prompt — edit it if you know the document type in advance (e.g. always invoices).",
      },
    ],
  },
  {
    type: "action.appendToSheet",
    category: "google",
    label: "Append to Google Sheet",
    icon: "Table",
    description: "Adds each extracted row as a new row in a Google Sheet",
    configSchema: [
      { key: "connectionId", label: "Google account", type: "connection", platform: "google" },
      { key: "spreadsheetId", label: "Spreadsheet ID", type: "text", placeholder: "From the sheet's URL: /d/<this part>/edit" },
      { key: "sheetName", label: "Sheet (tab) name", type: "text", placeholder: "e.g. Sheet1", default: "Sheet1" },
    ],
  },
  {
    type: "action.sendEmail",
    category: "google",
    label: "Send Summary Email",
    icon: "Mail",
    description: "Emails a summary of what was extracted, with links to the file and sheet",
    configSchema: [
      { key: "connectionId", label: "Gmail account", type: "connection", platform: "google" },
      {
        key: "toEmail",
        label: "Send to (optional)",
        type: "text",
        placeholder: "Leave blank to send to your own account email",
      },
    ],
  },
];

export function getNodeTypeDef(type) {
  return NODE_TYPES.find((n) => n.type === type) || null;
}

export function fieldIsVisible(field, config) {
  if (!field.showIf) return true;
  return config?.[field.showIf.key] === field.showIf.equals;
}

// One-line preview shown on the node card, so a glance at the canvas tells
// you what a node actually does without opening the inspector. Falls back
// to the type's static description when nothing's configured yet.
export function getNodeSummary(nodeType, config = {}) {
  const def = getNodeTypeDef(nodeType);
  if (!def) return "";
  if (config.prompt) return config.prompt;
  if (config.templateName) return `Template: ${config.templateName}`;
  if (nodeType === "trigger.schedule" && config.time) {
    return config.frequency === "weekly"
      ? `Every ${config.dayOfWeek || "week"} at ${config.time}`
      : `Daily at ${config.time}`;
  }
  if (nodeType === "logic.delay" && config.durationMinutes) {
    return `Waits ${config.durationMinutes} min`;
  }
  if (nodeType === "logic.condition" && config.field) {
    return `${config.field} ${config.operator || "contains"} ${config.value || ""}`.trim();
  }
  if (nodeType === "trigger.driveNewFile" && config.folderId) {
    return `Watches Drive folder ${config.folderId}`;
  }
  if (nodeType === "action.appendToSheet" && config.spreadsheetId) {
    return `Appends to ${config.sheetName || "Sheet1"} in ${config.spreadsheetId}`;
  }
  if (nodeType === "action.sendEmail") {
    return config.toEmail ? `Sends a summary to ${config.toEmail}` : "Sends a summary to your account email";
  }
  return def.description;
}