import {notFound} from 'next/navigation';
import ToolRunner from '@/components/ready-tools/ToolRunner';
import {getTool} from '@/lib/readyTools/catalog.mjs';
export function generateMetadata({params}){return{title:getTool(params.toolId)?.name||'Tool not found'};}
export default function ReadyToolPage({params}){if(!getTool(params.toolId))notFound();return <ToolRunner key={params.toolId} toolId={params.toolId}/>;}
