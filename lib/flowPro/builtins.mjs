import { compare, safePath, parseJSON, resolveValue } from './expressions.mjs';
import { LIMITS } from './graph.mjs';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const items=v=>{if(!Array.isArray(v))throw new Error('This node needs an array. Add Split Out for a nested array.');if(v.length>LIMITS.items)throw new Error(`Maximum ${LIMITS.items} items per node`);return v;};
const bounded=(n,def,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(n))?Number(n):def));
const keys=v=>String(v||'').split(',').map(s=>s.trim()).filter(Boolean);
export const BUILTINS={
 'trigger.manual':async(c,x)=>({output:x.triggerSeed??x.input??{},message:'Manual trigger received'}),
 'trigger.webhook':async(c,x)=>({output:x.triggerSeed??x.input??parseJSON(c.sampleBody||'{}'),message:'Webhook payload received'}),
 'trigger.schedule':async(c,x)=>({output:x.triggerSeed??x.input??{scheduledAt:new Date().toISOString()},message:'Scheduled trigger received'}),
 'data.set':async(c,x)=>({output:{...(c.keepInput!=='no'?object(x.previousOutput):{}),...object(c.fields)},message:'Fields mapped'}),
 'data.select':async(c,x)=>{const pick=v=>Object.fromEntries(Object.entries(object(v)).filter(([k])=>c.mode==='remove'?!keys(c.fields).includes(k):keys(c.fields).includes(k)));return {output:Array.isArray(x.previousOutput)?x.previousOutput.map(pick):pick(x.previousOutput)};},
 'data.parseJson':async(c,x)=>({output:parseJSON(c.value??x.previousOutput,'Input JSON')}),
 'data.stringify':async(c,x)=>({output:JSON.stringify(x.previousOutput,null,bounded(c.indent,2,0,4))}),
 'data.filter':async(c,x)=>({output:items(x.previousOutput).filter(v=>compare(safePath(v,c.field),c.operator||'equals',c.value))}),
 'data.sort':async(c,x)=>({output:[...items(x.previousOutput)].sort((a,b)=>{const aa=safePath(a,c.field),bb=safePath(b,c.field);const diff=typeof aa==='number'&&typeof bb==='number'?aa-bb:String(aa??'').localeCompare(String(bb??''));return c.direction==='descending'?-diff:diff;})}),
 'data.limit':async(c,x)=>({output:items(x.previousOutput).slice(bounded(c.offset,0,0,1000),bounded(c.offset,0,0,1000)+bounded(c.limit,10,0,1000))}),
 'data.deduplicate':async(c,x)=>{const seen=new Set();return {output:items(x.previousOutput).filter(v=>{const k=JSON.stringify(c.field?safePath(v,c.field):v);if(seen.has(k))return false;seen.add(k);return true;})};},
 'data.split':async(c,x)=>({output:items(safePath(x.previousOutput,c.field))}),
 'data.batch':async(c,x)=>{const list=items(x.previousOutput),size=bounded(c.size,10,1,100),out=[];for(let i=0;i<list.length;i+=size)out.push(list.slice(i,i+size));return {output:out};},
 'data.map':async(c,x)=>({output:items(x.previousOutput).map((item,index)=>resolveValue(parseJSON(x.rawConfig?.fields??c.fields??'{}'),{...x,item,index,previousOutput:item})),message:'Items transformed'}),
 'data.aggregate':async(c,x)=>{const list=items(x.previousOutput);if(c.operation==='count')return {output:{count:list.length}};const values=list.map(v=>Number(c.field?safePath(v,c.field):v));if(values.some(v=>!Number.isFinite(v)))throw new Error('Aggregate requires finite numeric values');const sum=values.reduce((a,b)=>a+b,0);const value=c.operation==='sum'?sum:c.operation==='average'?(values.length?sum/values.length:null):c.operation==='min'?(values.length?Math.min(...values):null):(values.length?Math.max(...values):null);return {output:{[c.operation]:value,count:list.length}};},
 'data.merge':async(c,x)=>{const all=x.inputs??[];if(c.mode==='object')return {output:Object.assign({},...all.map(object))};if(c.mode==='byKey'){const map=new Map();for(const value of all.flat()){const k=safePath(value,c.key);if(k==null)throw new Error(`Merge key ${c.key} is missing`);map.set(k,{...map.get(k),...object(value)});}return {output:[...map.values()]};}return {output:all.flat()};},
 'data.rename':async(c,x)=>{const rename=v=>{const out={};for(const[k,value]of Object.entries(object(v))){const key=c.mapping?.[k]||k;if(['__proto__','prototype','constructor'].includes(key))throw new Error('Unsafe output key');out[key]=value;}return out;};return {output:Array.isArray(x.previousOutput)?x.previousOutput.map(rename):rename(x.previousOutput)};},
 'data.text':async(c,x)=>{const v=c.value??x.previousOutput, s=String(v??'');return {output:c.operation==='uppercase'?s.toUpperCase():c.operation==='lowercase'?s.toLowerCase():c.operation==='split'?s.split(c.separator??','):c.operation==='join'?items(v).join(c.separator??','):c.operation==='replace'?s.split(c.separator??'').join(c.replacement??''):s.trim()};},
 'logic.condition':async(c,x)=>{const actual=c.field?safePath(x.previousOutput,c.field):x.previousOutput;const pass=compare(actual,c.operator||'contains',c.value);return {output:x.previousOutput,branch:pass?'true':'false',message:`Condition → ${pass?'true':'false'}`};},
 'logic.switch':async(c,x)=>{const actual=c.field?safePath(x.previousOutput,c.field):x.previousOutput;const cases=object(c.cases);const branch=Object.entries(cases).find(([,v])=>compare(actual,'equals',v))?.[0]||'default';return {output:x.previousOutput,branch,message:`Selected output: ${branch}`};},
 'logic.stop':async(c)=>({error:String(c.message||'Workflow stopped intentionally')}),
 'logic.assert':async(c,x)=>{const missing=keys(c.fields).filter(k=>!compare(safePath(x.previousOutput,k),'notEmpty'));if(missing.length)throw new Error(`Missing fields: ${missing.join(', ')}`);return {output:x.previousOutput,message:'Validation passed'};},
 'logic.delay':async(c,x)=>{const ms=c.durationSeconds!=null?Number(c.durationSeconds)*1000:Number(c.durationMinutes??0)*60000;if(!Number.isFinite(ms)||ms<0||ms>10000)throw new Error('Inline waits are limited to 10 seconds. Use a schedule for longer waits.');if(x.mode!=='test')await new Promise((resolve,reject)=>{const onAbort=()=>{clearTimeout(timer);reject(new Error('Run cancelled'));};const timer=setTimeout(()=>{x.signal?.removeEventListener('abort',onAbort);resolve();},ms);if(x.signal?.aborted)onAbort();else x.signal?.addEventListener('abort',onAbort,{once:true});});return {output:x.previousOutput,message:x.mode==='test'?`Test mode: skipped ${ms} ms wait`:`Waited ${ms} ms`};},
 'logic.loop':async(c,x)=>{const list=items(c.overField?safePath(x.previousOutput,c.overField):x.previousOutput);return {output:list,message:'Items ready. Enable “Run once per item” on the next node.'};},
 'logic.noop':async(c,x)=>({output:x.previousOutput}),
 'utility.log':async(c,x)=>({output:x.previousOutput,message:String(c.message||'Checkpoint')}),
 'utility.timestamp':async(c,x)=>({output:{...object(x.previousOutput),[c.field||'processedAt']:new Date().toISOString()}}),
 'utility.uuid':async(c,x)=>({output:{...object(x.previousOutput),[c.field||'id']:globalThis.crypto.randomUUID()}}),
};
export function isBuiltin(type){return !!BUILTINS[type];}
export async function executeBuiltin(type,config,context){if(!BUILTINS[type])throw new Error(`No native executor for ${type}`);return BUILTINS[type](config,context);}
