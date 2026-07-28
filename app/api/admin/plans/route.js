import dbConnect from "@/lib/mongodb";
import PlanConfig from "@/models/PlanConfig";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { invalidatePlansCache } from "@/lib/plans";

// GET — list every plan (active + inactive) for the admin panel table.
export async function GET() {
  const check = await requireAdmin();
  if (check instanceof Response) return check;

  await dbConnect();

  // Make sure the built-in tiers exist before we list them (same seed logic
  // lib/plans.js uses), so a brand-new install still shows free/basic/pro/business.
  const count = await PlanConfig.countDocuments();
  if (count === 0) {
    await PlanConfig.insertMany(
      [
        { key: "free", label: "Free", monthlyCredits: 60, priceUSD: 0, pricePKR: 0, priceINR: 0, isCore: true, sortOrder: 0 },
        { key: "basic", label: "Basic", monthlyCredits: 1500, priceEnvKey: "STRIPE_BASIC_PRICE_ID", priceUSD: 9.99, pricePKR: 2799, priceINR: 799, isCore: true, sortOrder: 1 },
        { key: "pro", label: "Pro", monthlyCredits: 8000, priceEnvKey: "STRIPE_PRO_PRICE_ID", priceUSD: 24.99, pricePKR: 6999, priceINR: 1999, isCore: true, sortOrder: 2 },
        { key: "business", label: "Business", monthlyCredits: 30000, priceEnvKey: "STRIPE_BUSINESS_PRICE_ID", priceUSD: 59.99, pricePKR: 16999, priceINR: 4999, isCore: true, sortOrder: 3 },
      ],
      { ordered: false }
    ).catch(() => {});
  }

  const plans = await PlanConfig.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean();
  return Response.json({ plans });
}

// POST — create a new plan/deal (e.g. "Summer Sale — 60% off Pro").
export async function POST(req) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;
  const session = check;

  await dbConnect();

  const body = await req.json();
  const key = (body.key || "").toLowerCase().trim();

  if (!key || !/^[a-z0-9-]+$/.test(key)) {
    return Response.json(
      { error: "Plan key is required and can only contain lowercase letters, numbers, and hyphens" },
      { status: 400 }
    );
  }
  if (!body.label || typeof body.label !== "string") {
    return Response.json({ error: "Label is required" }, { status: 400 });
  }
  if (typeof body.monthlyCredits !== "number" || body.monthlyCredits < 0) {
    return Response.json({ error: "Monthly credits must be a non-negative number" }, { status: 400 });
  }

  const existing = await PlanConfig.findOne({ key });
  if (existing) {
    return Response.json({ error: "A plan with this key already exists" }, { status: 409 });
  }

  const plan = await PlanConfig.create({
    key,
    label: body.label,
    monthlyCredits: Math.floor(body.monthlyCredits),
    priceUSD: Number(body.priceUSD) || 0,
    pricePKR: Number(body.pricePKR) || 0,
    priceINR: Number(body.priceINR) || 0,
    discountPercent: Math.min(100, Math.max(0, Number(body.discountPercent) || 0)),
    priceEnvKey: body.priceEnvKey || "",
    active: body.active !== false,
    isCore: false, // only the 4 built-ins are core; anything created here is a custom deal
    badge: body.badge || "",
    sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 99,
  });

  invalidatePlansCache();

  await logAdminAction({
    session,
    action: "plan.create",
    targetType: "plan",
    targetId: plan._id,
    targetLabel: plan.label,
    details: { key: plan.key, monthlyCredits: plan.monthlyCredits, discountPercent: plan.discountPercent },
  });

  return Response.json({ plan });
}