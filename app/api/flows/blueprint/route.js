import { withFlowAuth,readJSON,checkedGraph,httpError } from '@/lib/flowPro/server';
import { NODE_TYPES } from '@/components/flows/nodeTypesConfig';
import { parseJSON } from '@/lib/flowPro/expressions.mjs';
import { automationPricing } from '@/lib/automationCredits/config';
import { readyRecipe,priceSteps } from '@/lib/automationCredits/pricing.mjs';
import { beginMeter,publicBalance } from '@/lib/automationCredits/wallet';
import ReadyToolRun from '@/models/ReadyToolRun';
import { routeToProvider } from '@/lib/providers';
import { PROVIDER_CALLERS } from '@/lib/aiProviders';
export const maxDuration=60;
export const GET=withFlowAuth(async(req,ctx,userId)=>{
 const [pricing,wallet]=await Promise.all([automationPricing(),publicBalance(userId)]);
 return Response.json({quote:{...priceSteps(readyRecipe('blueprint'),pricing.costs,pricing.policy),...wallet}},{headers:{'Cache-Control':'no-store'}});
});
export const POST=withFlowAuth(async(req,ctx,userId)=>{
 const body=await readJSON(req);
 if(typeof body.prompt!=='string'||body.prompt.trim().length<10||body.prompt.length>2000)throw httpError('Describe the workflow in 10–2,000 characters');
 if(!Number.isSafeInteger(body.maxCredits)||body.maxCredits<0)throw httpError('Review the current credit quote first.');
 const requestId=req.headers.get('idempotency-key')||'';
 if(!/^[A-Za-z0-9_-]{16,80}$/.test(requestId))throw httpError('A valid request ID is required.');
 await ReadyToolRun.init();
 if(await ReadyToolRun.countDocuments({user:userId,createdAt:{$gte:new Date(Date.now()-60000)}})>=10)throw httpError('Please wait before generating another draft.',429);
 const provider=routeToProvider(body.prompt);if(!provider)throw httpError('The website has no configured AI provider.',503);
 const pricing=await automationPricing(),quote=priceSteps(readyRecipe('blueprint'),pricing.costs,pricing.policy);
 let run,meter,receipt,started=false,complete=false;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{
  try{run=await ReadyToolRun.create({user:userId,requestId,toolId:'blueprint',provider:provider.id});}catch(e){if(e.code===11000)throw httpError('This draft request was already submitted.',409);throw e;}
  meter=await beginMeter(userId,quote,{key:`draft_${run._id}`,scope:'ai-draft',reference:String(run._id),label:'AI workflow draft',maxCredits:body.maxCredits});
  await meter.start('step_1');started=true;
  const library=NODE_TYPES.filter(n=>n.capability!=='planned'&&n.type!=='utility.note').map(n=>({type:n.type,description:n.description,config:n.configSchema.map(f=>({key:f.key,default:f.default,type:f.type}))}));const system=`You design a workflow draft. Return JSON only with name, description, nodes, edges, testInput. Each node: {nodeId:"node_1",type,position:{x:0,y:0},data:{label,config:{}}}. Each edge: {edgeId:"edge_1",source:"node_1",target:"node_2",sourceHandle:"out",targetHandle:"in"}. Use at most 20 nodes. Node IDs use letters, digits, underscore. Start with trigger.manual or trigger.webhook. logic.condition has true/false outputs, logic.switch has case names/default. Never put API keys, access tokens or credentials in config. Expressions support only {{ $json.field }}, {{ $vars.field }} and {{ $item.field }}. Do not use JavaScript or invent node types. Each node is 244px wide; space nodes 330px horizontally and branches 200px vertically. Available library: ${JSON.stringify(library)}`;
  const response=await PROVIDER_CALLERS[provider.id](body.prompt,[],system,{signal:controller.signal});
  if(response.status!=='ok'||!response.text)throw httpError('The AI provider did not return a draft.',502);
  let draft;try{draft=parseJSON(response.text.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{throw httpError('The AI returned invalid JSON. This failed draft is not charged.',422);}
  if(draft.nodes?.length>20)throw httpError('The generated draft exceeds 20 nodes',422);
  const graph=checkedGraph(draft);complete=true;
  await meter.finish('step_1','success');receipt=await meter.close('success');
  await ReadyToolRun.updateOne({_id:run._id},{$set:{status:'success',credits:receipt.charged,billing:receipt}});
  return Response.json({draft:{...graph,name:String(draft.name||'AI workflow draft').slice(0,80),description:String(draft.description||'').slice(0,500),testInput:draft.testInput||{}},billing:receipt,message:'Review the generated graph and configure credentials before live execution.'});
 }catch(e){
  if(meter){if(started&&!complete)await meter.finish('step_1','failed').catch(()=>{});receipt=await meter.close(complete?'uncertain':'failed').catch(()=>null);}
  if(run)await ReadyToolRun.updateOne({_id:run._id},{$set:{status:complete?'uncertain':'failed',...(receipt?{credits:receipt.charged,billing:receipt}:{})}}).catch(()=>{});
  throw e;
 }finally{clearTimeout(timer);}
});
