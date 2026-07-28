import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gateway: { type: String, enum: ["jazzcash", "razorpay"], required: true },
    plan: { type: String, required: true },
    amount: { type: Number, required: true }, // in the gateway's smallest currency unit context (PKR / INR, whole units)
    currency: { type: String, required: true }, // "PKR" or "INR"
    txnRef: { type: String, required: true, unique: true },
    gatewayOrderId: { type: String, default: "" }, // razorpay order_id, if applicable
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);