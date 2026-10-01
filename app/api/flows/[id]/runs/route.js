import FlowRun from '@/models/FlowRun';
import { withFlowAuth, ownedFlow } from '@/lib/flowPro/server';
export const GET=withFlowAuth(async(req,{params},userId)=>{await ownedFlow(params.id,userId);const url=new URL(req.url),limit=Math.max(1,Math.min(100,parseInt(url.searchParams.get('limit')||'50',10)||50));const runs=await FlowRun.find({flow:params.id,user:userId}).select('status mode triggerType startedAt finishedAt error durationMs summary graphRevision').sort({startedAt:-1}).limit(limit).lean();return Response.json({runs});});
