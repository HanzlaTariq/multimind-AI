import crypto from 'node:crypto';
import Flow from '@/models/Flow';
import { withFlowAuth, ownedFlow } from '@/lib/flowPro/server';
export const POST=withFlowAuth(async(req,{params},userId)=>{await ownedFlow(params.id,userId);const token=crypto.randomBytes(32).toString('hex');await Flow.updateOne({_id:params.id,user:userId},{$set:{webhookTokenHash:crypto.createHash('sha256').update(token).digest('hex')}});return Response.json({token,path:`/api/flow-hooks/${params.id}`,message:'Store this token now. It will not be shown again. Previous tokens are invalid.'});});
