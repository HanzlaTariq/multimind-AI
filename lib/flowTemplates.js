// Phase 8 — pre-built flow templates ("1-click duplicate" from the plan).
// Each template is a static node/edge graph in *relative* form (no ids,
// just an index for each node) — buildFlowFromTemplate() below stamps out
// real nodeId/edgeId values so two flows created from the same template
// never collide. Keep this the only place that knows the template
// content; the API route and the UI just read from it.
//
// Adding a new template = add one entry here. Nothing else needs to
// change.

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
