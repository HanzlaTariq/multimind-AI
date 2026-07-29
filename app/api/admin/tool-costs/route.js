import dbConnect from "@/lib/mongodb";
import ToolCreditConfig from "@/models/ToolCreditConfig";
import { requireAdmin } from "@/lib/admin";
import { TOOL_COST_SEED } from "@/lib/plans";

// GET — list every tool's current (and any scheduled) credit cost, for the
// admin panel table. Powers Admin → Tool Costs.
export async function GET() {
  const check = await requireAdmin();
  if (check instanceof Response) return check;

  await dbConnect();

  // Make sure every built-in tool exists before we list them (same seed
  // logic lib/plans.js uses), so a brand-new install still shows all tools.
  const count = await ToolCreditConfig.countDocuments();
  if (count === 0) {
    await ToolCreditConfig.insertMany(TOOL_COST_SEED, { ordered: false }).catch(() => {});
  }

  const tools = await ToolCreditConfig.find({}).sort({ toolId: 1 }).lean();
  return Response.json({ tools });
}