'use client';
import { useParams } from 'next/navigation';
import FlowStudio from '@/components/flows/pro/FlowStudio';
export default function FlowPage(){const {id}=useParams();return <FlowStudio flowId={id}/>;}
