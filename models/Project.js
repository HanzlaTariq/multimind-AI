import mongoose from "mongoose";

const ProjectFileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    content: { type: String, default: "" },
    size: { type: Number, default: 0 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ProjectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    instructions: { type: String, default: "" },
    files: [ProjectFileSchema],
  },
  { timestamps: true }
);

// The Projects page always queries/sorts by (user, updatedAt) — without
// this index that query scans the whole projects collection.
ProjectSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.models.Project || mongoose.model("Project", ProjectSchema);