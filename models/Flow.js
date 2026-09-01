import mongoose from "mongoose";

// A single node on the canvas. `type` identifies which built-in node
// (e.g. "trigger.schedule", "ai.generateCaption", "instagram.post") — the
// execution engine and the node palette both key off this string, so it
// doubles as the plugin id. `data` is deliberately schemaless (Mixed):
// each node type owns its own config shape (prompt text, cron expression,
// platform account id, etc.) and we don't want to touch this schema every
// time a new node type is added.
const FlowNodeSchema = new mongoose.Schema(
  {
    nodeId: { type: String, required: true }, // React Flow's client-side node id
    type: { type: String, required: true },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

// A wire between two nodes. Mirrors React Flow's Edge shape closely so the
// canvas can save/load without translation.
const FlowEdgeSchema = new mongoose.Schema(
  {
    edgeId: { type: String, required: true },
    source: { type: String, required: true }, // nodeId
    target: { type: String, required: true }, // nodeId
    sourceHandle: { type: String, default: null },
    targetHandle: { type: String, default: null },
  },
  { _id: false },
);

const FlowSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    nodes: [FlowNodeSchema],
    edges: [FlowEdgeSchema],
    status: {
      type: String,
      enum: ["draft", "active", "paused"],
      default: "draft",
    },
    // Set by the schedule-trigger node's config when present, so the cron
    // sweep (Phase 5) can query "which active flows are due" without
    // parsing every node's data blob on every tick.
    nextRunAt: { type: Date, default: null },

    // Bookkeeping for the trigger.driveNewFile node (Invoice Parser Agent
    // template and any other Drive-triggered flow). Vercel is serverless,
    // so there's no long-lived process to hold a Drive `watch()` channel
    // open — instead a cron route polls `files.list` on the configured
    // folder every few minutes (see app/api/cron/drive-poll/route.js).
    // processedFileIds remembers which Drive file ids already kicked off
    // a run for THIS flow, so re-polling the same folder never processes
    // a file twice. Capped at the last 500 ids (see the cron route) since
    // this only needs to answer "have we seen this id before", not be a
    // full audit log — FlowRun already keeps the real history.
    driveSync: {
      processedFileIds: { type: [String], default: undefined },
      lastPolledAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

// The Flows list page queries/sorts by (user, updatedAt).
FlowSchema.index({ user: 1, updatedAt: -1 });
// The scheduler sweep queries active flows whose nextRunAt has passed.
FlowSchema.index({ status: 1, nextRunAt: 1 });

export default mongoose.models.Flow || mongoose.model("Flow", FlowSchema);
