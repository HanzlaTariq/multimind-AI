import {withToolAuth,toolCapabilities} from '@/lib/readyTools/server';
export const dynamic='force-dynamic';
export const GET=withToolAuth(async(req,ctx,userId)=>Response.json(await toolCapabilities(userId),{headers:{'Cache-Control':'no-store'}}));
