import { requireAdmin,logAdminAction } from '@/lib/admin';
import { assertSameOrigin,readJSON } from '@/lib/flowPro/server';
import { automationPricing,AUTOMATION_SEED } from '@/lib/automationCredits/config';
import { checkedCost } from '@/lib/automationCredits/pricing.mjs';
import { invalidateToolCostsCache } from '@/lib/plans';
import ToolCreditConfig from '@/models/ToolCreditConfig';
import AutomationCreditPolicy from '@/models/AutomationCreditPolicy';
import AutomationCreditReceipt from '@/models/AutomationCreditReceipt';
import Notification from '@/models/Notification';
export const dynamic='force-dynamic';
export async function GET(){
 const admin=await requireAdmin();if(admin instanceof Response)return admin;
 const pricing=await automationPricing();
 const receipts=await AutomationCreditReceipt.find({}).sort({finishedAt:-1}).limit(50).populate('user','name email').lean();
 const totals=await AutomationCreditReceipt.aggregate([{$match:{finishedAt:{$gte:new Date(Date.now()-7*24*60*60*1000)}}},{$group:{_id:null,runs:{$sum:1},charged:{$sum:'$charged'},refunded:{$sum:'$refunded'},uncertain:{$sum:{$cond:['$uncertain',1,0]}}}}]);
 return Response.json({...pricing,receipts,totals:totals[0]||{runs:0,charged:0,refunded:0,uncertain:0}},{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(req){
 const admin=await requireAdmin();if(admin instanceof Response)return admin;
 try{
  assertSameOrigin(req);const body=await readJSON(req);await automationPricing();
  if(body.action==='policy'){
   if(typeof body.enabled!=='boolean'||typeof body.chargeTests!=='boolean'||!Number.isSafeInteger(body.maxRunCredits)||body.maxRunCredits<0||body.maxRunCredits>2000000)throw new Error('Supply valid switches and a whole-number run limit from 0 to 2,000,000.');
   const fields={enabled:body.enabled,chargeTests:body.chargeTests,maxRunCredits:body.maxRunCredits};
   await AutomationCreditPolicy.updateOne({_id:'automation'},{$set:fields,$inc:{revision:1}});
   await logAdminAction({session:admin,action:'automation.pricing.policy',targetType:'automation-pricing',targetId:'automation',details:fields});
  }else if(body.action==='set-all'){
   const cost=checkedCost(body.cost);if(body.confirm!==true)throw new Error('Confirm that every automation node price should be replaced.');
   await ToolCreditConfig.updateMany({toolId:{$in:AUTOMATION_SEED.map(s=>s.toolId)}},{$set:{cost,scheduledCost:null,scheduledMinCost:null,effectiveAt:null}});
   invalidateToolCostsCache();
   await Notification.create({title:'Automation credit prices updated',message:`The administrator set all workflow and ready-tool processing nodes to ${cost} credits each. Review your quote before running.`}).catch(()=>{});
   await logAdminAction({session:admin,action:'automation.pricing.bulk',targetType:'automation-pricing',targetId:'automation',details:{cost,nodes:AUTOMATION_SEED.length}});
  }else throw new Error('Unsupported pricing action');
  return Response.json({ok:true,pricing:await automationPricing()});
 }catch(e){return Response.json({error:e.message},{status:e.status||400});}
}
