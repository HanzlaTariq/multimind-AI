/** Shared deterministic pricing; prices arrive from the database, never from a browser. */
import { isBuiltin } from '../flowPro/builtins.mjs';
import { ancestorIds } from '../flowPro/graph.mjs';
import { TOOLS, defaultOptions } from '../readyTools/catalog.mjs';
export const CREDIT_PREFIX = 'flow-node:';
export const DEFAULT_POLICY = Object.freeze({ enabled: true, chargeTests: false, maxRunCredits: 10000 });
export const MAX_NODE_COST = 10000;
export const EXTRA_NODES = [
 { type: 'ready.cleanRows', label: 'Clean row whitespace', category: 'Ready tools' },
 { type: 'ready.emailSyntax', label: 'Check email syntax', category: 'Ready tools' },
 { type: 'ready.datasetStats', label: 'Dataset statistics', category: 'Ready tools' },
 { type: 'ready.columns', label: 'Organize columns', category: 'Ready tools' },
 { type: 'ready.convert', label: 'Prepare table conversion', category: 'Ready tools' },
 { type: 'ready.textClean', label: 'Clean text', category: 'Ready tools' },
 { type: 'ready.textStats', label: 'Count words and text', category: 'Ready tools' },
 { type: 'ready.jsonFormat', label: 'Validate and format JSON', category: 'Ready tools' },
 { type: 'ready.sheetsRead', label: 'Read Google Sheets', category: 'Ready tools' },
 { type: 'ready.blueprint', label: 'AI workflow draft', category: 'AI' },
 ...TOOLS.filter(t => t.engine === 'ai').map(t => ({type: `ready.${t.id}`, label: t.name, category: 'AI ready tools'})),
];
export function checkedCost(value, name='Cost') {
 if (!Number.isSafeInteger(value) || value < 0 || value > MAX_NODE_COST) throw new Error(`${name} must be a whole number from 0 to ${MAX_NODE_COST.toLocaleString()}.`);
 return value;
}
export function nodeCost(type, costs) {
 const doc=costs[CREDIT_PREFIX + type];
 if (!doc) throw new Error(`Pricing is not configured for ${type}. Ask an administrator to open Tool Costs.`);
 return checkedCost(doc.cost);
}
export function readyRecipe(toolId, options={}) {
 const t=TOOLS.find(t=>t.id===toolId);
 if (!t && toolId!=='blueprint') throw new Error('Unknown tool');
 const o={...defaultOptions(toolId),...options}, steps=[];
 const add=(type,label)=>steps.push({nodeId:`step_${steps.length+1}`,type,label});
 if(toolId==='blueprint') add('ready.blueprint','Generate and validate workflow draft');
 else if(t.engine==='ai') add(`ready.${toolId}`,t.name);
 else if(t.engine==='connection') add({'sheets-reader':'ready.sheetsRead','gmail-send':'action.email','slack-send':'action.slack','discord-send':'action.discord','telegram-send':'action.telegram'}[toolId],t.name);
 else if(t.input==='text') add({'text-cleaner':'ready.textClean','text-stats':'ready.textStats','json-formatter':'ready.jsonFormat'}[toolId],t.name);
 else {
  if(o.trim) add('ready.cleanRows','Trim row whitespace');
  if(toolId==='email-cleaner') add('ready.emailSyntax','Validate email syntax');
  if(['clean-rank','remove-duplicates','email-cleaner'].includes(toolId)) add('data.deduplicate','Remove blank and duplicate records');
  if(toolId==='clean-rank') {
   if(o.rankColumn && o.minScore!=='' && o.minScore!=null) add('data.filter','Filter minimum score');
   if(o.rankColumn) add('data.sort','Rank records');
   add('data.limit','Apply result limit');
  }
  if(toolId==='filter-sort') {
   if(o.filterColumn) add('data.filter','Filter records');
   if(o.rankColumn) add('data.sort','Sort records');
   add('data.limit','Apply result limit');
  }
  if(toolId==='data-summary') add('ready.datasetStats','Summarize the dataset');
  if(toolId==='column-picker') add('ready.columns','Choose, reorder and rename columns');
  if(toolId==='format-converter') add('ready.convert','Prepare conversion result');
 }
 return steps;
}
export function priceSteps(steps,costs,policy=DEFAULT_POLICY) {
 const lines=steps.map(n=>({...n,cost:policy.enabled ? nodeCost(n.type,costs) : 0}));
 const total=lines.reduce((sum,n)=>sum+n.cost,0);
 return {lines,total,nodeCount:lines.length,overLimit:total>policy.maxRunCredits,limit:policy.maxRunCredits};
}
export function billableNode(node, mode, policy=DEFAULT_POLICY) {
 if(node.type==='utility.note'||node.data?.disabled) return false;
 if(mode==='test' && (!policy.chargeTests || node.data?.pinned || !isBuiltin(node.type))) return false;
 return true;
}
export function flowQuote(graph,costs,policy=DEFAULT_POLICY,{mode='live',untilNodeId,seedIds}={}) {
 const allowed=untilNodeId ? ancestorIds(untilNodeId,graph.edges) : new Set(graph.nodes.map(n=>n.nodeId));
 if(untilNodeId && !graph.nodes.some(n=>n.nodeId===untilNodeId)) throw new Error('Selected node does not exist');
 // Disabled nodes still pass data along. Sticky notes do not execute.
 const reached=new Set(graph.nodes.filter(n=>n.type.startsWith('trigger.') && (!seedIds?.length||seedIds.includes(n.nodeId))).map(n=>n.nodeId));
 for(let i=0;i<graph.nodes.length;i++) { let change=false; for(const e of graph.edges) if(reached.has(e.source)&&!reached.has(e.target)&&graph.nodes.find(n=>n.nodeId===e.source)?.type!=='utility.note') { reached.add(e.target);change=true; } if(!change)break; }
 const steps=graph.nodes.filter(n=>allowed.has(n.nodeId)&&reached.has(n.nodeId)&&billableNode(n,mode,policy)).map(n=>({nodeId:n.nodeId,type:n.type,label:n.data?.label||n.type}));
 return {...priceSteps(steps,costs,policy),mode,estimate:true,rule:'Upper bound: all reachable branches. Only started nodes can be charged; unused reserved credits are returned.'};
}
export function receiptFromHold(hold,{status='complete',sameCycle=true,now=new Date()}={}) {
 const charged=hold.units.filter(u=>u.status!=='failed').reduce((sum,u)=>sum+u.cost,0);
 if(!Number.isSafeInteger(charged)||charged<0||charged>hold.reserved) throw new Error('Invalid reservation accounting');
 const unused=hold.reserved-charged;
 return {key:hold.key,scope:hold.scope,reference:hold.reference,label:hold.label,status,reserved:hold.reserved,charged,refunded:sameCycle?unused:0,expiredUnused:sameCycle?0:unused,
  units:hold.units,uncertain:hold.units.some(u=>u.status==='started'||u.status==='uncertain'),createdAt:hold.createdAt,finishedAt:now};
}
