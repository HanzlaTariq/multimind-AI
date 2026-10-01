import {withToolAuth,workspaceFor,updateWorkspace} from '@/lib/readyTools/server';
export const dynamic='force-dynamic';
export const GET=withToolAuth(async(req,ctx,userId)=>Response.json({workspace:await workspaceFor(userId)},{headers:{'Cache-Control':'no-store'}}));
export const PATCH=withToolAuth(async(req,ctx,userId)=>Response.json({workspace:await updateWorkspace(req,userId)}));
