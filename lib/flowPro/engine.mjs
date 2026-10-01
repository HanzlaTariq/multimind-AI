import { topologicalLayers, ancestorIds, LIMITS } from './graph.mjs';
import { resolveConfig } from './expressions.mjs';
import { executeBuiltin, isBuiltin } from './builtins.mjs';
import { PLANNED_TYPES } from './catalog.mjs';
export function sanitizeLog(value,secretValues=[]) {
 let text=JSON.stringify(value,(k,v)=> /password|secret|token|authorization|api.?key|cookie/i.test(k)?'[REDACTED]':v);
 if(text===undefined)return null;
 for(const secret of secretValues)if(secret&&secret.length>3)text=text.split(secret).join('[REDACTED]');
 if(text.length>LIMITS.logBytes)return {truncated:true,bytes:text.length,preview:text.slice(0,LIMITS.logBytes)};
 return JSON.parse(text);
}
function mockResult(node,ctx){
 if(node.data?.mockData!==undefined)return {output:node.data.mockData,message:'Test fixture used',mock:true};
 let output=ctx.previousOutput??{};
 if(node.type.startsWith('ai.'))output=node.type==='ai.classify'?{label:'positive',mock:true}:node.type==='ai.extractStructuredData'?{...output,rows:[{description:'Test invoice item',amount:249}]}:node.data?.config?.outputFormat==='json'?{summary:'Test fixture — no AI provider called',mock:true}:'Test fixture — no AI provider called';
 if(node.type==='action.http')output={status:200,body:{message:'Test fixture — no request sent',items:[{id:1,name:'Example',score:92}]}};
 return {output,message:'External action mocked. No provider was called.',mock:true};
}
/** Bounded DAG runner, usable in browser test mode and on the authenticated server. */
export async function executeWorkflow(graph,options={}){
 const {mode='test',input={},variables={},definitions=[],externalExecutor,onLog=async()=>{},shouldCancel=async()=>false,signal,untilNodeId,seedOutputs={},triggerType='manual'}=options;
 if(!Array.isArray(graph?.nodes)||!Array.isArray(graph?.edges))throw new Error('Invalid workflow graph');
 if(graph.nodes.length>LIMITS.nodes||graph.edges.length>LIMITS.edges)throw new Error('Workflow exceeds execution limits');
 if(new Set(graph.nodes.map(n=>n.nodeId)).size!==graph.nodes.length)throw new Error('Duplicate node ID');
 if(definitions.length&&graph.nodes.some(n=>!definitions.some(d=>d.type===n.type)))throw new Error('Unsupported node type');
 const started=Date.now();const logs=[],outputs={},states=new Map(),edgeState=new Map();let stopped=false,cancelled=false;let runError=null;
 const noteIds=new Set(graph.nodes.filter(n=>n.type==='utility.note').map(n=>n.nodeId));
 let nodes=graph.nodes.filter(n=>!noteIds.has(n.nodeId));let edges=graph.edges.filter(e=>!noteIds.has(e.source)&&!noteIds.has(e.target));
 if(untilNodeId){if(!nodes.some(n=>n.nodeId===untilNodeId))throw new Error('Selected node does not exist');const ancestors=ancestorIds(untilNodeId,edges);nodes=nodes.filter(n=>ancestors.has(n.nodeId));edges=edges.filter(e=>ancestors.has(e.source)&&ancestors.has(e.target));}
 const layers=topologicalLayers(nodes,edges);const deadline=Math.min(LIMITS.runMs,Math.max(1000,Number(options.timeoutMs)||LIMITS.runMs));
 const concurrency=Math.max(1,Math.min(6,Number(options.concurrency)||3));
 const hasSeed=Object.keys(seedOutputs).length>0;
 const rootIds=new Set(nodes.filter(n=>n.type.startsWith('trigger.')&&(!hasSeed||Object.hasOwn(seedOutputs,n.nodeId))).map(n=>n.nodeId));
 if(!rootIds.size)throw new Error('Add a trigger connected to your workflow');
 async function emit(log){logs.push(log);await onLog(log);}
 function deactivate(id){for(const e of edges.filter(e=>e.source===id))edgeState.set(e.edgeId,false);}
 async function step(node){
  const begin=Date.now();const incoming=edges.filter(e=>e.target===node.nodeId);const active=incoming.filter(e=>edgeState.get(e.edgeId));
  const base={nodeId:node.nodeId,nodeType:node.type,nodeLabel:node.data?.label||definitions.find(d=>d.type===node.type)?.label||node.type,startedAt:new Date(begin).toISOString()};
  if(await shouldCancel()||signal?.aborted){cancelled=true;stopped=true;}
  if(Date.now()-started>=deadline){stopped=true;runError='Workflow time limit reached';}
  if(stopped||(!rootIds.has(node.nodeId)&&!active.length)){
   states.set(node.nodeId,'skipped');deactivate(node.nodeId);await emit({...base,status:'skipped',message:cancelled?'Cancelled':stopped?'Run stopped':'Inactive branch or disconnected node',durationMs:0,finishedAt:new Date().toISOString(),output:null});return;
  }
  const inputs=active.map(e=>outputs[e.source]).filter(v=>v!==undefined);
  const previousOutput=inputs[0]??null;
  const rawConfig=node.data?.config||{},settings=node.data?.settings||{};
  const def=definitions.find(d=>d.type===node.type);
  const defaults=Object.fromEntries((def?.configSchema||[]).filter(f=>f.default!==undefined).map(f=>[f.key,f.default]));
  const configSource={...defaults,...rawConfig};
  const context={previousOutput,inputs,input,outputs:{...outputs},variables,mode,triggerType,triggerSeed:seedOutputs[node.nodeId],rawConfig:configSource,run:{id:options.runId||'test',startedAt:new Date(started).toISOString()}};
  const maxAttempts=Math.min(4,Math.max(1,Number(settings.retries||0)+1));let attempts=0,result;
  if(node.data?.disabled){result={output:previousOutput,message:'Disabled node: input passed through',disabled:true};}
  else if(mode==='test'&&node.data?.pinned){result={output:node.data.pinnedData??null,message:'Pinned test data',pinned:true};}
  else {
   while(attempts<maxAttempts){
    attempts++;const controller=new AbortController();const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
    const timeout=Math.max(1,Math.min(30000,Number(settings.timeoutMs)||15000,deadline-(Date.now()-started)));let timer;
    try{
     const invoke=async(ctx)=>{
      // Map Items evaluates its template once per item, not against the whole input.
      const jsonKeys=(def?.configSchema||[]).filter(f=>f.type==='json'&&!(node.type==='data.map'&&f.key==='fields')).map(f=>f.key);
      const source=node.type==='data.map'?{...configSource,fields:undefined}:configSource;
      const config=resolveConfig(source,ctx,jsonKeys);
      if(isBuiltin(node.type))return executeBuiltin(node.type,config,{...ctx,signal:controller.signal});
      if(mode==='test')return mockResult(node,ctx);
      if(PLANNED_TYPES.has(node.type))throw new Error('This legacy node is a placeholder and cannot execute live');
      if(!externalExecutor)throw new Error('External integrations require the authenticated server');
      const value=await externalExecutor(node.type,config,{...ctx,signal:controller.signal});
      if(value?.simulated)throw new Error(value.message||'The selected connector is not implemented');
      return value;
     };
     const execute=async()=>{
      if(settings.executionMode==='each'&&Array.isArray(previousOutput)){
       if(previousOutput.length>100)throw new Error('Per-item execution is capped at 100 items');
       const values=[];let mocks=false;
       for(let index=0;index<previousOutput.length;index++){
        if(controller.signal.aborted||await shouldCancel()){cancelled=true;stopped=true;throw new Error('Run cancelled');}
        const r=await invoke({...context,previousOutput:previousOutput[index],item:previousOutput[index],index});if(r?.error)throw new Error(r.error);if(r?.branch)throw new Error('Per-item mode cannot be used on branching nodes');values.push(r?.output??null);mocks ||= !!r?.mock;
       }
       return {output:values,message:`Processed ${values.length} items`,mock:mocks};
      }
      return invoke(context);
     };
     result=await Promise.race([execute(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error(`Node timed out after ${timeout} ms`));},timeout);})]);
     if(result?.error)throw new Error(result.error);
     break;
    }catch(error){result={error:error.message||'Node execution failed'};
     if(signal?.aborted){cancelled=true;stopped=true;}
     // Avoid auto-retrying timeouts: the remote side effect may have completed.
     if(controller.signal.aborted||attempts>=maxAttempts)break;
     await new Promise(r=>setTimeout(r,Math.min(1500,Math.max(0,Number(settings.retryDelayMs)||250)*attempts)));
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
   }
  }
  result ||= {output:null};
  const failed=!!result.error;let branch=result.branch;
  if(failed){
   if(settings.onError==='branch'){branch='error';result.output={error:result.error,nodeId:node.nodeId};}
   else if(settings.onError==='continue'){result.output={error:result.error,input:previousOutput};}
   else {stopped=true;runError=result.error;}
  }
  outputs[node.nodeId]=result.output??null;states.set(node.nodeId,failed?'failed':'success');
  const log={...base,status:failed?'failed':'success',input:sanitizeLog(previousOutput),output:sanitizeLog(result.output??null),message:result.message||result.error||'Completed',error:result.error||null,branch,attempts,disabled:!!result.disabled,pinned:!!result.pinned,mock:!!result.mock,durationMs:Date.now()-begin,finishedAt:new Date().toISOString()};
  for(const edge of edges.filter(e=>e.source===node.nodeId)){
   const port=edge.sourceHandle || (node.type==='logic.condition'?'true':'out');
   edgeState.set(edge.edgeId,!(failed&&settings.onError!=='branch'&&settings.onError!=='continue') && (branch?port===branch:port!=='error'));
  }
  await emit(log);
 }
 for(const layer of layers){for(let i=0;i<layer.length;i+=concurrency)await Promise.all(layer.slice(i,i+concurrency).map(step));}
 const hasErrors=logs.some(l=>l.status==='failed');
 if(signal?.aborted)cancelled=true;
 return {status:cancelled?'cancelled':runError?'failed':hasErrors?'completed_with_errors':'success',mode,triggerType,logs,error:runError,outputs,startedAt:new Date(started).toISOString(),finishedAt:new Date().toISOString(),durationMs:Date.now()-started,summary:{total:logs.length,success:logs.filter(l=>l.status==='success').length,failed:logs.filter(l=>l.status==='failed').length,skipped:logs.filter(l=>l.status==='skipped').length,mocked:logs.filter(l=>l.mock).length}};
}
