import ToolCreditConfig from '@/models/ToolCreditConfig';
import AutomationCreditPolicy from '@/models/AutomationCreditPolicy';
import { NODE_TYPES } from '@/components/flows/nodeTypesConfig';
import { CREDIT_PREFIX, EXTRA_NODES, DEFAULT_POLICY, checkedCost } from './pricing.mjs';
export const AUTOMATION_NODES=[...NODE_TYPES.filter(n=>n.type!=='utility.note'&&n.capability!=='planned').map(n=>({type:n.type,label:n.label,category:n.category})),...EXTRA_NODES];
export const AUTOMATION_SEED=AUTOMATION_NODES.map(n=>({toolId:CREDIT_PREFIX+n.type,label:n.label,costType:'fixed',cost:1}));
/** Idempotent upgrade: insert missing prices without resetting existing admin prices. */
export async function ensureAutomationPrices() {
 await ToolCreditConfig.init();
 try{await ToolCreditConfig.bulkWrite(AUTOMATION_SEED.map(row=>({updateOne:{filter:{toolId:row.toolId},update:{$setOnInsert:row},upsert:true}})),{ordered:false});}
 catch(e){if(e.code!==11000 && !e.writeErrors?.every(w=>w.code===11000))throw e;}
 try{await AutomationCreditPolicy.updateOne({_id:'automation'},{$setOnInsert:{...DEFAULT_POLICY,revision:1}},{upsert:true});}catch(e){if(e.code!==11000)throw e;}
}
export async function automationPricing() {
 // Deliberately no in-process price cache: multi-instance deployments see admin edits.
 let [docs,policy]=await Promise.all([ToolCreditConfig.find({toolId:{$in:AUTOMATION_SEED.map(s=>s.toolId)}}).lean(),AutomationCreditPolicy.findById('automation').lean()]);
 if(docs.length<AUTOMATION_SEED.length||!policy){await ensureAutomationPrices();[docs,policy]=await Promise.all([ToolCreditConfig.find({toolId:{$in:AUTOMATION_SEED.map(s=>s.toolId)}}).lean(),AutomationCreditPolicy.findById('automation').lean()]);}
 const now=new Date(),costs={};
 for(const doc of docs){const cost=doc.effectiveAt&&new Date(doc.effectiveAt)<=now&&doc.scheduledCost!=null?doc.scheduledCost:doc.cost;costs[doc.toolId]={...doc,cost:checkedCost(cost)};}
 if(docs.length!==AUTOMATION_SEED.length)throw new Error('Automation pricing could not be initialized');
 return {costs,policy:{...DEFAULT_POLICY,...policy},nodes:AUTOMATION_NODES};
}
