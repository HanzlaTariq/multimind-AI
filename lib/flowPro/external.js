import FlowCredential from '@/models/FlowCredential';
import { decryptText } from '@/lib/encryption';
import { generateText } from '@/lib/aiProviders';
import { executeNode } from '@/lib/flowNodes/registry';
import { getFreshAccessToken, gmailSendHtml } from '@/lib/googleClient';
import { safeHttp } from './safeHttp.mjs';
import { parseJSON } from './expressions.mjs';
import { assertId } from './server';
const scrubSecret=(value,secret)=>JSON.parse(JSON.stringify(value).split(JSON.stringify(secret).slice(1,-1)).join('[REDACTED]').split(Buffer.from(secret).toString('base64')).join('[REDACTED]'));
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function executeExternal(type,config,context){
 let credential=null,secret=null;
 if(config.credentialId){assertId(config.credentialId);credential=await FlowCredential.findOne({_id:config.credentialId,user:context.userId}).select('+secret');if(!credential)throw new Error('Credential not found or access denied');secret=decryptText(credential.secret);if(secret==='[decryption failed]')throw new Error('Credential decryption failed. Verify ENCRYPTION_KEY.');}
 try {
  if(type==='action.http'){
   const headers={...(config.headers||{})};if(credential?.type==='bearer')headers.Authorization=`Bearer ${secret}`;else if(credential?.type==='basic')headers.Authorization=`Basic ${Buffer.from(secret).toString('base64')}`;else if(credential?.type==='header')headers[credential.headerName]=secret;else if(credential)throw new Error('Choose a bearer, basic or header credential for HTTP requests');
   const allowedHosts=(process.env.FLOW_HTTP_ALLOWED_HOSTS||'').split(',').map(s=>s.trim()).filter(Boolean);
   const response=await safeHttp(config.url,{method:config.method||'GET',headers,body:config.body,timeoutMs:config.timeoutMs,signal:context.signal,allowedHosts});
   // A diagnostic endpoint may echo a credential under a non-obvious field.
   return {output:secret?scrubSecret(response,secret):response,message:'HTTP request completed'};
  }
  if(type==='action.slack'||type==='action.discord'){
   const expected=type==='action.slack'?'slackWebhook':'discordWebhook';if(!secret||credential?.type!==expected)throw new Error(`Choose a ${expected} credential`);
   const allowedHosts=type==='action.slack'?['hooks.slack.com']:['discord.com','discordapp.com'];const body=type==='action.slack'?{text:String(config.text||'')}:{content:String(config.text||'').slice(0,2000)};
   await safeHttp(secret,{method:'POST',body,signal:context.signal,allowedHosts});return {output:{sent:true,channel:type.split('.')[1]},message:'Notification sent'};
  }
  if(type==='action.telegram'){
   if(!secret||credential?.type!=='telegram')throw new Error('Choose a Telegram bot-token credential');if(!/^\d+:[\w-]+$/.test(secret))throw new Error('Invalid Telegram bot token');
   const response=await safeHttp(`https://api.telegram.org/bot${secret}/sendMessage`,{method:'POST',body:{chat_id:config.chatId,text:String(config.text||'').slice(0,4096)},signal:context.signal,allowedHosts:['api.telegram.org']});return {output:{sent:true,messageId:response.body?.result?.message_id},message:'Telegram message sent'};
  }
  if(type==='action.email'){
   if(!config.connectionId||!config.to||!config.subject)throw new Error('Google account, recipient and subject are required');
   const accessToken=await getFreshAccessToken(config.connectionId,context.userId);await gmailSendHtml({accessToken,to:config.to,subject:config.subject,html:`<div style="white-space:pre-wrap">${escapeHtml(config.text||'')}</div>`});return {output:{sent:true,to:config.to},message:'Email sent'};
  }
  if(type==='ai.prompt'||type==='ai.classify'||type==='ai.summarize'){
   let prompt=config.prompt,system=config.systemPrompt||'You are a helpful assistant.';
   if(type==='ai.classify'){system='Return only a JSON object with one field: label. The label must exactly match one of the permitted labels.';prompt=`Allowed labels: ${config.labels}\nText: ${typeof config.text==='object'?JSON.stringify(config.text):config.text}`;}
   if(type==='ai.summarize'){system='Summarize accurately. Do not invent facts.';prompt=`Summarize in about ${Math.min(1000,Number(config.words)||100)} words:\n${typeof config.text==='object'?JSON.stringify(config.text):config.text}`;}
   if(config.outputFormat==='json')system+=' Return valid JSON only, without markdown code fences.';
   const text=await generateText(typeof prompt==='object'?JSON.stringify(prompt):String(prompt||''),system);
   const output=config.outputFormat==='json'||type==='ai.classify'?parseJSON(text.replace(/^```(?:json)?\s*|\s*```$/g,''),'AI response'):text;
   if(type==='ai.classify'&&!String(config.labels).split(',').map(x=>x.trim()).includes(output.label))throw new Error('The AI returned a label outside the permitted list');
   return {output,message:'AI response generated'};
  }
  return await executeNode(type,config,context);
 }catch(e){let message=e.message||'External action failed';if(secret)message=message.split(secret).join('[REDACTED]');return {error:message};}
}
