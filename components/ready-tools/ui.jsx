'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import {useSettings} from '@/lib/SettingsContext';
import './tools.css';
export function Icon({name='Zap',size=18,...props}){const Glyph=Icons[name]||Icons.Zap;return <Glyph size={size} strokeWidth={1.8} aria-hidden="true" {...props}/>;}
export function Button({children,icon,variant='',className='',...props}){return <button type="button" className={`rt-button ${variant} ${className}`} {...props}>{icon&&<Icon name={icon} size={16}/>} {children}</button>;}
export function Notice({children,kind='info',icon}){return <div className={`rt-notice ${kind}`} role={kind==='error'?'alert':'status'}><Icon name={icon||(kind==='error'?'CircleAlert':kind==='success'?'CircleCheck':'Info')} size={17}/><div>{children}</div></div>;}
export function Dialog({title,children,onClose,footer}){
 const ref=useRef(null),onCloseRef=useRef(onClose);onCloseRef.current=onClose;
 useEffect(()=>{const previous=document.activeElement,el=ref.current;const get=()=>Array.from(el.querySelectorAll('button:not(:disabled),input,select,textarea,a[href]'));get()[0]?.focus();function key(e){if(e.key==='Escape')onCloseRef.current();if(e.key==='Tab'){const list=get();if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0]?.focus();}}}el.addEventListener('keydown',key);const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el.removeEventListener('keydown',key);document.body.style.overflow=before;previous?.focus?.();};},[]);
 return <div className="rt-dialog-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="rt-dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref}><header><h2>{title}</h2><Button icon="X" variant="icon ghost" aria-label="Close dialog" onClick={onClose}/></header><div className="rt-dialog-body">{children}</div>{footer&&<footer>{footer}</footer>}</section></div>;
}
export function ToolShell({children,title='Ready-made tools',active='tools',aside}){
 const {settings}=useSettings(),[menu,setMenu]=useState(false);
 return <div className="rt-root" data-reduce-motion={settings.reduceMotion?'true':'false'}>
  <aside className={`rt-sidebar ${menu?'open':''}`}><Link href="/dashboard/flows" className="rt-brand"><span className="rt-brand-symbol"><Icon name="Workflow" size={23}/></span><span>MultiMind<small>TOOLS & AUTOMATIONS</small></span></Link><button className="rt-mobile-close" onClick={()=>setMenu(false)} aria-label="Close menu"><Icon name="X"/></button>
   <div className="rt-workspace"><div className="rt-avatar">{(settings.preferredName||settings.name||'M').slice(0,1).toUpperCase()}</div><div><strong>{settings.preferredName||settings.name||'My workspace'}</strong><small>Your everyday advantage</small></div><Icon name="ChevronsUpDown" size={14}/></div>
   <p className="rt-nav-heading">WORKSPACE</p>
   <Link href="/dashboard/flows" className={`rt-nav-link ${active==='tools'?'active':''}`} onClick={()=>setMenu(false)}><Icon name="LayoutGrid"/>Ready-made tools<span className="rt-nav-dot"/></Link>
   <Link href="/dashboard/flows/workflows" className="rt-nav-link"><Icon name="Workflow"/>Advanced workflows<Icon name="ArrowUpRight" size={14}/></Link>
   {aside}
   <div className="rt-sidebar-bottom"><div className="rt-sidebar-tip"><Icon name="Sparkles" size={19}/><strong>Start with a tool.</strong><p>Bring your data. We’ll handle the steps. No workflow setup needed.</p></div><Link className="rt-nav-link" href="/dashboard/settings?tab=connections"><Icon name="Plug"/>Connections</Link><Link className="rt-nav-link" href="/dashboard/settings?tab=preferences"><Icon name="Settings2"/>Settings & appearance</Link><Link className="rt-nav-link" href="/dashboard"><Icon name="ArrowLeft"/>Back to dashboard</Link><div className="rt-sidebar-version"><span className="rt-dot"/> READY TOOLS · 3.0</div></div>
  </aside>
  {menu&&<button className="rt-menu-shade" aria-label="Close navigation" onClick={()=>setMenu(false)}/>}
  <div className="rt-main"><header className="rt-topbar"><Button icon="Menu" className="rt-mobile-menu" variant="icon ghost" onClick={()=>setMenu(true)} aria-label="Open navigation"/><div className="rt-breadcrumb"><Link href="/dashboard/flows">Workspace</Link><Icon name="ChevronRight" size={13}/><span>{title}</span></div><div className="rt-topbar-right"><span className="rt-theme-label"><span className="rt-dot"/>{settings.theme||'midnight'} theme</span><Link href="/dashboard/settings?tab=preferences" className="rt-icon-link" aria-label="Change theme in Settings" title="Theme is controlled in Settings"><Icon name="Settings2"/></Link><div className="rt-avatar small">{(settings.preferredName||settings.name||'M').slice(0,1).toUpperCase()}</div></div></header>{children}</div>
 </div>;
}
export async function request(url,options={}){const res=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers},cache:'no-store'});let data;try{data=await res.json();}catch{throw new Error('The server did not return a readable response. Refresh and try again.');}if(!res.ok){const err=new Error(data.error||'This request could not be completed.');err.status=res.status;throw err;}return data;}
export function useWorkspace(){
 const [workspace,setWorkspace]=useState({favorites:[],presets:[],recent:[],preferences:{rememberActivity:true,defaultExport:'csv'}}),[error,setError]=useState(''),[loading,setLoading]=useState(true),alive=useRef(true);
 async function load(){try{const data=await request('/api/ready-tools/workspace');if(alive.current){setWorkspace(data.workspace);setError('');}}catch(e){if(alive.current)setError(e.message);}finally{if(alive.current)setLoading(false);}}
 useEffect(()=>{alive.current=true;load();return()=>{alive.current=false;};},[]);
 async function update(body){try{const data=await request('/api/ready-tools/workspace',{method:'PATCH',body:JSON.stringify(body)});if(alive.current){setWorkspace(data.workspace);setError('');}return data.workspace;}catch(e){if(alive.current)setError(e.message);throw e;}}
 return{workspace,error,loading,update,reload:load};
}
export function useCapabilities(){const[data,setData]=useState({ai:[],connections:[],credentials:[]}),[error,setError]=useState(''),[loading,setLoading]=useState(true);async function refresh(){setLoading(true);try{setData(await request('/api/ready-tools/capabilities'));setError('');}catch(e){setError(e.message);}finally{setLoading(false);}}useEffect(()=>{refresh();},[]);return{data,error,loading,refresh};}
export function timeLabel(value){const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
