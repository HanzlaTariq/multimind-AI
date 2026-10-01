import Flow from '@/models/Flow';
import FlowRun from '@/models/FlowRun';
import Connection from '@/models/Connection';
import { NODE_TYPES } from '@/components/flows/nodeTypesConfig';
import { executeWorkflow } from '@/lib/flowPro/engine.mjs';
import { normalizeGraph, validateGraph } from '@/lib/flowPro/graph.mjs';
import { executeExternal } from '@/lib/flowPro/external';
import { automationPricing } from '@/lib/automationCredits/config';
import { flowQuote } from '@/lib/automationCredits/pricing.mjs';
import { beginMeter } from '@/lib/automationCredits/wallet';
/** All entry points (manual, cron, Drive and webhook) use the same owner wallet. */
export async function runFlow(flow,{userId,triggerType='manual',seedOutputs=new Map(),mode='live',input,untilNodeId,maxCredits}={}){
 const graph=normalizeGraph(flow),errors=validateGraph(graph,NODE_TYPES,{forRun:true,mode}).filter(i=>i.severity==='error');
 if(errors.length)throw Object.assign(new Error(errors[0].message),{status:400});
 const seed=seedOutputs instanceof Map?Object.fromEntries(seedOutputs):seedOutputs;
 const pricing=await automationPricing();
 const quote=flowQuote(graph,pricing.costs,pricing.policy,{mode,untilNodeId,seedIds:Object.keys(seed||{})});
 const now=new Date(),lockUntil=new Date(Date.now()+120000);
 const locked=await Flow.findOneAndUpdate({_id:flow._id,user:userId,$or:[{executionLockUntil:null},{executionLockUntil:{$lt:now}}]},{$set:{executionLockUntil:lockUntil}},{new:true});
 if(!locked)throw Object.assign(new Error('A run is already active for this workflow.'),{status:409});
 let run,meter,receipt;
 try {
  run=await FlowRun.create({flow:flow._id,user:userId,mode,status:'running',triggerType,graphRevision:flow.revision||1,logs:[]});
  meter=await beginMeter(userId,quote,{key:`flow_${run._id}`,scope:'flow',reference:String(run._id),label:flow.name,maxCredits});
  await FlowRun.updateOne({_id:run._id},{$set:{billing:{reserved:quote.total,charged:0,status:'reserved'}}});
  const ids=[...new Set(graph.nodes.map(n=>n.data.config?.connectionId).filter(Boolean))];
  const connections=ids.length?Object.fromEntries((await Connection.find({_id:{$in:ids},user:userId}).select('platform accountName').lean()).map(c=>[String(c._id),{platform:c.platform,accountName:c.accountName}])):{};
  let lastCancelCheck=0,cancelled=false;
  const result=await executeWorkflow(graph,{mode,input:input??flow.testInput??{},variables:flow.variables||{},definitions:NODE_TYPES,triggerType,seedOutputs:seed,untilNodeId,runId:String(run._id),timeoutMs:flow.settings?.timeoutMs||90000,concurrency:flow.settings?.concurrency||3,
   beforeNode:node=>meter.start(node.nodeId),
   externalExecutor:(type,config,context)=>executeExternal(type,config,{...context,userId,connections}),
   onLog:async log=>{
    const billed=quote.lines.some(l=>l.nodeId===log.nodeId)&&log.status!=='skipped'&&!log.billingBlocked;
    const credits=billed?await meter.finish(log.nodeId,log.billingUncertain?'uncertain':log.status==='failed'?'failed':'success'):0;
    await FlowRun.updateOne({_id:run._id},{$push:{logs:{...log,credits}}});
   },
   shouldCancel:async()=>{if(Date.now()-lastCancelCheck>500){lastCancelCheck=Date.now();const current=await FlowRun.findById(run._id).select('cancelRequested').lean();cancelled=!!current?.cancelRequested;}return cancelled;}
  });
  receipt=await meter.close(result.status);
  await FlowRun.updateOne({_id:run._id},{$set:{status:result.status,error:result.error,summary:result.summary,durationMs:result.durationMs,finishedAt:new Date(),billing:receipt}});
  return await FlowRun.findById(run._id).lean();
 }catch(error){
  if(meter&&!receipt){try{receipt=await meter.close('interrupted');}catch(e){console.error('[Flow billing] Settlement pending',e.message);}}
  if(run)await FlowRun.updateOne({_id:run._id},{$set:{status:'failed',error:error.message,finishedAt:new Date(),...(receipt?{billing:receipt}:{})}}).catch(()=>{});
  throw error;
 }finally{await Flow.updateOne({_id:flow._id,executionLockUntil:lockUntil},{$set:{executionLockUntil:null}});}
}
