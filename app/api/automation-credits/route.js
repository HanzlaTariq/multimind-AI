import { withFlowAuth } from '@/lib/flowPro/server';
import { publicBalance } from '@/lib/automationCredits/wallet';
import AutomationCreditReceipt from '@/models/AutomationCreditReceipt';
export const dynamic='force-dynamic';
export const GET=withFlowAuth(async(req,ctx,userId)=>{
 const wallet=await publicBalance(userId);
 const receipts=await AutomationCreditReceipt.find({user:userId}).sort({finishedAt:-1}).limit(50).lean();
 return Response.json({...wallet,receipts},{headers:{'Cache-Control':'no-store'}});
});
