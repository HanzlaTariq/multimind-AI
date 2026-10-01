import Flow from '@/models/Flow';
import FlowRun from '@/models/FlowRun';
import FlowVersion from '@/models/FlowVersion';
import { withFlowAuth, ownedFlow, publicFlow, readJSON, checkedGraph, httpError, saveVersion } from '@/lib/flowPro/server';
import { nextSchedule } from '@/lib/flowPro/schedule.mjs';
export const GET=withFlowAuth(async(req,{params},userId)=>Response.json({flow:publicFlow(await ownedFlow(params.id,userId))}));
export const PUT=withFlowAuth(async(req,{params},userId)=>{
 const body=await readJSON(req),flow=await ownedFlow(params.id,userId);const revision=flow.revision||1;
 if(body.revision!==undefined&&Number(body.revision)!==revision)throw httpError('This workflow changed in another tab. Export your edits before reloading.',409);
 const update={};for(const key of ['name','description','folder'])if(typeof body[key]==='string')update[key]=body[key].trim().slice(0,key==='name'?80:key==='folder'?50:500);
 if(update.name==='')throw httpError('Workflow name cannot be blank');
 if(body.nodes||body.edges){const graph=checkedGraph({nodes:body.nodes||flow.nodes,edges:body.edges||flow.edges});update.nodes=graph.nodes;update.edges=graph.edges;}
 if(Array.isArray(body.tags))update.tags=body.tags.map(String).map(t=>t.slice(0,30)).slice(0,10);
 if(typeof body.starred==='boolean')update.starred=body.starred;
 for(const key of ['variables','testInput','settings','viewport'])if(body[key]!==undefined){if(body[key]===null||typeof body[key]!=='object'||(key!=='testInput'&&Array.isArray(body[key])))throw httpError(`${key} must be an object`);update[key]=body[key];}
 if(body.status!==undefined){if(!['draft','active','paused'].includes(body.status))throw httpError('Invalid status');update.status=body.status;}
 const effective={...flow.toObject(),...update};
 if(effective.status==='active'){
  checkedGraph(effective,{forRun:true,mode:'live'});
  const schedule=effective.nodes.find(n=>n.type==='trigger.schedule');
  const previous=flow.nodes.find(n=>n.type==='trigger.schedule');
  if(!schedule)update.nextRunAt=null;
  else if(flow.status!=='active'||!flow.nextRunAt||JSON.stringify(schedule.data?.config)!==JSON.stringify(previous?.data?.config))update.nextRunAt=nextSchedule(schedule.data?.config);
 }else if(update.status)update.nextRunAt=null;
 const query={_id:flow._id,user:userId,$or:[{revision},...(revision===1?[{revision:{$exists:false}}]:[])]};
 const saved=await Flow.findOneAndUpdate(query,{$set:{...update,revision:revision+1}},{new:true,runValidators:true});
 if(!saved)throw httpError('Concurrent save detected. Export your edits before reloading.',409);
 if(body.status==='active'&&flow.status!=='active')await saveVersion(saved,userId,'Published checkpoint');
 return Response.json({flow:publicFlow(saved)});
});
export const DELETE=withFlowAuth(async(req,{params},userId)=>{const flow=await ownedFlow(params.id,userId);if(flow.executionLockUntil&&flow.executionLockUntil>new Date())throw httpError('Stop the running workflow before deleting it',409);await Promise.all([FlowRun.deleteMany({flow:flow._id,user:userId}),FlowVersion.deleteMany({flow:flow._id,user:userId})]);await Flow.deleteOne({_id:flow._id,user:userId});return Response.json({deleted:true});});
