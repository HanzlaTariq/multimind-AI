/** Minimal deterministic Mongo-style adapter for wallet contract tests. NOT a database. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { receiptFromHold } from '../../lib/automationCredits/pricing.mjs';
const copy=v=>v===undefined?undefined:structuredClone(v);
const equal=(a,b)=>a instanceof Date||b instanceof Date?new Date(a).getTime()===new Date(b).getTime():a===b;
function values(obj,path){if(!path.length)return [obj];if(Array.isArray(obj)&&!/^\d+$/.test(path[0]))return obj.flatMap(v=>values(v,path));return values(obj?.[path[0]],path.slice(1));}
function condition(all,cond){
 if(cond&&typeof cond==='object'&&!(cond instanceof Date)){
  return Object.entries(cond).every(([op,v])=>{
   if(op==='$ne')return all.every(a=>!equal(a,v));if(op==='$gte')return all.some(a=>a>=v);if(op==='$lte')return all.some(a=>a<=v);if(op==='$lt')return all.some(a=>a<v);
   if(op==='$exists')return all.some(a=>a!==undefined)===v;
   if(op==='$elemMatch')return all.some(a=>Array.isArray(a)&&a.some(x=>match(x,v)));
   throw new Error(`Unsupported mock operator: ${op}`);
  });
 }
 return all.some(v=>equal(v,cond));
}
export function match(obj,filter){return Object.entries(filter).every(([key,cond])=>key==='$or'?cond.some(c=>match(obj,c)):condition(values(obj,key.split('.')),cond));}
function paths(obj,parts,filter,options,prefix=[]){
 if(parts.length===1)return [[obj,parts[0]]];
 const [head,...tail]=parts;
 if(head==='$'){const q=filter[prefix.join('.')]?.$elemMatch;if(!q)throw new Error('Missing positional filter');const found=obj.find(v=>match(v,q));return found?paths(found,tail,filter,options,prefix):[];}
 if(head.startsWith('$[')){const name=head.slice(2,-1),q={};for(const item of options.arrayFilters||[])for(const[k,v]of Object.entries(item))if(k.startsWith(name+'.'))q[k.slice(name.length+1)]=v;return obj.filter(v=>match(v,q)).flatMap(v=>paths(v,tail,filter,options,prefix));}
 return paths(obj[head]??(obj[head]={}),tail,filter,options,[...prefix,head]);
}
export function apply(obj,update,filter,options={}){
 for(const[op,entries]of Object.entries(update))for(const[path,value]of Object.entries(entries))for(const[target,key]of paths(obj,path.split('.'),filter,options)){
  if(op==='$set')target[key]=copy(value);
  else if(op==='$inc')target[key]=(target[key]||0)+value;
  else if(op==='$pull')target[key]=(target[key]||[]).filter(v=>!match(v,value));
  else if(op==='$push'){let arr=target[key]||(target[key]=[]);if(value.$each){arr.splice(value.$position??arr.length,0,...copy(value.$each));if(value.$slice!==undefined)target[key]=arr.slice(0,value.$slice);}else arr.push(copy(value));}
  else throw new Error(`Unsupported mock update: ${op}`);
 }
}
function query(value){return {select(){return this;},lean(){return Promise.resolve(copy(value));},then(resolve,reject){return Promise.resolve(copy(value)).then(resolve,reject);}};}
export function walletFixture(balance=10,{reset=async()=>false}={}){
 const users=new Map([['user-1',{_id:'user-1',credits:balance,creditsResetAt:new Date(),plan:'free',planExpiresAt:null,lowCreditEmailSentAt:null,banned:false,automationCreditHolds:[],automationCreditReceipts:[]}]]),receipts=new Map();
 const User={findById:id=>query(users.get(id)),updateOne(filter,update,options){const row=[...users.values()].find(u=>match(u,filter));if(!row)return Promise.resolve({modifiedCount:0});apply(row,update,filter,options);return Promise.resolve({modifiedCount:1});},findOneAndUpdate(filter,update,options){const row=[...users.values()].find(u=>match(u,filter));if(row)apply(row,update,filter,options);return query(row||null);}};
 const Receipt={updateOne:async(filter,update)=>{if(!receipts.has(filter._id))receipts.set(filter._id,copy(update.$setOnInsert));},findById:id=>query(receipts.get(id)||null)};
 const source=fs.readFileSync(new URL('../../lib/automationCredits/wallet.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'').replace(/export async function/g,'async function');
 const wallet=new Function('User','AutomationCreditReceipt','resetCreditsIfNeeded','receiptFromHold','crypto',source+'\nreturn {beginMeter,closeReservation,publicBalance,recoverCreditReservations,freshCreditUser};')(User,Receipt,reset,receiptFromHold,crypto);
 return {wallet,users,receipts,user:()=>users.get('user-1')};
}
