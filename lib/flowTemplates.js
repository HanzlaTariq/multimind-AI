// Phase 8 — pre-built flow templates ("1-click duplicate" from the plan).
// Each template is a static node/edge graph in *relative* form (no ids,
// just an index for each node) — buildFlowFromTemplate() below stamps out
// real nodeId/edgeId values so two flows created from the same template
// never collide. Keep this the only place that knows the template
// content; the API route and the UI just read from it.
//
// Adding a new template = add one entry here. Nothing else needs to
// change.

import { DEFAULT_EXTRACTION_PROMPT } from "./flowNodes/constants";

export const FLOW_TEMPLATES = [
  {
    id: "daily-auto-post",
    name: "Daily Auto-Post",
    description:
      "Every day at a set time, writes a fresh caption and publishes it to Instagram.",
    icon: "Clock",
    accent: "amber",
    flowName: "Daily Auto-Post",
    flowDescription: "Generates a caption on a schedule and posts it to Instagram.",
    nodes: [
      {
        type: "trigger.schedule",
        position: { x: 60, y: 160 },
        data: { frequency: "daily", time: "09:00" },
      },
      {
        type: "ai.generateCaption",
        position: { x: 380, y: 160 },
        data: {
          prompt: "Today's update for our audience — friendly and upbeat",
          tone: "casual",
        },
      },
      {
        type: "platform.instagramPost",
        position: { x: 700, y: 160 },
        data: {},
      },
    ],
    // [fromNodeIndex, toNodeIndex]
    edges: [
      [0, 1],
      [1, 2],
    ],
  },
  {
    id: "auto-reply-dm",
    name: "Auto-Reply DM",
    description:
      "Watches for new Instagram DMs and drafts an AI reply, ready to send.",
    icon: "MessageCircle",
    accent: "sky",
    flowName: "Auto-Reply DM",
    flowDescription: "Triggers on a new DM, generates a reply with AI, then sends it.",
    nodes: [
      {
        type: "trigger.newMessage",
        position: { x: 60, y: 160 },
        data: { platform: "instagram", eventType: "dm" },
      },
      {
        type: "ai.generateCaption",
        position: { x: 380, y: 160 },
        data: {
          prompt: "A short, friendly reply to a customer DM thanking them and answering their question",
          tone: "casual",
        },
      },
      {
        type: "platform.instagramDm",
        position: { x: 700, y: 160 },
        data: {},
      },
    ],
    edges: [
      [0, 1],
      [1, 2],
    ],
  },
  {
    id: "invoice-parser-agent",
    name: "Invoice Parser Agent",
    description:
      "Watches a Drive folder, extracts data from anything dropped in it, and logs it to a spreadsheet with an email summary.",
    icon: "FolderSearch",
    accent: "emerald",
    flowName: "Invoice Parser Agent",
    flowDescription:
      "When a new file lands in a connected Drive folder, extracts its data with AI, appends it to a Google Sheet, and emails a summary.",
    // Note on shape: unlike the two templates above, this one nests each
    // node's settings under `data: { config: {...} }` rather than flat
    // `data: {...}`. That's the shape the canvas/inspector and the
    // execution engine (node.data?.config in lib/flowNodes/registry.js)
    // actually read from — nodes need it to run with real values (a
    // folder id, a spreadsheet id) as soon as the user fills them in,
    // not just after they've opened and re-saved every node once.
    nodes: [
      {
        type: "trigger.driveNewFile",
        position: { x: 40, y: 200 },
        data: { config: { connectionId: "", folderId: "" } },
      },
      {
        type: "action.extractDocument",
        position: { x: 340, y: 200 },
        data: { config: {} },
      },
      {
        type: "ai.extractStructuredData",
        position: { x: 640, y: 200 },
        data: { config: { extractionPrompt: DEFAULT_EXTRACTION_PROMPT } },
      },
      {
        type: "action.appendToSheet",
        position: { x: 940, y: 200 },
        data: { config: { connectionId: "", spreadsheetId: "", sheetName: "Sheet1" } },
      },
      {
        type: "action.sendEmail",
        position: { x: 1240, y: 200 },
        data: { config: { connectionId: "", toEmail: "" } },
      },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
];

export function getFlowTemplate(id) {
  return FLOW_TEMPLATES.find((t) => t.id === id) || null;
}

function newTemplateId(prefix, i) {
  return `${prefix}_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`;
}

// Stamps out a real {nodes, edges} graph (backend shape — see models/Flow.js)
// from a template definition. Called server-side on flow creation so every
// flow gets its own unique node/edge ids even when built from the same
// template twice.
export function buildFlowFromTemplate(template) {
  const nodes = template.nodes.map((n, i) => ({
    nodeId: newTemplateId("node", i),
    type: n.type,
    position: n.position,
    data: n.data || {},
  }));

  const edges = template.edges.map(([fromIdx, toIdx], i) => ({
    edgeId: newTemplateId("edge", i),
    source: nodes[fromIdx].nodeId,
    target: nodes[toIdx].nodeId,
    sourceHandle: null,
    targetHandle: null,
  }));

  return { nodes, edges };
}
