import { withFlowAuth,ownedFlow,readJSON,checkedGraph } from '@/lib/flowPro/server';
import { flowQuote } from '@/lib/automationCredits/pricing.mjs';
import { automationPricing } from '@/lib/automationCredits/config';
import { publicBalance } from '@/lib/automationCredits/wallet';
export const POST=withFlowAuth(async(req,{params},userId)=>{
 const flow=await ownedFlow(params.id,userId),body=await readJSON(req),mode=body.mode==='live'?'live':'test';
 const graph=checkedGraph(flow,{forRun:true,mode}),[pricing,wallet]=await Promise.all([automationPricing(),publicBalance(userId)]);
 return Response.json({quote:{...flowQuote(graph,pricing.costs,pricing.policy,{mode,untilNodeId:body.untilNodeId}),...wallet}},{headers:{'Cache-Control':'no-store'}});
});
