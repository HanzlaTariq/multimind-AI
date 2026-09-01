import mongoose from "mongoose";

// One step's outcome within a run — the execution engine appends one of
// these per node it visits, in traversal order, so the Executions UI can
// render a timeline even for the currently-in-progress run.
const FlowRunLogSchema = new mongoose.Schema(
  {
    nodeId: { type: String, required: true },
    nodeType: { type: String, required: true },
    status: {
      type: String,
      enum: ["success", "failed", "skipped"],
      required: true,
    },
    // Deliberately unstructured: a node's output/error shape depends on
    // its type (an AI node's output is generated text; a post node's
    // output is a platform post id; a failed node's is an error message).
    output: { type: mongoose.Schema.Types.Mixed, default: null },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
  },
  { _id: false },
);

const FlowRunSchema = new mongoose.Schema(
  {
    flow: { type: mongoose.Schema.Types.ObjectId, ref: "Flow", required: true },
    // Denormalized from Flow so run history survives/still scopes correctly
    // even if the flow itself is deleted later, and so list queries don't
    // need to join back to Flow just to enforce ownership.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["running", "success", "failed"],
      default: "running",
    },
    triggerType: {
      type: String,
      enum: ["manual", "scheduled", "webhook"],
      required: true,
    },
    logs: [FlowRunLogSchema],
    error: { type: String, default: null }, // top-level failure reason, if any
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The per-flow "Executions" tab queries/sorts by (flow, startedAt desc).
FlowRunSchema.index({ flow: 1, startedAt: -1 });
// Ownership-scoped queries (and cleanup of a deleted user's runs).
FlowRunSchema.index({ user: 1, startedAt: -1 });

export default mongoose.models.FlowRun || mongoose.model("FlowRun", FlowRunSchema);
