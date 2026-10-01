import { LIMITS } from './catalog.mjs';
import { parseTable,matrixToRows,toCSV } from './data.mjs';
export function inspectZip(buffer){
 const view=new DataView(buffer);let eocd=-1;
 for(let i=buffer.byteLength-22;i>=Math.max(0,buffer.byteLength-65557);i--){if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}}
 if(eocd<0)throw new Error('This is not a readable XLSX workbook. Export it as CSV and try again.');
 const count=view.getUint16(eocd+10,true),size=view.getUint32(eocd+12,true),start=view.getUint32(eocd+16,true);
 if(count>1024||count===65535||start===0xffffffff||start+size>eocd)throw new Error('This workbook archive is too complex or uses unsupported ZIP64.');
 let p=start,total=0;
 for(let n=0;n<count;n++){
  if(p+46>buffer.byteLength||view.getUint32(p,true)!==0x02014b50)throw new Error('Invalid workbook archive directory.');
  const flags=view.getUint16(p+8,true),method=view.getUint16(p+10,true),compressed=view.getUint32(p+20,true),expanded=view.getUint32(p+24,true),nameSize=view.getUint16(p+28,true),extra=view.getUint16(p+30,true),comment=view.getUint16(p+32,true);
  if(flags&1||![0,8].includes(method))throw new Error('Encrypted or unsupported workbooks cannot be imported.');
  if(expanded>12*1024*1024||(compressed&&expanded/compressed>250))throw new Error('Workbook expansion exceeds the safe import limit. Export a smaller sheet as CSV.');
  total+=expanded;if(total>32*1024*1024)throw new Error('Expanded workbook is larger than 32 MB.');
  p+=46+nameSize+extra+comment;if(p>start+size)throw new Error('Invalid archive entry.');
 }
 return {count,expandedBytes:total};
}
function xmlDoc(text){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('XML entity declarations are not supported.');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('Workbook XML is not valid.');return doc;}
const descendants=(node,name)=>Array.from(node.getElementsByTagNameNS('*',name));
function columnIndex(ref){const match=/^([A-Z]{1,3})[1-9]\d*$/.exec(ref||'');if(!match)throw new Error('Invalid cell reference in workbook.');let value=0;for(const c of match[1])value=value*26+c.charCodeAt(0)-64;return value-1;}
export async function readExcel(file){
 const buffer=await file.arrayBuffer();inspectZip(buffer);
 const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(buffer);
 if(Object.keys(zip.files).some(n=>/vbaProject|\/embeddings\//i.test(n)))throw new Error('Macro/embedded-object workbooks are not supported. Save a data-only XLSX or CSV.');
 async function xml(path){const entry=zip.file(path);if(!entry)throw new Error('Required workbook information is missing.');const text=await entry.async('string');if(text.length>12*1024*1024)throw new Error('Workbook XML is too large.');return xmlDoc(text);}
 const workbook=await xml('xl/workbook.xml'),rels=await xml('xl/_rels/workbook.xml.rels');
 const paths=new Map(descendants(rels,'Relationship').filter(r=>r.getAttribute('TargetMode')!=='External').map(r=>{
  let target=r.getAttribute('Target')||'';target=target.startsWith('/')?target.slice(1):'xl/'+target;
  if(target.includes('..')||!/^xl\/worksheets\/[\w.\-]+\.xml$/.test(target))return[r.getAttribute('Id'),''];
  return [r.getAttribute('Id'),target];
 }));
 const sheets=descendants(workbook,'sheet').map(s=>({name:s.getAttribute('name')||'Sheet',path:paths.get(s.getAttribute('r:id')||s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'))})).filter(s=>s.path);
 if(!sheets.length)throw new Error('No readable worksheet found.');
 let shared=[];if(zip.file('xl/sharedStrings.xml'))shared=descendants(await xml('xl/sharedStrings.xml'),'si').map(si=>descendants(si,'t').map(t=>t.textContent).join(''));
 async function loadSheet(index=0){
  if(!sheets[index])throw new Error('Choose an available sheet.');const doc=await xml(sheets[index].path),matrix=[];
  const sheetRows=descendants(doc,'row');if(sheetRows.length>LIMITS.rows+1)throw new Error('Use at most 10,000 data rows per sheet.');
  let cells=0,width=0;
  for(const element of sheetRows){const row=[];for(const cell of descendants(element,'c')){
   const col=columnIndex(cell.getAttribute('r'));if(col>=LIMITS.columns)throw new Error('This sheet has more than 100 columns.');if(++cells>LIMITS.cells)throw new Error('This sheet has too many cells.');
   const type=cell.getAttribute('t'),raw=descendants(cell,'v')[0]?.textContent??'';
   let value=type==='s'?(shared[Number(raw)]??''):type==='inlineStr'?descendants(cell,'t').map(t=>t.textContent).join(''):type==='b'?raw==='1':type==='e'?`[Excel error: ${raw}]`:raw;
   if((!type||type==='n')&&raw!==''&&Number.isFinite(Number(raw)))value=Number(raw);
   if(String(value).length>LIMITS.cellChars)throw new Error('A workbook cell is too large.');row[col]=value;width=Math.max(width,col+1);
  }matrix.push(row);}
  // Fill sparse header cells so all source columns stay visible.
  if(matrix[0])matrix[0]=Array.from({length:width},(_,i)=>matrix[0][i]??'');
  return matrixToRows(matrix);
 }
 return {sheets,loadSheet,note:'Reads cached cell values, not formulas or formatting. Excel date serials remain numeric. Original workbook is not changed.'};
}
export async function importFile(file){
 if(!file||file.size>LIMITS.fileBytes)throw new Error('Choose a file of 5 MB or smaller.');const ext=file.name.split('.').pop().toLowerCase();
 if(ext==='xlsx'){const book=await readExcel(file);return{rows:await book.loadSheet(0),book};}
 if(!['csv','tsv','json','txt'].includes(ext))throw new Error('Use CSV, TSV, JSON or .xlsx. Save legacy .xls files as .xlsx or CSV first.');
 return{rows:parseTable(await file.text(),ext==='txt'?'auto':ext),book:null};
}
const escape=s=>String(s??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function excelColumn(index){let s='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
export async function exportExcel(rows){
 const {default:JSZip}=await import('jszip');const zip=new JSZip(),columns=[...new Set(rows.flatMap(Object.keys))],matrix=[columns,...rows.map(r=>columns.map(c=>r[c]))];
 const xmlRows=matrix.map((row,ri)=>`<row r="${ri+1}">${row.map((v,ci)=>{const ref=`${excelColumn(ci)}${ri+1}`;return typeof v==='number'&&Number.isFinite(v)?`<c r="${ref}"><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escape(v)}</t></is></c>`;}).join('')}</row>`).join('');
 zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
 zip.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 zip.file('xl/workbook.xml','<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Results" sheetId="1" r:id="rId1"/></sheets></workbook>');
 zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
 zip.file('xl/worksheets/sheet1.xml',`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${xmlRows}</sheetData>${columns.length?`<autoFilter ref="A1:${excelColumn(columns.length-1)}${matrix.length}"/>`:''}</worksheet>`);
 return zip.generateAsync({type:'blob',compression:'DEFLATE',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
export function saveFile(content,name,type='text/plain;charset=utf-8'){
 const blob=content instanceof Blob?content:new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export async function downloadResult(result,format,base='multimind-result'){
 if(result.kind==='table'){
  if(format==='xlsx')return saveFile(await exportExcel(result.rows),`${base}.xlsx`);
  if(format==='json')return saveFile(JSON.stringify(result.rows,null,2),`${base}.json`,'application/json');
  return saveFile(toCSV(result.rows),`${base}.csv`,'text/csv;charset=utf-8');
 }
 return saveFile(result.text||'',`${base}.${result.fileType==='json'?'json':'txt'}`);
}
