import { getPorts, PLANNED_TYPES } from './catalog.mjs';
import { parseJSON } from './expressions.mjs';
export const LIMITS={nodes:200,edges:500,bytes:1048576,items:1000,logBytes:32768,runMs:90000};
export function uid(prefix='node') { return `${prefix}_${globalThis.crypto?.randomUUID?.().replaceAll('-','').slice(0,16) || Math.random().toString(36).slice(2)+Date.now().toString(36)}`; }
export function normalizeGraph(graph={}) {
 const nodes=(graph.nodes||[]).map(n=>{
  const source=n.data||{}; const data=JSON.parse(JSON.stringify(source));
  const type=source.nodeType || n.type;
  delete data.nodeType; delete data.runtime; delete data.onAction;
  // Preserve old minute-based delays; long delays now fail explicitly rather than silently becoming 1 second.
  if(type==='logic.delay'&&data.config?.durationSeconds===undefined&&data.config?.durationMinutes!==undefined)data.config.durationSeconds=Number(data.config.durationMinutes)*60;
  return {nodeId:String(n.nodeId || n.id || ''),type,position:{x:Number(n.position?.x ?? 0),y:Number(n.position?.y ?? 0)},data};
 });
 const edges=(graph.edges||[]).map(e=>({edgeId:String(e.edgeId || e.id || ''),source:String(e.source||''),target:String(e.target||''),sourceHandle:e.sourceHandle||null,targetHandle:e.targetHandle||null,label:typeof e.label==='string'?e.label.slice(0,80):''}));
 return {nodes,edges};
}
export function toCanvas(graph) {
 return {nodes:(graph.nodes||[]).map(n=>({id:n.nodeId,type:n.type==='utility.note'?'stickyNote':'proNode',position:n.position,data:{...n.data,nodeType:n.type}})),edges:(graph.edges||[]).map(e=>({id:e.edgeId,source:e.source,target:e.target,sourceHandle:e.sourceHandle||undefined,targetHandle:e.targetHandle||undefined,label:e.label||undefined,type:'proEdge'}))};
}
export function topologicalLayers(nodes,edges) {
 const ids=new Map(nodes.map(n=>[n.nodeId,n]));
 const incoming=new Map(nodes.map(n=>[n.nodeId,0])); const children=new Map(nodes.map(n=>[n.nodeId,[]]));
 for(const e of edges) {if(!ids.has(e.source)||!ids.has(e.target)) throw new Error('Connection references a missing node'); incoming.set(e.target,incoming.get(e.target)+1);children.get(e.source).push(e.target);}
 let ready=nodes.filter(n=>incoming.get(n.nodeId)===0); const layers=[]; let seen=0;
 while(ready.length) { layers.push(ready); seen+=ready.length; const next=[];for(const n of ready)for(const id of children.get(n.nodeId)) {incoming.set(id,incoming.get(id)-1);if(incoming.get(id)===0)next.push(ids.get(id));}ready=next; }
 if(seen!==nodes.length) throw new Error('Circular connection detected. Use Map Items or per-item execution instead of back-edges.');
 return layers;
}
export function ancestorIds(id,edges) { const result=new Set([id]);const q=[id];while(q.length){const x=q.shift();for(const e of edges)if(e.target===x&&!result.has(e.source)){result.add(e.source);q.push(e.source);}}return result; }
export function wouldCycle(source,target,edges) {return source===target || ancestorIds(source,edges).has(target);}
export function validateGraph(graph,definitions=[],{forRun=false,mode='test'}={}) {
 const problems=[];const issue=(message,nodeId,severity='error')=>problems.push({message,nodeId,severity});
 if(!Array.isArray(graph.nodes)||!Array.isArray(graph.edges)) return [{message:'A workflow must contain node and edge arrays',severity:'error'}];
 if(graph.nodes.length>LIMITS.nodes||graph.edges.length>LIMITS.edges) issue(`Maximum ${LIMITS.nodes} nodes and ${LIMITS.edges} connections per workflow`);
 if(JSON.stringify(graph).length>LIMITS.bytes) issue('Workflow is larger than 1 MB');
 const ids=new Set(),edgeIds=new Set(),pairs=new Set();
 for(const n of graph.nodes){
  if(!n.nodeId||!/^[\w-]{1,100}$/.test(n.nodeId))issue('Node IDs must use letters, numbers, underscores or hyphens',n.nodeId);
  if(ids.has(n.nodeId))issue('Duplicate node ID',n.nodeId);ids.add(n.nodeId);
  if(!n.type||!Number.isFinite(n.position?.x)||!Number.isFinite(n.position?.y))issue('Invalid node type or position',n.nodeId);
  const def=definitions.find(d=>d.type===n.type);
  if(definitions.length&&!def)issue(`Unsupported node type: ${n.type}`,n.nodeId);
  if(n.type==='utility.note')continue;
  if(PLANNED_TYPES.has(n.type)&&!n.data?.disabled)issue('This legacy connector is a placeholder, not a live integration',n.nodeId,forRun&&mode==='live'?'error':'warning');
  if(forRun&&!n.data?.disabled){
   for(const f of def?.configSchema||[]){
    const v=n.data?.config?.[f.key]??f.default;
    if(f.showIf&&n.data?.config?.[f.showIf.key]!==f.showIf.equals)continue;
    if(f.required&&(v===undefined||v===null||v===''))issue(`${f.label} is required`,n.nodeId,mode==='test'&&def?.external?'warning':'error');
    if(f.type==='json'&&v&&typeof v==='string'&&!/^\s*\{\{/.test(v)){try{parseJSON(v,f.label);}catch(err){issue(err.message,n.nodeId);}}
   }
  }
 }
 for(const e of graph.edges){
  if(!e.edgeId||edgeIds.has(e.edgeId))issue('Missing or duplicate connection ID');edgeIds.add(e.edgeId);
  if(!ids.has(e.source)||!ids.has(e.target))issue('Connection references a missing node');
  const source=graph.nodes.find(n=>n.nodeId===e.source),target=graph.nodes.find(n=>n.nodeId===e.target);
  if(source?.type==='utility.note'||target?.type==='utility.note')issue('Sticky notes cannot have connections');
  if(target?.type.startsWith('trigger.'))issue('A trigger cannot have an incoming connection',target.nodeId);
  if(e.sourceHandle&&source&&!getPorts(source).includes(e.sourceHandle))issue(`Output port "${e.sourceHandle}" no longer exists`,e.source);
  const pair=[e.source,e.target,e.sourceHandle||'out',e.targetHandle||'in'].join('|');if(pairs.has(pair))issue('Duplicate connection');pairs.add(pair);
 }
 try{topologicalLayers(graph.nodes,graph.edges);}catch(err){issue(err.message);}
 if(forRun){
  const runnable=graph.nodes.filter(n=>n.type!=='utility.note');
  if(!runnable.length)issue('Add at least one executable node');
  if(!runnable.some(n=>n.type.startsWith('trigger.')))issue('Add a trigger to start the workflow');
  for(const n of runnable)if(!n.type.startsWith('trigger.')&&!graph.edges.some(e=>e.target===n.nodeId))issue('This node is disconnected and will be skipped',n.nodeId,'warning');
 }
 return problems;
}
export function autoLayout(graph,direction='LR') {
 const executable=graph.nodes.filter(n=>n.type!=='utility.note');const ids=new Set(executable.map(n=>n.nodeId));
 const layers=topologicalLayers(executable,graph.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)));
 const positions=new Map();layers.forEach((layer,x)=>layer.forEach((n,y)=>positions.set(n.nodeId,direction==='LR'?{x:100+x*330,y:160+y*180-(layer.length-1)*90}:{x:100+y*310,y:100+x*220})));
 return {...graph,nodes:graph.nodes.map(n=>({...n,position:positions.get(n.nodeId)||n.position}))};
}
function portableData(value,depth=0){
 if(depth>30)return '[Nested data omitted]';
 if(Array.isArray(value))return value.map(v=>portableData(v,depth+1));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!/token|secret|password|api.?key|authorization|cookie|credentialId|connectionId/i.test(key)).map(([key,v])=>[key,portableData(v,depth+1)]));
 // Inspector JSON fields are stored as text, so scrub their keys as well.
 if(typeof value==='string'&&/^\s*[\[{]/.test(value)){try{return JSON.stringify(portableData(JSON.parse(value),depth+1));}catch{}}
 return value;
}
export function exportWorkflow(flow,{includePins=false}={}) {
 const graph=normalizeGraph(flow);
 graph.nodes=graph.nodes.map(n=>{const data={...n.data,config:portableData({...n.data.config})};delete data.runtime;if(!includePins){delete data.pinnedData;delete data.pinned;}
 return {...n,data};});
 return {format:'multimind-flow',schemaVersion:2,exportedAt:new Date().toISOString(),name:flow.name||'Untitled workflow',description:flow.description||'',tags:flow.tags||[],variables:portableData(flow.variables||{}),settings:flow.settings||{},...graph};
}
export function importWorkflow(text,definitions=[]) {
 if(typeof text!=='string'||text.length>LIMITS.bytes)throw new Error('Import must be a JSON file smaller than 1 MB');
 const parsed=parseJSON(text,'Workflow');
 if(parsed.schemaVersion&&parsed.schemaVersion>2)throw new Error('This export uses a newer unsupported schema version');
 if(!Array.isArray(parsed.nodes)||!Array.isArray(parsed.edges))throw new Error('Use a MultiMind workflow JSON export with nodes and edges');
 const graph=normalizeGraph(parsed);const errors=validateGraph(graph,definitions).filter(p=>p.severity==='error');if(errors.length)throw new Error(errors[0].message);
 return {...parsed,...graph,status:'draft',name:String(parsed.name||'Imported workflow').slice(0,80)};
}
