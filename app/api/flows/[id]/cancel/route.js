import FlowRun from '@/models/FlowRun';
import { withFlowAuth, ownedFlow } from '@/lib/flowPro/server';
export const POST=withFlowAuth(async(req,{params},userId)=>{await ownedFlow(params.id,userId);await FlowRun.updateMany({flow:params.id,user:userId,status:'running'},{$set:{cancelRequested:true}});return Response.json({message:'Cancellation requested. In-flight actions may finish before the runner stops.'});});
