import dbConnect from "@/lib/mongodb";
import ToolCreditConfig from "@/models/ToolCreditConfig";
import Notification from "@/models/Notification";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { invalidateToolCostsCache } from "@/lib/plans";

// PATCH — edit a tool's credit cost.
// Body: { cost, minCost?, effectiveAt? }
//   - No effectiveAt (or a past/current date): applies right away.
//   - A future effectiveAt: saved as a *scheduled* change — the current
//     cost stays in effect until that date, at which point lib/plans.js
//     (getToolCreditConfigs) promotes it automatically.
// Either way, a Notification is created so users see it on the bell icon —
// immediately for an instant change, or as a heads-up for a scheduled one.
export async function PATCH(req, { params }) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;
  const session = check;

  await dbConnect();

  const body = await req.json();

  if (typeof body.cost !== "number" || body.cost < 0) {
    return Response.json({ error: "Cost must be a non-negative number" }, { status: 400 });
  }

  const tool = await ToolCreditConfig.findOne({ toolId: params.toolId });
  if (!tool) {
    return Response.json({ error: "Tool not found" }, { status: 404 });
  }

  const minCost = typeof body.minCost === "number" ? Math.max(0, body.minCost) : tool.minCost;
  const effectiveAt = body.effectiveAt ? new Date(body.effectiveAt) : null;
  const now = new Date();
  const isScheduled = effectiveAt && effectiveAt > now;

  let notificationMessage;

  if (isScheduled) {
    tool.scheduledCost = body.cost;
    tool.scheduledMinCost = minCost;
    tool.effectiveAt = effectiveAt;
    const dateLabel = effectiveAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    notificationMessage = `Heads up — ${tool.label} will cost ${body.cost} credit${
      body.cost === 1 ? "" : "s"
    } per use starting ${dateLabel}.`;
  } else {
    tool.cost = body.cost;
    tool.minCost = minCost;
    tool.scheduledCost = null;
    tool.scheduledMinCost = null;
    tool.effectiveAt = null;
    notificationMessage = `${tool.label} now costs ${body.cost} credit${
      body.cost === 1 ? "" : "s"
    } per use.`;
  }

  await tool.save();
  invalidateToolCostsCache();

  await Notification.create({
    title: "Credit cost updated",
    message: notificationMessage,
  }).catch(() => {});

  await logAdminAction({
    session,
    action: "tool-cost.update",
    targetType: "tool-cost",
    targetId: tool._id,
    targetLabel: tool.label,
    details: {
      cost: body.cost,
      minCost,
      effectiveAt: effectiveAt ? effectiveAt.toISOString() : null,
      scheduled: Boolean(isScheduled),
    },
  });

  return Response.json({ tool });
}