import FlowCredential from '@/models/FlowCredential';
import { withFlowAuth, assertId, httpError } from '@/lib/flowPro/server';
export const DELETE=withFlowAuth(async(req,{params},userId)=>{assertId(params.id);const result=await FlowCredential.deleteOne({_id:params.id,user:userId});if(!result.deletedCount)throw httpError('Credential not found',404);return Response.json({deleted:true});});
