import dbConnect from '@/lib/mongodb';
import ToolCreditConfig from '@/models/ToolCreditConfig';
import { requireAdmin } from '@/lib/admin';
import { TOOL_COST_SEED } from '@/lib/plans';
import { ensureAutomationPrices } from '@/lib/automationCredits/config';
export const dynamic='force-dynamic';
export async function GET(){
 const check=await requireAdmin();if(check instanceof Response)return check;
 await dbConnect();
 await ToolCreditConfig.bulkWrite(TOOL_COST_SEED.map(row=>({updateOne:{filter:{toolId:row.toolId},update:{$setOnInsert:row},upsert:true}})),{ordered:false});
 await ensureAutomationPrices();
 const tools=await ToolCreditConfig.find({}).sort({toolId:1}).lean();
 return Response.json({tools},{headers:{'Cache-Control':'no-store'}});
}
