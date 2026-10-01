import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Flow from '@/models/Flow';
import User from '@/models/User';
import FlowVersion from '@/models/FlowVersion';
import { validateGraph, normalizeGraph, LIMITS } from './graph.mjs';
import { NODE_TYPES } from '@/components/flows/nodeTypesConfig';
export function httpError(message,status=400){const e=new Error(message);e.status=status;return e;}
export function assertId(id){if(!mongoose.isValidObjectId(id))throw httpError('Not found',404);}
export function withFlowAuth(fn){return async(req,ctx={})=>{try{const session=await getServerSession(authOptions);if(!session?.user?.id)throw httpError('You must be signed in',401);await dbConnect();const account=await User.findById(session.user.id).select('banned').lean();if(!account||account.banned)throw httpError('Account access is unavailable',403);if(!['GET','HEAD'].includes(req.method)){assertSameOrigin(req);}return await fn(req,ctx,String(session.user.id));}catch(e){console.error('[Flow Studio]',e.message);return Response.json({error:e.status?e.message:'The request could not be completed. Check server configuration and try again.'},{status:e.status||500});}};}
export function assertSameOrigin(req){
 const allowed=new Set([new URL(req.url).origin]);for(const value of [process.env.NEXTAUTH_URL,process.env.NEXT_PUBLIC_APP_URL]){try{if(value)allowed.add(new URL(value).origin);}catch{}}
 const origin=req.headers.get('origin');if(req.headers.get('sec-fetch-site')==='cross-site'||origin&&!allowed.has(origin))throw httpError('Cross-site request blocked',403);
}
export async function readJSON(req,{maxBytes=LIMITS.bytes}={}){
 const declared=Number(req.headers.get('content-length')||0);
 if(declared>maxBytes)throw httpError(`Request exceeds ${Math.round(maxBytes/1024/1024)} MB`,413);
 const reader=req.body?.getReader();const chunks=[];let length=0;
 if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel();throw httpError(`Request exceeds ${Math.round(maxBytes/1024/1024)} MB`,413);}chunks.push(value);}}finally{reader.releaseLock();}}
 const text=Buffer.concat(chunks.map(chunk=>Buffer.from(chunk))).toString('utf8');
 if(!text.trim())return {};
 try{const value=JSON.parse(text,(key,item)=>{if(['__proto__','constructor','prototype'].includes(key))throw new Error('Unsafe key');return item;});if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Expected an object');return value;}catch{throw httpError('Invalid JSON object in request');}
}
export async function ownedFlow(id,userId,extra=''){assertId(id);const flow=await Flow.findOne({_id:id,user:userId}).select(extra);if(!flow)throw httpError('Flow not found',404);return flow;}
export function checkedGraph(value,opts={}){const graph=normalizeGraph(value);const issues=validateGraph(graph,NODE_TYPES,opts);const errors=issues.filter(p=>p.severity==='error');if(errors.length)throw httpError(errors[0].message);return graph;}
export function publicFlow(flow){const value=flow.toObject?flow.toObject():{...flow};delete value.webhookTokenHash;delete value.executionLockUntil;delete value.driveSync;return value;}
export async function saveVersion(flow,userId,label='Checkpoint'){
 const snapshot=publicFlow(flow);delete snapshot._id;delete snapshot.user;delete snapshot.createdAt;delete snapshot.updatedAt;
 const version=await FlowVersion.create({flow:flow._id,user:userId,label:String(label).slice(0,120),revision:flow.revision||1,snapshot});
 const old=await FlowVersion.find({flow:flow._id,user:userId}).sort({createdAt:-1}).skip(25).select('_id').lean();if(old.length)await FlowVersion.deleteMany({_id:{$in:old.map(v=>v._id)},user:userId});return version;
}
export function constantTimeEqual(a,b){const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);}
export function verifyCron(req){const secret=process.env.CRON_SECRET;if(!secret||!constantTimeEqual(req.headers.get('authorization')||'',`Bearer ${secret}`))throw httpError('Unauthorized',401);}
