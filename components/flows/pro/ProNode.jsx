'use client';
import { memo } from 'react';
import { Handle, Position, BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from 'reactflow';
import { getNodeTypeDef, getNodeSummary } from '../nodeTypesConfig';
import { getPorts } from '../../../lib/flowPro/catalog.mjs';
import { Icon, NodeIcon, Button, categoryColor, duration } from './UI';
function ProNode({id,data,selected}){
 const def=getNodeTypeDef(data.nodeType);const trigger=data.nodeType.startsWith('trigger.');const ports=getPorts({type:data.nodeType,data});const runtime=data.runtime;const summary=String(getNodeSummary(data.nodeType,data.config)||def?.description||'');
 return <div className={`fp-flow-node ${selected?'selected':''} ${data.disabled?'disabled':''} ${runtime?.status||''}`} style={{'--node-accent':categoryColor[def?.category]||'#a99aff'}}>
  <div className="fp-node-hover-tools nodrag"><Button icon="Copy" variant="ghost small" title="Duplicate node" onClick={e=>{e.stopPropagation();data.onAction?.('duplicate',id);}}/><Button icon={data.disabled?'Power':'PowerOff'} variant="ghost small" title={data.disabled?'Enable node':'Disable node'} onClick={e=>{e.stopPropagation();data.onAction?.('disable',id);}}/><Button icon="Trash2" variant="ghost small" title="Delete node" onClick={e=>{e.stopPropagation();data.onAction?.('delete',id);}}/></div>
  {!trigger&&<Handle type="target" position={Position.Left} className="fp-handle" id="in"/>}
  <div className="fp-node-top"><NodeIcon definition={def}/><div><div className="fp-node-name">{data.label||def?.label||data.nodeType}</div><div className="fp-node-type">{def?.category==='trigger'?'TRIGGER':def?.label||'Workflow step'}</div></div></div>
  <div className="fp-node-desc">{data.disabled?'Disabled · passes input through':summary}</div>
  <div className="fp-node-foot"><div className="fp-row">{runtime?<><Icon name={runtime.status==='success'?'CircleCheck':runtime.status==='failed'?'CircleAlert':'CircleMinus'} size={10}/><span>{runtime.pinned?'Pinned':runtime.mock?'Test fixture':runtime.status}</span></>:<><Icon name={def?.capability==='planned'?'Construction':def?.capability==='connected'?'Plug':'CircleDot'} size={10}/><span>{def?.capability==='planned'?'Connector placeholder':def?.capability==='connected'?'Requires connection':'Native operation'}</span></>}</div><div className="fp-row">{data.pinned&&<Icon name="Pin" size={10}/>}<span>{runtime?duration(runtime.durationMs):data.settings?.retries?`${data.settings.retries} retries`:'v2'}</span></div></div>
  {ports.map((port,index)=>{const top=ports.length===1?50:((index+1)/(ports.length+1))*100;return <span key={port}><Handle type="source" position={Position.Right} className="fp-handle" id={port} style={{top:`${top}%`}}/>{ports.length>1&&<span className={`fp-port-label ${port}`} style={{top:`${top}%`}}>{port}</span>}</span>;})}
 </div>;
}
export default memo(ProNode);
export const StickyNote=memo(function StickyNote({data,selected}){return <div className={`fp-sticky ${selected?'selected':''}`}><div className="fp-sticky-title"><Icon name="StickyNote" size={12}/>{data.label||'Canvas note'}</div>{data.config?.text||'Double-click to add a note.'}</div>;});
export function ProEdge(props){const [path,x,y]=getBezierPath(props);const {setEdges}=useReactFlow();const color=props.sourceHandleId==='true'?'#61b593':props.sourceHandleId==='false'||props.sourceHandleId==='error'?'#ca7b8c':props.selected?'#a99aff':'#68708a';return <><BaseEdge path={path} markerEnd={props.markerEnd} style={{stroke:color,strokeWidth:props.selected?2.2:1.5}}/>{(props.label||props.selected)&&<EdgeLabelRenderer><button className="fp-edge-delete nodrag nopan" title={props.selected?'Delete connection':'Connection label'} style={{transform:`translate(-50%,-50%) translate(${x}px,${y}px)`}} onClick={()=>{if(props.selected)setEdges(es=>es.filter(e=>e.id!==props.id));}}>{props.selected?'×':props.label}</button></EdgeLabelRenderer>}</>;}
