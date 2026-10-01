import { LIMITS } from './catalog.mjs';
export const unsafeKey=key=>['__proto__','constructor','prototype'].includes(key);
export function parseSafeJSON(text){return JSON.parse(text,(key,value)=>{if(unsafeKey(key))throw new Error('Reserved object keys are not allowed in uploaded data.');return value;});}
export function scalar(value){if(value==null)return '';if(typeof value==='object')return JSON.stringify(value);return value;}
export function validateRows(rows){
 if(!Array.isArray(rows))throw new Error('Your data must be a list of records.');
 if(!rows.length)throw new Error('No data rows found. Add a header row and at least one record.');
 if(rows.length>LIMITS.rows)throw new Error(`Use at most ${LIMITS.rows.toLocaleString()} rows per file.`);
 const columns=[...new Set(rows.flatMap(row=>{if(!row||typeof row!=='object'||Array.isArray(row))throw new Error('Each row must be an object with named columns.');return Object.keys(row);}))];
 if(!columns.length)throw new Error('No columns found.');
 if(columns.length>LIMITS.columns||columns.length*rows.length>LIMITS.cells)throw new Error(`Use at most ${LIMITS.columns} columns and ${LIMITS.cells.toLocaleString()} cells.`);
 if(columns.some(c=>unsafeKey(c)||c.length>200))throw new Error('A column name is reserved or longer than 200 characters. Rename it and try again.');
 return rows.map(row=>Object.fromEntries(columns.map(c=>{const v=scalar(row[c]);if(String(v).length>LIMITS.cellChars)throw new Error(`A cell exceeds ${LIMITS.cellChars.toLocaleString()} characters.`);return[c,v];})));
}
export function matrixToRows(matrix){
 if(!Array.isArray(matrix)||matrix.length<2)throw new Error('Include a header row and at least one data row.');
 const used=new Set();const headers=matrix[0].map((h,i)=>{let base=String(h??'').replace(/^\uFEFF/,'').trim()||`column_${i+1}`;if(unsafeKey(base))throw new Error('Rename reserved column headers before importing.');let name=base,n=2;while(used.has(name))name=`${base}_${n++}`;used.add(name);return name;});
 const nonblank=matrix.slice(1).filter(row=>row.some(v=>String(v??'').trim()!==''));
 return validateRows(nonblank.map((row,i)=>{if(row.length>headers.length&&row.slice(headers.length).some(v=>String(v??'').trim()!==''))throw new Error(`Row ${i+2} has more fields than the header. Check the separator and quotes.`);return Object.fromEntries(headers.map((h,j)=>[h,row[j]??'']));}));
}
export function detectDelimiter(text){
 let quoted=false,line='';for(let i=0;i<text.length;i++){const c=text[i];if(c==='"')quoted=!quoted;if(!quoted&&(c==='\n'||c==='\r'))break;line+=quoted?'':c;}
 return [',','\t',';'].map(d=>[d,line.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
}
export function parseDelimited(text, delimiter=detectDelimiter(text)){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>LIMITS.fileBytes)throw new Error('Text import is limited to 5 MB.');
 text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
 function field(){row.push(cell);cell='';closed=false;if(row.length>LIMITS.columns)throw new Error('Too many columns.');}
 function record(){field();rows.push(row);row=[];if(rows.length>LIMITS.rows+1)throw new Error('More than 10,000 records. Split your file into smaller parts.');}
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
  else if(c===delimiter)field();else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;record();}
  else if(c==='"'&&!cell&&!closed)quoted=true;
  else if(closed){if(!/[ \t]/.test(c))throw new Error('Unexpected text after a quoted value. Check the CSV format.');}
  else if(c==='"')throw new Error('Unexpected quote in a CSV field. Put the complete field inside quotes.');
  else cell+=c;
  if(cell.length>LIMITS.cellChars)throw new Error('A cell is too large.');
 }
 if(quoted)throw new Error('A quoted field was not closed. Check the last quotation mark.');
 if(cell||row.length||closed)record();
 return matrixToRows(rows);
}
export function parseTable(text,format='auto'){
 const trimmed=String(text).trim();if(!trimmed)throw new Error('Paste a table or upload a file first.');
 if(new TextEncoder().encode(trimmed).length>LIMITS.fileBytes)throw new Error('Input must be 5 MB or smaller.');
 if(format==='json'||(format==='auto'&&/^[\[{]/.test(trimmed))){let value;try{value=parseSafeJSON(trimmed);}catch(e){throw new Error(`Invalid JSON: ${e.message}`);}const rows=Array.isArray(value)?value:value.rows||value.contacts||value.data;return validateRows(rows);}
 return parseDelimited(trimmed,format==='tsv'?'\t':undefined);
}
export function numberValue(value){if(typeof value==='number')return Number.isFinite(value)?value:null;if(typeof value!=='string'||!value.trim())return null;const text=value.trim();return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(text)&&Number.isFinite(Number(text))?Number(text):null;}
export function csvCell(value){
 // Prevent formula execution when a downloaded file is opened in a spreadsheet.
 let s=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);
 if(typeof value!=='number'&&/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;
 return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
}
export function toCSV(rows,{bom=true}={}){const columns=[...new Set(rows.flatMap(r=>Object.keys(r)))];return (bom?'\uFEFF':'')+[columns.map(csvCell).join(','),...rows.map(r=>columns.map(c=>csvCell(r[c])).join(','))].join('\r\n');}
