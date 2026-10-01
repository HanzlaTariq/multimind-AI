import FlowVersion from '@/models/FlowVersion';
import { withFlowAuth, ownedFlow, assertId, httpError } from '@/lib/flowPro/server';
export const GET=withFlowAuth(async(req,{params},userId)=>{await ownedFlow(params.id,userId);assertId(params.versionId);const version=await FlowVersion.findOne({_id:params.versionId,flow:params.id,user:userId}).lean();if(!version)throw httpError('Version not found',404);return Response.json({version});});
