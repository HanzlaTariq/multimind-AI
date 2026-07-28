import dbConnect from "@/lib/mongodb";
import PlanConfig from "@/models/PlanConfig";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { invalidatePlansCache } from "@/lib/plans";

// PATCH — edit a plan's credits, pricing, discount, active state, label, badge.
export async function PATCH(req, { params }) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;
  const session = check;

  await dbConnect();

  const body = await req.json();
  const update = {};

  if (typeof body.label === "string" && body.label.trim()) update.label = body.label.trim();

  if (typeof body.monthlyCredits === "number") {
    if (body.monthlyCredits < 0) {
      return Response.json({ error: "Monthly credits can't be negative" }, { status: 400 });
    }
    update.monthlyCredits = Math.floor(body.monthlyCredits);
  }

  if (typeof body.priceUSD === "number") update.priceUSD = Math.max(0, body.priceUSD);
  if (typeof body.pricePKR === "number") update.pricePKR = Math.max(0, body.pricePKR);
  if (typeof body.priceINR === "number") update.priceINR = Math.max(0, body.priceINR);

  if (typeof body.discountPercent === "number") {
    update.discountPercent = Math.min(100, Math.max(0, body.discountPercent));
  }

  if (typeof body.active === "boolean") update.active = body.active;
  if (typeof body.badge === "string") update.badge = body.badge;
  if (typeof body.sortOrder === "number") update.sortOrder = body.sortOrder;

  // priceEnvKey (Stripe price env var name) only matters for the built-in,
  // Stripe-billed tiers — allow admins to fix a typo'd env key name here too.
  if (typeof body.priceEnvKey === "string") update.priceEnvKey = body.priceEnvKey;

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const plan = await PlanConfig.findByIdAndUpdate(params.id, update, {
    new: true,
    runValidators: true,
  }).lean();

  if (!plan) {
    return Response.json({ error: "Plan not found" }, { status: 404 });
  }

  invalidatePlansCache();

  await logAdminAction({
    session,
    action: "plan.update",
    targetType: "plan",
    targetId: plan._id,
    targetLabel: plan.label,
    details: update,
  });

  return Response.json({ plan });
}

// DELETE — remove a custom deal. Core plans (free/basic/pro/business) can't
// be deleted, only deactivated via PATCH { active: false }.
export async function DELETE(req, { params }) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;
  const session = check;

  await dbConnect();

  const plan = await PlanConfig.findById(params.id).lean();
  if (!plan) {
    return Response.json({ error: "Plan not found" }, { status: 404 });
  }
  if (plan.isCore) {
    return Response.json(
      { error: "Built-in plans can't be deleted — deactivate it instead" },
      { status: 400 }
    );
  }

  await PlanConfig.findByIdAndDelete(params.id);
  invalidatePlansCache();

  await logAdminAction({
    session,
    action: "plan.delete",
    targetType: "plan",
    targetId: params.id,
    targetLabel: plan.label,
  });

  return Response.json({ success: true });
}