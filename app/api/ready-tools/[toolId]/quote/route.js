import { withToolAuth,readJSON,quoteReadyTool } from '@/lib/readyTools/server';
export const dynamic='force-dynamic';
export const POST=withToolAuth(async(req,{params},userId)=>{
 const body=await readJSON(req);return Response.json({quote:await quoteReadyTool(userId,params.toolId,body.options||{})},{headers:{'Cache-Control':'no-store'}});
});
