import crypto from 'node:crypto';
import { withFlowAuth,httpError,readJSON,assertId } from '@/lib/flowPro/server';
import ReadyToolWorkspace from '@/models/ReadyToolWorkspace';
import ReadyToolRun from '@/models/ReadyToolRun';
import ReadyToolGate from '@/models/ReadyToolGate';
import User from '@/models/User';
import FlowCredential from '@/models/FlowCredential';
import Connection from '@/models/Connection';
import { getAvailableProviders,routeToProvider } from '@/lib/providers';
import { PROVIDER_CALLERS } from '@/lib/aiProviders';
import { resetCreditsIfNeeded } from '@/lib/plans';
import { executeExternal } from '@/lib/flowPro/external';
import { getFreshAccessToken } from '@/lib/googleClient';
import { getTool } from './catalog.mjs';
import { buildToolPrompt,sanitizePresetOptions } from './prompts.mjs';
import { matrixToRows } from './data.mjs';
export { readJSON,httpError };
export const withToolAuth=fn=>withFlowAuth(async(req,ctx,userId)=>{
 // Reject cross-site writes even if the browser happens to attach a session cookie.
 if(!['GET','HEAD'].includes(req.method)){const origin=req.headers.get('origin');const allowed=new Set([new URL(req.url).origin]);for(const value of [process.env.NEXTAUTH_URL,process.env.NEXT_PUBLIC_APP_URL]){try{if(value)allowed.add(new URL(value).origin);}catch{}}
  if(req.headers.get('sec-fetch-site')==='cross-site'||origin&&!allowed.has(origin))throw httpError('Cross-site request blocked',403);
 }
 return fn(req,ctx,userId);
});
export async function workspaceFor(userId){
 try{return await ReadyToolWorkspace.findOneAndUpdate({user:userId},{$setOnInsert:{user:userId}},{upsert:true,new:true,setDefaultsOnInsert:true}).lean();}catch(e){if(e.code===11000)return ReadyToolWorkspace.findOne({user:userId}).lean();throw e;}
}
export async function toolCapabilities(userId){
 const [connections,credentials]=await Promise.all([Connection.find({user:userId,status:'connected'}).select('platform accountName accountId name').lean(),FlowCredential.find({user:userId}).select('name type').lean()]);
 return {ai:getAvailableProviders().map(p=>({id:p.id,label:p.label,credits:p.creditCost})),connections:connections.map(c=>({id:String(c._id),service:c.platform,name:c.accountName||c.name||c.platform||'Connected account'})),credentials:credentials.map(c=>({id:String(c._id),service:c.type,name:c.name})),limits:{maxFileMB:5,maxRows:10000,maxText:30000}};
}
export async function rememberRun(userId,{id,toolId,status,rows=0,durationMs=0}){
 try{await workspaceFor(userId);await ReadyToolWorkspace.updateOne({user:userId,'preferences.rememberActivity':{$ne:false}},{$push:{recent:{$each:[{id,toolId,status,rows:Math.min(10000,Math.max(0,Number(rows)||0)),durationMs:Math.min(120000,Math.max(0,Number(durationMs)||0)),createdAt:new Date()}],$position:0,$slice:30}}});}catch(e){console.warn('[Ready tools] Activity metadata was not saved.');}
}
export async function updateWorkspace(req,userId){
 const body=await readJSON(req);await workspaceFor(userId);let update;
 if(body.action==='favorite'){if(!getTool(body.toolId))throw httpError('Unknown tool');update=body.value?{$addToSet:{favorites:body.toolId}}:{$pull:{favorites:body.toolId}};}
 else if(body.action==='preferences'){const prefs=body.preferences||{};update={$set:{}};if(typeof prefs.rememberActivity==='boolean')update.$set['preferences.rememberActivity']=prefs.rememberActivity;if(['csv','xlsx','json'].includes(prefs.defaultExport))update.$set['preferences.defaultExport']=prefs.defaultExport;if(!Object.keys(update.$set).length)throw httpError('No valid preference supplied');}
 else if(body.action==='clear-history')update={$set:{recent:[]}};
 else if(body.action==='delete-preset')update={$pull:{presets:{id:String(body.id||'')}}};
 else if(body.action==='save-preset'){
  if(!getTool(body.toolId)||typeof body.name!=='string'||!body.name.trim()||body.name.length>60)throw httpError('Choose a tool and a preset name (up to 60 characters).');
  const preset={id:crypto.randomUUID(),toolId:body.toolId,name:body.name.trim(),options:sanitizePresetOptions(body.options),createdAt:new Date()};
  const value=await ReadyToolWorkspace.findOneAndUpdate({user:userId,'presets.19':{$exists:false}},{$push:{presets:preset}},{new:true}).lean();if(!value)throw httpError('You have 20 presets. Delete an unused preset first.');return value;
 }
 else if(body.action==='record-local'){
  if(getTool(body.toolId)?.engine!=='local')throw httpError('Only local activity can be recorded here.');
  await rememberRun(userId,{id:crypto.randomUUID(),toolId:body.toolId,status:'success',rows:body.rows,durationMs:body.durationMs});return workspaceFor(userId);
 }else throw httpError('Unsupported workspace action');
 return ReadyToolWorkspace.findOneAndUpdate({user:userId},update,{new:true,runValidators:true}).lean();
}
function requiredText(value,name,max=30000){if(typeof value!=='string'||!value.trim()||value.length>max)throw httpError(`${name} is required (maximum ${max.toLocaleString()} characters).`);return value.trim();}
async function readJSONResponse(res,maxBytes=5*1024*1024){
 if(!res.body)throw httpError('The connected service returned an empty response',502);const reader=res.body.getReader(),parts=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw httpError('The sheet response is too large. Read fewer rows.',413);}parts.push(value);}}finally{reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw httpError('The connected service returned an unreadable response',502);}
}
async function runConnected(tool,input,userId,signal){
 const o=input.options||{};
 if(tool.service==='google'){
  const connectionId=requiredText(o.connectionId,'Google account',80);assertId(connectionId);const connection=await Connection.findOne({_id:connectionId,user:userId,platform:'google',status:'connected'}).lean();if(!connection)throw httpError('Connect and select your Google account in Settings → Connections.',400);
  if(tool.id==='sheets-reader'){
   let id=requiredText(o.spreadsheetId,'Spreadsheet link or ID',300);if(id.startsWith('https://')){let url;try{url=new URL(id);}catch{throw httpError('Enter a valid Google Sheets URL.');}if(url.hostname!=='docs.google.com')throw httpError('Use a docs.google.com spreadsheet link.');id=url.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)/)?.[1]||'';}
   if(!/^[A-Za-z0-9_-]{15,150}$/.test(id))throw httpError('Enter a valid spreadsheet ID or Google Sheets link.');
   const sheet=requiredText(o.sheetName||'Sheet1','Sheet tab name',80);if(/[\r\n]/.test(sheet))throw httpError('Invalid sheet tab name');const count=Number(o.rowLimit||1000);if(!Number.isInteger(count)||count<1||count>10000)throw httpError('Read between 1 and 10,000 rows.');
   const token=await getFreshAccessToken(connectionId,userId,{signal}),range=`'${sheet.replace(/'/g,"''")}'!A1:CV${count+1}`;
   const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}`,{headers:{Authorization:`Bearer ${token}`},signal,cache:'no-store'});const data=await readJSONResponse(res);
   if(!res.ok)throw httpError('Google could not read this sheet. Check the account, spreadsheet access, tab name and granted scopes.',502);
   const rows=matrixToRows(data.values||[]);return{kind:'table',rows,stats:[{label:'Rows read',value:rows.length},{label:'Columns',value:Object.keys(rows[0]).length}],report:{steps:['Read the selected Google sheet','Created a download-ready table'],warnings:[`Read up to ${count} rows and the first 100 columns. This operation did not modify the source sheet.`]}};
  }
 }
 let type,config;
 if(tool.id==='gmail-send'){
  const to=requiredText(o.to,'Recipient',254),subject=requiredText(o.subject,'Subject',200),text=requiredText(input.text,'Message',15000);
  if(!/^[^\s@<>\r\n,;]+@[^\s@<>\r\n,;]+\.[^\s@<>\r\n,;]+$/.test(to)||/[\r\n]/.test(subject))throw httpError('Use one valid recipient and a single-line subject.');
  type='action.email';config={connectionId:o.connectionId,to,subject,text};
 }else{
  const credentialId=requiredText(o.credentialId,'Saved connection',80),text=requiredText(input.text,'Message',tool.id==='discord-send'?2000:tool.id==='telegram-send'?4096:15000);
  assertId(credentialId);const credential=await FlowCredential.findOne({_id:credentialId,user:userId,type:tool.service}).lean();if(!credential)throw httpError('Choose the matching saved connection from Settings.',400);
  type={'slack-send':'action.slack','discord-send':'action.discord','telegram-send':'action.telegram'}[tool.id];config={credentialId,text};
  if(tool.id==='telegram-send'){config.chatId=requiredText(o.chatId,'Chat ID',100);if(!/^(?:-?\d+|@[A-Za-z0-9_]{5,})$/.test(config.chatId))throw httpError('Use a numeric chat ID or @channel_name.');}
 }
 const value=await executeExternal(type,config,{userId,signal});if(value.error)throw httpError('The service did not confirm delivery. Check your saved connection and destination before trying again.',502);
 return{kind:'text',text:`${tool.name}: the connected service confirmed the request.`,stats:[{label:'Status',value:'Sent'}],report:{steps:['Validated the selected connection','Submitted your confirmed message'],warnings:[]}};
}
export async function runServerTool(req,userId,toolId){
 const tool=getTool(toolId);if(!tool||tool.engine==='local')throw httpError('Choose a supported connected or AI tool.',404);
 const body=await readJSON(req),requestId=String(req.headers.get('idempotency-key')||'');if(!/^[A-Za-z0-9_-]{16,80}$/.test(requestId))throw httpError('A valid request ID is required. Refresh the page.');
 if(tool.action&&body.confirm!==true)throw httpError('Review and confirm this external action before sending.');
 const existing=await ReadyToolRun.findOne({user:userId,requestId}).lean();if(existing)throw httpError(`This request was already recorded as ${existing.status}. Check the destination or history before starting a new request.`,409);
 await ReadyToolGate.updateOne({_id:userId},{$setOnInsert:{lockUntil:new Date(0)}},{upsert:true}).catch(e=>{if(e.code!==11000)throw e;});
 const lock=await ReadyToolGate.findOneAndUpdate({_id:userId,lockUntil:{$lte:new Date()}},{$set:{owner:requestId,lockUntil:new Date(Date.now()+110000)}},{new:true});if(!lock)throw httpError('Another connected tool is running. Finish that request before starting another.',429);
 const start=Date.now();let run=null,cost=0,charged=false,completed=false,provider=null;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),80000);
 try{
  const count=await ReadyToolRun.countDocuments({user:userId,createdAt:{$gte:new Date(Date.now()-60000)}});if(count>=10)throw httpError('You reached the limit of 10 connected/AI runs per minute. Try again in a minute.',429);
  await ReadyToolRun.init();
  try{run=await ReadyToolRun.create({user:userId,requestId,toolId});}catch(e){if(e.code===11000)throw httpError('This request is already running or complete.',409);throw e;}
  let result;
  if(tool.engine==='ai'){
   const {system,prompt}=buildToolPrompt(toolId,body.text,body.options);
   let user=await User.findById(userId);if(!user)throw httpError('User account not found',404);
   const oldCredits=user.credits,oldReset=user.creditsResetAt;
   if(await resetCreditsIfNeeded(user))await User.updateOne({_id:userId,credits:oldCredits,creditsResetAt:oldReset},{$set:{credits:user.credits,creditsResetAt:user.creditsResetAt,plan:user.plan,planExpiresAt:user.planExpiresAt,lowCreditEmailSentAt:user.lowCreditEmailSentAt}});
   user=await User.findById(userId);
   provider=routeToProvider(prompt,{maxCredits:user.credits});if(!provider)throw httpError(getAvailableProviders().length?'Not enough credits. Open Settings → Plan & Billing.':'The site owner has not configured an AI provider yet.',getAvailableProviders().length?402:503);
   cost=provider.creditCost;const reserved=await User.findOneAndUpdate({_id:userId,credits:{$gte:cost}},{$inc:{credits:-cost}},{new:true});if(!reserved)throw httpError('Not enough credits for this run.',402);charged=true;
   await ReadyToolRun.updateOne({_id:run._id},{$set:{credits:cost,provider:provider.id}});
   const response=await PROVIDER_CALLERS[provider.id](prompt,[],system,{signal:controller.signal});
   if(response.status!=='ok'||!response.text?.trim())throw httpError('The AI provider did not return a result. Your credits have been returned. Check the provider configuration or try again.',502);
   result={kind:'text',text:response.text.trim(),stats:[{label:'Provider',value:provider.label},{label:'Credits used',value:cost}],report:{steps:['Validated your request',`Generated text with ${provider.label}`],warnings:['AI output can contain mistakes. Review names, facts and commitments before using or sending it.']}};
  }else result=await runConnected(tool,body,userId,controller.signal);
  completed=true;const durationMs=Date.now()-start;
  await ReadyToolRun.updateOne({_id:run._id},{$set:{status:'success',durationMs}}).catch(()=>{});
  await rememberRun(userId,{id:requestId,toolId,status:'success',rows:result.rows?.length||0,durationMs});
  return{result:{...result,durationMs},requestId,creditsUsed:cost};
 }catch(e){
  if(charged&&!completed){await User.updateOne({_id:userId},{$inc:{credits:cost}});if(run)await ReadyToolRun.updateOne({_id:run._id},{$set:{credits:0}}).catch(()=>{});}
  if(run){const status=tool.action?'uncertain':'failed';await ReadyToolRun.updateOne({_id:run._id},{$set:{status,durationMs:Date.now()-start}}).catch(()=>{});await rememberRun(userId,{id:requestId,toolId,status,durationMs:Date.now()-start});}
  if(e.name==='AbortError')throw httpError(tool.action?'The service response timed out. Delivery is uncertain; check the destination before sending again.':'The request timed out. Reserved credits were returned.',504);
  if(e.status)throw e;
  throw httpError(tool.action?'Delivery could not be confirmed. Check the destination before starting another request.':'The tool could not complete. Check the server configuration and try again.',502);
 }finally{clearTimeout(timer);await ReadyToolGate.updateOne({_id:userId,owner:requestId},{$set:{lockUntil:new Date(0)},$unset:{owner:''}}).catch(()=>{});}
}
