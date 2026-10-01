import { LIMITS,defaultOptions } from './catalog.mjs';
import { validateRows,numberValue,parseSafeJSON } from './data.mjs';
const stat=(label,value)=>({label,value});
const empty=v=>v==null||String(v).trim()==='';
const string=v=>String(v??'');
const normalized=(v,ignoreCase)=>ignoreCase?string(v).trim().toLocaleLowerCase():string(v).trim();
function checkedColumn(columns,c,label,optional=true){if(!c&&optional)return '';if(!columns.includes(c))throw new Error(`Choose a valid ${label} column.`);return c;}
function limitValue(value){const n=Number(value);if(!Number.isInteger(n)||n<1||n>LIMITS.rows)throw new Error('Result limit must be between 1 and 10,000.');return n;}
function sortRows(rows,column,direction){const numeric=rows.every(r=>empty(r[column])||numberValue(r[column])!==null);return [...rows].sort((a,b)=>{const x=a[column],y=b[column];if(empty(x)&&empty(y))return 0;if(empty(x))return 1;if(empty(y))return -1;const v=numeric?numberValue(x)-numberValue(y):string(x).localeCompare(string(y),undefined,{numeric:true});return direction==='asc'?v:-v;});}
export function runLocalTool(id,{rows:inputRows=[],text='',options:given={}}={}){
 const o={...defaultOptions(id,inputRows),...given},warnings=[],steps=[],excluded=[];
 const table=(rows,stats)=>({kind:'table',rows,stats,excluded,report:{steps,warnings}});
 const textResult=(output,stats=[])=>({kind:'text',text:output,stats,report:{steps,warnings}});
 if(['text-cleaner','text-stats','json-formatter'].includes(id)){
  if(typeof text!=='string'||!text.trim())throw new Error('Add some text before running this tool.');if(text.length>LIMITS.text)throw new Error('Use 30,000 characters or fewer.');
  if(id==='text-cleaner'){let lines=text.replace(/\r\n?/g,'\n').split('\n').map(s=>s.replace(/[\t ]+/g,' ').trim());if(o.removeBlankLines)lines=lines.filter(Boolean);const before=lines.length;if(o.removeDuplicateLines){const seen=new Set();lines=lines.filter(s=>{const k=normalized(s,o.ignoreCase);if(seen.has(k))return false;seen.add(k);return true;});}let out=lines.join('\n');if(o.letterCase==='lower')out=out.toLocaleLowerCase();if(o.letterCase==='upper')out=out.toLocaleUpperCase();steps.push('Normalized spaces and line endings','Applied selected text options');return textResult(out,[stat('Original characters',text.length),stat('Result characters',out.length),stat('Duplicate lines removed',before-lines.length)]);}
  if(id==='text-stats'){const words=text.trim().match(/\S+/gu)||[],sentences=text.split(/[.!?。！？]+/u).filter(x=>x.trim()).length;const stats=[stat('Words',words.length),stat('Characters',Array.from(text).length),stat('Without spaces',Array.from(text.replace(/\s/gu,'')).length),stat('Sentences',sentences),stat('Lines',text.split(/\r\n|\n|\r/).length),stat('Reading minutes',Math.max(1,Math.ceil(words.length/200)))];warnings.push('Word count uses whitespace boundaries. Reading time assumes 200 words per minute; sentence count is approximate.');return table(stats,stats.slice(0,4));}
  let parsed;try{parsed=parseSafeJSON(text);}catch(e){throw new Error(`Invalid JSON: ${e.message}`);}steps.push('Parsed JSON successfully','Formatted without executing any code');return {...textResult(JSON.stringify(parsed,null,o.compact?0:2),[stat('Valid JSON','Yes'),stat('Top-level type',Array.isArray(parsed)?'Array':parsed===null?'Null':typeof parsed)]),fileType:'json'};
 }
 const source=validateRows(inputRows),columns=Object.keys(source[0]),initialCount=source.length;
 let rows=source.map(r=>Object.fromEntries(columns.map(c=>[c,o.trim&&typeof r[c]==='string'?r[c].trim():r[c]])));
 const reject=(row,reason)=>excluded.push({...row,_removed_reason:reason});
 if(['clean-rank','remove-duplicates','email-cleaner'].includes(id)){
  rows=rows.filter(r=>{if(columns.every(c=>empty(r[c]))){reject(r,'Blank record');return false;}return true;});
  let duplicate=o.duplicateColumn;
  if(id==='email-cleaner'){
   duplicate=checkedColumn(columns,o.emailColumn,'email',false);let invalid=0;
   rows=rows.filter(r=>{const email=string(r[duplicate]).trim();if(!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email)||email.length>254){invalid++;reject(r,'Invalid email syntax');return false;}r[duplicate]=email;return true;});
   steps.push(`Flagged ${invalid} email addresses with invalid syntax`);warnings.push('Email syntax checks do not verify mailbox existence, deliverability or consent.');
  }else checkedColumn(columns,duplicate,'duplicate key');
  const seen=new Set();let duplicates=0;
  rows=rows.filter(r=>{if(duplicate&&empty(r[duplicate]))return true;const key=duplicate?normalized(r[duplicate],o.ignoreCase):JSON.stringify(columns.map(c=>normalized(r[c],o.ignoreCase)));if(seen.has(key)){duplicates++;reject(r,'Duplicate record');return false;}seen.add(key);return true;});
  steps.push(`Removed ${duplicates} duplicates using ${duplicate||'all columns'} (kept the first record)`);
 }
 if(id==='clean-rank'){
  checkedColumn(columns,o.rankColumn,'ranking');
  if(o.rankColumn){
   if(o.minScore!==''&&o.minScore!=null){const minimum=numberValue(o.minScore);if(minimum===null)throw new Error('Minimum score must be numeric or blank.');rows=rows.filter(r=>{const score=numberValue(r[o.rankColumn]);if(score===null||score<minimum){reject(r,score===null?'Missing / non-numeric score':`Score below ${minimum}`);return false;}return true;});steps.push(`Kept numeric scores of ${minimum} or higher`);}
   rows=sortRows(rows,o.rankColumn,o.direction);steps.push(`Sorted by ${o.rankColumn}, ${o.direction==='asc'?'lowest':'highest'} first`);
  }else warnings.push('No score column selected. Records were cleaned, but no ranking or score threshold was applied.');
  const limit=limitValue(o.limit);rows.slice(limit).forEach(r=>reject(r,'Outside result limit'));rows=rows.slice(0,limit);
 }
 else if(id==='filter-sort'){
  if(o.filterColumn){const beforeFilter=rows;if(o.operator==='gte'||o.operator==='lte'){if(numberValue(o.filterValue)===null)throw new Error('Numeric filters need a numeric value.');}checkedColumn(columns,o.filterColumn,'filter');const value=string(o.filterValue);rows=rows.filter(r=>{const raw=r[o.filterColumn],a=normalized(raw,o.ignoreCase),b=normalized(value,o.ignoreCase);switch(o.operator){case'contains':return a.includes(b);case'equals':return a===b;case'not-equals':return a!==b;case'empty':return empty(raw);case'not-empty':return !empty(raw);case'gte':case'lte':{const n=numberValue(raw),v=numberValue(value);if(v===null)throw new Error('Numeric filters need a numeric value.');return n!==null&&(o.operator==='gte'?n>=v:n<=v);}default:throw new Error('Choose a valid filter operator.');}});const kept=new Set(rows);beforeFilter.forEach(r=>{if(!kept.has(r))reject(r,`Did not match ${o.operator} filter`);});steps.push(`Applied ${o.operator} filter to ${o.filterColumn}`);}
  if(o.rankColumn){checkedColumn(columns,o.rankColumn,'sort');rows=sortRows(rows,o.rankColumn,o.direction);}const limit=limitValue(o.limit);rows.slice(limit).forEach(r=>reject(r,'Outside result limit'));rows=rows.slice(0,limit);
 }
 else if(id==='column-picker'){
  const selected=Array.isArray(o.columns)?o.columns:columns;if(!selected.length)throw new Error('Keep at least one column.');selected.forEach(c=>checkedColumn(columns,c,'selected',false));
  const names=selected.map(c=>string(o.renames?.[c]??c).trim());if(names.some(n=>!n||n.length>200||['__proto__','constructor','prototype'].includes(n))||new Set(names).size!==names.length)throw new Error('Use unique, non-empty column names under 200 characters.');
  rows=rows.map(r=>Object.fromEntries(selected.map((c,i)=>[names[i],r[c]])));steps.push(`Selected ${selected.length} columns in the chosen order`);
 }
 else if(id==='data-summary'){
  if(o.groupColumn){checkedColumn(columns,o.groupColumn,'group',false);checkedColumn(columns,o.valueColumn,'numeric value',false);const groups=new Map();let invalid=0;for(const r of rows){const key=string(r[o.groupColumn])||'(blank)',v=numberValue(r[o.valueColumn]);if(!groups.has(key))groups.set(key,{group:key,count:0,numeric_count:0,total:0,average:null});const g=groups.get(key);g.count++;if(v!==null){g.total+=v;g.numeric_count++;}else invalid++;}rows=[...groups.values()].map(g=>({...g,average:g.numeric_count?g.total/g.numeric_count:null}));if(invalid)warnings.push(`${invalid} missing/non-numeric values excluded from numeric totals and averages.`);steps.push(`Grouped by ${o.groupColumn}; summarized ${o.valueColumn}`);}
  else{rows=columns.map(column=>{const filled=source.map(r=>r[column]).filter(v=>!empty(v)),numbers=filled.map(numberValue).filter(v=>v!==null);return{column,non_empty:filled.length,missing:initialCount-filled.length,unique:new Set(filled.map(string)).size,numeric_values:numbers.length,min:numbers.length?Math.min(...numbers):'',max:numbers.length?Math.max(...numbers):'',average:numbers.length?numbers.reduce((a,b)=>a+b,0)/numbers.length:''};});steps.push('Calculated per-column completeness and numeric statistics');}
 }
 else if(!['remove-duplicates','email-cleaner','format-converter'].includes(id))throw new Error('This tool cannot run in the local engine.');
 steps.push('Original input left unchanged');
 return table(rows,[stat('Input records',initialCount),stat('Result records',rows.length),stat('Columns',Object.keys(rows[0]||{}).length),stat('Removed records',excluded.length)]);
}
