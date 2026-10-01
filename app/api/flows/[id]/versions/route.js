import FlowVersion from '@/models/FlowVersion';
import { withFlowAuth, ownedFlow, readJSON, saveVersion } from '@/lib/flowPro/server';
export const GET=withFlowAuth(async(req,{params},userId)=>{await ownedFlow(params.id,userId);const versions=await FlowVersion.find({flow:params.id,user:userId}).select('label revision createdAt').sort({createdAt:-1}).limit(25).lean();return Response.json({versions});});
export const POST=withFlowAuth(async(req,{params},userId)=>{const flow=await ownedFlow(params.id,userId),body=await readJSON(req);const version=await saveVersion(flow,userId,body.label||'Manual checkpoint');return Response.json({version});});
