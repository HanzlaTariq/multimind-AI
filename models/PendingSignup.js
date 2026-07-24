import mongoose from "mongoose";

const PendingSignupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export default mongoose.models.PendingSignup ||
  mongoose.model("PendingSignup", PendingSignupSchema);
