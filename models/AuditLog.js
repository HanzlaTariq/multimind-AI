import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    adminEmail: { type: String, required: true }, // denormalized so log stays readable if the admin is later deleted
    action: { type: String, required: true }, // e.g. "user.update", "user.ban", "user.credit_grant", "conversation.delete"
    targetType: { type: String, enum: ["user", "conversation"], required: true },
    targetId: { type: String, required: true },
    targetLabel: { type: String, default: "" }, // denormalized email/title for quick display
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);