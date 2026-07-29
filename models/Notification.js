import mongoose from "mongoose";

// Global, app-wide notifications (not per-user) — e.g. "Compress PDF now
// costs 2 credits per use". Every signed-in user sees every notification;
// what's tracked per-user is just the read/seen marker
// (User.notificationsSeenAt), not per-user notification rows.
const NotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);