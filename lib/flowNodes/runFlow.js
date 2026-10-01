import Flow from '@/models/Flow';
import FlowRun from '@/models/FlowRun';
import Connection from '@/models/Connection';
import { NODE_TYPES } from '@/components/flows/nodeTypesConfig';
import { executeWorkflow } from '@/lib/flowPro/engine.mjs';
import { normalizeGraph, validateGraph } from '@/lib/flowPro/graph.mjs';
import { executeExternal } from '@/lib/flowPro/external';
/** Synchronous bounded execution. External schedulers must call this in an awaited request. */
export async function runFlow(flow,{userId,triggerType='manual',seedOutputs=new Map(),mode='live',input,untilNodeId}={}){
 const graph=normalizeGraph(flow);const issues=validateGraph(graph,NODE_TYPES,{forRun:true,mode});const errors=issues.filter(i=>i.severity==='error');if(errors.length){const error=new Error(errors[0].message);error.status=400;throw error;}
 const now=new Date(),lockUntil=new Date(Date.now()+120000);
 const locked=await Flow.findOneAndUpdate({_id:flow._id,user:userId,$or:[{executionLockUntil:null},{executionLockUntil:{$lt:now}}]},{$set:{executionLockUntil:lockUntil}},{new:true});
 if(!locked){const error=new Error('A run is already active for this workflow. Try again after it finishes.');error.status=409;throw error;}
 let run;
 try {
  run=await FlowRun.create({flow:flow._id,user:userId,mode,status:'running',triggerType,graphRevision:flow.revision||1,logs:[]});
  const ids=[...new Set(graph.nodes.map(n=>n.data.config?.connectionId).filter(Boolean))];
  const connections=ids.length?Object.fromEntries((await Connection.find({_id:{$in:ids},user:userId}).select('platform accountName').lean()).map(c=>[String(c._id),{platform:c.platform,accountName:c.accountName}])):{};
  let lastCancelCheck=0,cancelled=false;
  const result=await executeWorkflow(graph,{mode,input:input??flow.testInput??{},variables:flow.variables||{},definitions:NODE_TYPES,triggerType,seedOutputs:seedOutputs instanceof Map?Object.fromEntries(seedOutputs):seedOutputs,untilNodeId,runId:String(run._id),timeoutMs:flow.settings?.timeoutMs||90000,concurrency:flow.settings?.concurrency||3,
   externalExecutor:(type,config,context)=>executeExternal(type,config,{...context,userId,connections}),
   onLog:async log=>{await FlowRun.updateOne({_id:run._id},{$push:{logs:log}});},
   shouldCancel:async()=>{if(Date.now()-lastCancelCheck>500){lastCancelCheck=Date.now();const current=await FlowRun.findById(run._id).select('cancelRequested').lean();cancelled=!!current?.cancelRequested;}return cancelled;}
  });
  await FlowRun.updateOne({_id:run._id},{$set:{status:result.status,error:result.error,summary:result.summary,durationMs:result.durationMs,finishedAt:new Date()}});
  return await FlowRun.findById(run._id).lean();
 }catch(error){if(run)await FlowRun.updateOne({_id:run._id},{$set:{status:'failed',error:error.message,finishedAt:new Date()}});throw error;}
 finally{await Flow.updateOne({_id:flow._id,executionLockUntil:lockUntil},{$set:{executionLockUntil:null}});}
}
