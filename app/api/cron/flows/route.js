import dbConnect from '@/lib/mongodb';
import Flow from '@/models/Flow';
import { verifyCron } from '@/lib/flowPro/server';
import { nextSchedule } from '@/lib/flowPro/schedule.mjs';
import { runFlow } from '@/lib/flowNodes/runFlow';
export const maxDuration=120;
export async function GET(req){try{verifyCron(req);await dbConnect();const candidates=await Flow.find({status:'active',nextRunAt:{$lte:new Date()},'nodes.type':'trigger.schedule'}).sort({nextRunAt:1}).limit(1);const results=[];for(const flow of candidates){const trigger=flow.nodes.find(n=>n.type==='trigger.schedule');try{const next=nextSchedule(trigger.data?.config);const claimed=await Flow.findOneAndUpdate({_id:flow._id,nextRunAt:flow.nextRunAt},{$set:{nextRunAt:next}});if(!claimed)continue;const input={scheduledAt:new Date().toISOString()};const run=await runFlow(flow,{userId:String(flow.user),mode:'live',triggerType:'scheduled',input,seedOutputs:new Map([[trigger.nodeId,input]])});results.push({flowId:flow._id,runId:run._id,status:run.status});}catch(e){results.push({flowId:flow._id,error:e.message});}}return Response.json({results});}catch(e){return Response.json({error:e.status?e.message:'Schedule sweep failed'},{status:e.status||500});}}
