import crypto from 'node:crypto';
import User from '@/models/User';
import AutomationCreditReceipt from '@/models/AutomationCreditReceipt';
import { resetCreditsIfNeeded } from '@/lib/plans';
import { receiptFromHold } from './pricing.mjs';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const fields='credits creditsResetAt plan planExpiresAt lowCreditEmailSentAt banned +automationCreditHolds +automationCreditReceipts';
export async function freshCreditUser(userId) {
 for(let attempt=0;attempt<5;attempt++) {
  const user=await User.findById(userId).select(fields);
  if(!user)throw fail('User account not found',404);if(user.banned)throw fail('This account is suspended',403);
  const old={credits:user.credits,creditsResetAt:user.creditsResetAt,plan:user.plan,planExpiresAt:user.planExpiresAt};
  if(!await resetCreditsIfNeeded(user))return user;
  const changed=await User.updateOne({_id:userId,...old},{$set:{credits:user.credits,creditsResetAt:user.creditsResetAt,plan:user.plan,planExpiresAt:user.planExpiresAt,lowCreditEmailSentAt:user.lowCreditEmailSentAt}});
  if(changed.modifiedCount)continue;
 }
 throw fail('Your balance is being updated. Try again.',409);
}
async function archive(userId,receipt) {
 // The wallet journal already committed atomically. An unavailable archive must
 // not turn a successful action into an error that encourages a duplicate send.
 try {await AutomationCreditReceipt.updateOne({_id:`${userId}:${receipt.key}`},{$setOnInsert:{...receipt,user:userId}},{upsert:true});}
 catch(e){console.warn('[Automation billing] Receipt archive pending:',receipt.key);}
}
export async function closeReservation(userId,key,status='complete') {
 for(let attempt=0;attempt<8;attempt++){
  const user=await User.findById(userId).select(fields);if(!user)throw fail('Account not found',404);
  const prior=user.automationCreditReceipts?.find(r=>r.key===key);if(prior){await archive(userId,prior);return prior;}
  const doc=user.automationCreditHolds?.find(h=>h.key===key);
  if(!doc){const old=await AutomationCreditReceipt.findById(`${userId}:${key}`).lean();if(old)return old;throw fail('Credit reservation is unavailable',409);}
  const hold=doc.toObject?doc.toObject():doc;
  const receipt=receiptFromHold(hold,{status,sameCycle:new Date(hold.cycle).getTime()===new Date(user.creditsResetAt).getTime()});
  // Compare revision AND credit-cycle marker; a concurrent node or monthly reset
  // makes the filter fail and is re-read, never lost or refunded twice.
  const changed=await User.updateOne({_id:userId,creditsResetAt:user.creditsResetAt,automationCreditHolds:{$elemMatch:{key,revision:hold.revision}}},{$inc:{credits:receipt.refunded},$pull:{automationCreditHolds:{key}},$push:{automationCreditReceipts:{$each:[receipt],$position:0,$slice:20}}});
  if(changed.modifiedCount){await archive(userId,receipt);return receipt;}
 }
 throw fail('Billing is still settling. Refresh credit activity before retrying.',409);
}
export async function recoverCreditReservations(userId) {
 const user=await freshCreditUser(userId);
 for(const receipt of user.automationCreditReceipts||[])await archive(userId,receipt);
 const expired=(user.automationCreditHolds||[]).filter(h=>new Date(h.expiresAt).getTime()<Date.now());
 for(const hold of expired)await closeReservation(userId,hold.key,'interrupted');
 return freshCreditUser(userId);
}
export async function beginMeter(userId,quote,{key=crypto.randomUUID(),scope,reference='',label='',maxCredits}={}) {
 if(quote.overLimit)throw fail(`This run exceeds the admin limit of ${quote.limit} credits. Reduce the workflow size or contact the administrator.`,400);
 if(maxCredits!==undefined&&(!Number.isSafeInteger(maxCredits)||maxCredits<0))throw fail('Invalid credit limit');
 if(maxCredits!==undefined&&quote.total>maxCredits)throw fail('Pricing changed or the input requires more credits. Review the updated quote and run again.',409);
 const user=await recoverCreditReservations(userId);
 const lines=new Map(quote.lines.map(l=>[l.nodeId,l]));
 const hold={key,scope,reference:String(reference),label:String(label).slice(0,120),reserved:quote.total,revision:0,cycle:user.creditsResetAt,units:[],createdAt:new Date(),expiresAt:new Date(Date.now()+10*60*1000)};
 const reserved=await User.findOneAndUpdate({_id:userId,banned:{$ne:true},credits:{$gte:hold.reserved},creditsResetAt:user.creditsResetAt,'automationCreditHolds.key':{$ne:key},'automationCreditReceipts.key':{$ne:key},'automationCreditHolds.7':{$exists:false}},{$inc:{credits:-hold.reserved},$push:{automationCreditHolds:hold}},{new:true}).select('credits');
 if(!reserved)throw fail('Not enough available credits, or too many active runs. Check Plan & Billing and active executions before retrying.',402);
 let closed=false;
 return {
  key, reserved:hold.reserved,
  async start(nodeId) {
   const line=lines.get(nodeId);if(!line||closed)return;
   const result=await User.updateOne({_id:userId,banned:{$ne:true},automationCreditHolds:{$elemMatch:{key,'units.key':{$ne:nodeId}}}},{$push:{'automationCreditHolds.$.units':{key:nodeId,type:line.type,label:line.label,cost:line.cost,status:'started'}},$inc:{'automationCreditHolds.$.revision':1}});
   if(!result.modifiedCount)throw fail('Credit reservation expired or this step was already started. Execution stopped to prevent duplicate charging.',409);
  },
  async finish(nodeId,status) {
   const line=lines.get(nodeId);if(!line||closed)return 0;
   if(!['success','failed','uncertain'].includes(status))throw fail('Invalid billing outcome');
   const result=await User.updateOne({_id:userId,automationCreditHolds:{$elemMatch:{key,units:{$elemMatch:{key:nodeId,status:'started'}}}}},{$set:{'automationCreditHolds.$[hold].units.$[unit].status':status},$inc:{'automationCreditHolds.$[hold].revision':1}},{arrayFilters:[{'hold.key':key},{'unit.key':nodeId,'unit.status':'started'}]});
   if(!result.modifiedCount)throw fail('Step billing could not be recorded. Check the execution before retrying.',409);
   return status==='failed'?0:line.cost;
  },
  async close(status='complete') {const receipt=await closeReservation(userId,key,status);closed=true;return receipt;},
 };
}
export async function publicBalance(userId) {
 const user=await recoverCreditReservations(userId);
 return {balance:user.credits,reserved:(user.automationCreditHolds||[]).reduce((n,h)=>n+h.reserved,0),activeRuns:(user.automationCreditHolds||[]).length};
}
