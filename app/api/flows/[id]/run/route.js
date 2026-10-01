import { withFlowAuth, ownedFlow, readJSON } from '@/lib/flowPro/server';
import { runFlow } from '@/lib/flowNodes/runFlow';
export const maxDuration=120;
export const POST=withFlowAuth(async(req,{params},userId)=>{const flow=await ownedFlow(params.id,userId),body=await readJSON(req);const mode=body.mode==='live'?'live':'test';const run=await runFlow(flow,{userId,mode,triggerType:'manual',input:body.input,untilNodeId:body.untilNodeId});return Response.json({run});});
