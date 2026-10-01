/** A deliberately small expression language. No eval, Function, JS access or prototype traversal. */
const forbidden = new Set(['__proto__','prototype','constructor']);
export function safePath(value,path='') {
 if(path==='' || path==null) return value;
 const parts=String(path).replace(/\[(\d+)\]/g,'.$1').split('.').filter(Boolean);
 for(const part of parts) {
  if(forbidden.has(part)) throw new Error('Unsafe expression path');
  if(value==null || typeof value!=='object' || !Object.hasOwn(value,part)) return undefined;
  value=value[part];
 }
 return value;
}
function atom(input,ctx) {
 const s=input.trim();
 if(s==='') return '';
 if(s==='undefined') return undefined;
 if(s==='null') return null;
 if(s==='true') return true;
 if(s==='false') return false;
 if(/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
 if((s.startsWith('"')&&s.endsWith('"'))||(s.startsWith("'")&&s.endsWith("'"))) return s[0]==='"'?JSON.parse(s):s.slice(1,-1);
 const roots={'$json':ctx.previousOutput,'$input':{all:ctx.inputs || []},'$vars':ctx.variables || {},'$node':ctx.outputs || {},'$item':ctx.item,'$index':ctx.index ?? 0,'$run':ctx.run || {}};
 const match=s.match(/^(\$[a-z]+)(?:\.(.*)|\[(\d+)\])?$/i);
 if(!match || !Object.hasOwn(roots,match[1])) throw new Error(`Unsupported expression: ${s}. Use $json, $item, $node, $input.all or $vars paths.`);
 return safePath(roots[match[1]],match[2] ?? match[3] ?? '');
}
export function evaluateExpression(input,ctx={}) {
 // The fallback grammar is intentionally limited to one ?? outside quoted literals.
 const parts=String(input).split(/\s+\?\?\s+/);
 if(parts.length>2) throw new Error('Only one ?? fallback is supported');
 const v=atom(parts[0],ctx);
 return v==null && parts.length===2 ? atom(parts[1],ctx) : v;
}
export function resolveValue(value,ctx={},depth=0) {
 if(depth>30) throw new Error('Data nesting exceeds 30 levels');
 if(Array.isArray(value)) return value.map(v=>resolveValue(v,ctx,depth+1));
 if(value && typeof value==='object') {
  const out={};
  for(const [key,v] of Object.entries(value)) { if(forbidden.has(key)) throw new Error('Unsafe object key'); out[key]=resolveValue(v,ctx,depth+1); }
  return out;
 }
 if(typeof value!=='string') return value;
 const exact=value.match(/^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/);
 if(exact) return evaluateExpression(exact[1],ctx);
 return value.replace(/\{\{\s*([^{}]+?)\s*\}\}/g,(_,expr)=> { const v=evaluateExpression(expr,ctx); return v==null?'':typeof v==='object'?JSON.stringify(v):String(v); });
}
export function parseJSON(value,label='JSON') {
 if(typeof value!=='string') return value;
 try {return JSON.parse(value,(key,val)=> {if(forbidden.has(key)) throw new Error('Unsafe object key'); return val;});}
 catch(err) {throw new Error(`${label}: ${err.message}`);}
}
export function resolveConfig(config,ctx,jsonKeys=[]) {
 const result={};
 for(const [key,value] of Object.entries(config||{})) {
  // Parse JSON first so expressions preserve numbers, arrays and strings safely.
  if(jsonKeys.includes(key) && typeof value==='string' && !/^\s*\{\{/.test(value)) result[key]=resolveValue(parseJSON(value,key),ctx);
  else result[key]=resolveValue(value,ctx);
 }
 return result;
}
export function compare(actual,operator,expected) {
 switch(operator) {
  case 'equals':return typeof actual==='object'?JSON.stringify(actual)===JSON.stringify(expected):String(actual ?? '')===String(expected ?? '');
  case 'notEquals':return !compare(actual,'equals',expected);
  case 'contains':return Array.isArray(actual)?actual.some(v=>compare(v,'equals',expected)):String(actual ?? '').includes(String(expected ?? ''));
  case 'notContains':return !compare(actual,'contains',expected);
  case 'gt': case 'gte': case 'lt': case 'lte': {const a=Number(actual),b=Number(expected); if(!Number.isFinite(a)||!Number.isFinite(b)) return false; return operator==='gt'?a>b:operator==='gte'?a>=b:operator==='lt'?a<b:a<=b;}
  case 'notEmpty':return actual!=null && actual!=='' && (!Array.isArray(actual)||actual.length>0);
  case 'isEmpty':return !compare(actual,'notEmpty');
  case 'isTrue':return actual===true || actual==='true';
  case 'isFalse':return actual===false || actual==='false';
  default:throw new Error(`Unknown condition operator: ${operator}`);
 }
}
