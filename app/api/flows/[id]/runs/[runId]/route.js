import FlowRun from '@/models/FlowRun';
import { withFlowAuth, ownedFlow, assertId, httpError } from '@/lib/flowPro/server';
export const GET=withFlowAuth(async(req,{params},userId)=>{await ownedFlow(params.id,userId);assertId(params.runId);const run=await FlowRun.findOne({_id:params.runId,flow:params.id,user:userId}).lean();if(!run)throw httpError('Run not found',404);return Response.json({run});});
