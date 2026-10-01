import Flow from '@/models/Flow';
import FlowRun from '@/models/FlowRun';
import { getFlowTemplate, buildFlowFromTemplate } from '@/lib/flowTemplates';
import { withFlowAuth, readJSON, checkedGraph, httpError, publicFlow } from '@/lib/flowPro/server';
export const GET=withFlowAuth(async(req,ctx,userId)=>{
 const flows=await Flow.find({user:userId}).select('name description status updatedAt createdAt nodes tags folder starred revision').sort({updatedAt:-1}).limit(500).lean();
 const since=new Date(Date.now()-30*24*3600*1000);const runs=await FlowRun.find({user:userId,startedAt:{$gte:since}}).select('status durationMs mode flow startedAt').sort({startedAt:-1}).limit(2000).lean();
 const successful=runs.filter(r=>r.status==='success').length;
 return Response.json({flows:flows.map(f=>({...f,nodeCount:f.nodes?.filter(n=>n.type!=='utility.note').length||0,nodeTypes:f.nodes?.filter(n=>n.type!=='utility.note').map(n=>n.type).slice(0,6),nodes:undefined,lastRun:runs.find(r=>String(r.flow)===String(f._id))||null})),stats:{runs:runs.length,successRate:runs.length?Math.round(successful/runs.length*100):null,period:'Last 30 days, up to 2,000 runs'}});
});
export const POST=withFlowAuth(async(req,ctx,userId)=>{
 const body=await readJSON(req);for(const key of ['variables','settings'])if(body[key]!==undefined&&(!body[key]||typeof body[key]!=='object'||Array.isArray(body[key])))throw httpError(`${key} must be an object`);const template=body.templateId?getFlowTemplate(body.templateId):null;if(body.templateId&&!template)throw httpError('Unknown template');
 const name=String(body.name||template?.flowName||'Untitled workflow').trim().slice(0,80);if(!name)throw httpError('Flow name is required');
 const graph=body.nodes?checkedGraph(body):template?buildFlowFromTemplate(template):{nodes:[],edges:[]};
 const flow=await Flow.create({user:userId,name,description:String(body.description??template?.flowDescription??'').slice(0,500),...graph,status:'draft',tags:Array.isArray(body.tags)?body.tags.map(String).slice(0,10):template?.tags||[],folder:String(body.folder||'Personal').slice(0,50),variables:body.variables||template?.variables||{},settings:body.settings||{concurrency:3,timeoutMs:90000},testInput:body.testInput||template?.testInput||{}});
 return Response.json({flow:publicFlow(flow)},{status:201});
});
