import {withToolAuth,runServerTool} from '@/lib/readyTools/server';
export const runtime='nodejs';
export const maxDuration=120;
export const POST=withToolAuth(async(req,{params},userId)=>Response.json(await runServerTool(req,userId,params.toolId),{headers:{'Cache-Control':'no-store'}}));
