// A one-use, in-memory handoff. Never writes raw user content to browser storage.
let pending=null;
export function offerHandoff(owner,toolId,result){pending={owner,toolId,result,at:Date.now()};}
export function takeHandoff(owner,toolId){if(!pending)return null;if(pending.owner!==owner||Date.now()-pending.at>600000){pending=null;return null;}if(pending.toolId!==toolId)return null;const data=pending.result;pending=null;return data;}
