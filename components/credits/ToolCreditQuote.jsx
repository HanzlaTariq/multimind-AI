'use client';
import { useEffect,useState,useCallback } from 'react';
import Link from 'next/link';
import { Icon,Notice,request,Button } from '@/components/ready-tools/ui';
export function useToolCreditQuote(toolId,options){
 const [state,setState]=useState({quote:null,loading:true,error:''}),[version,setVersion]=useState(0);
 const signature=JSON.stringify(options);
 const refresh=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{let alive=true;const controller=new AbortController();setState(s=>({...s,loading:true,error:''}));
  const timer=setTimeout(async()=>{try{const value=await request(`/api/ready-tools/${encodeURIComponent(toolId)}/quote`,{method:'POST',body:JSON.stringify({options:JSON.parse(signature)}),signal:controller.signal});if(alive)setState({quote:value.quote,loading:false,error:''});}catch(e){if(alive&&e.name!=='AbortError')setState({quote:null,loading:false,error:e.message});}},250);
  return()=>{alive=false;clearTimeout(timer);controller.abort();};
 },[toolId,signature,version]);
 return {...state,refresh};
}
export default function ToolCreditQuote({state}){
 const {quote,loading,error,refresh}=state;
 if(error)return <Notice kind="error">Credit pricing could not load: {error} <Button variant="link" onClick={refresh}>Retry</Button></Notice>;
 return <section className="rt-credit-panel" aria-label="Credit estimate" aria-busy={loading}>
  <div className="rt-credit-heading"><span><Icon name="Coins" size={21}/><strong>Know your cost before you run</strong></span><b>{loading?'Checking…':`${quote?.total??0} credits`}</b></div>
  {quote&&<><p>Available balance: <strong>{quote.balance}</strong> · {quote.nodeCount} processing steps · Charged from your existing MultiMind credits.</p><details><summary>View step-by-step price</summary><div className="rt-credit-lines">{quote.lines.map(l=><div key={l.nodeId}><span>{l.label}</span><strong>{l.cost} cr</strong></div>)}</div></details><p className="rt-fine-print">One charge per step, not per row. Reading the result and downloading it again are free. Running the tool again starts a new paid run.</p>{quote.balance<quote.total&&<Notice kind="warning">You need {quote.total-quote.balance} more credits. <Link href="/dashboard/settings?tab=billing">Open Plan & Billing</Link>.</Notice>}{quote.overLimit&&<Notice kind="warning">This run exceeds the administrator’s {quote.limit}-credit limit.</Notice>}</>}
 </section>;
}
