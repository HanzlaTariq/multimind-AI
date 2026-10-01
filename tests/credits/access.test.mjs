/** Real authorization functions with session/account stubs; no real OAuth or DB. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
function authorize(session,account){
 const source=fs.readFileSync(new URL('../../lib/admin.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'').replace(/export async function/g,'async function');
 const fn=new Function('getServerSession','authOptions','dbConnect','User',source+'\nreturn requireAdmin;')(async()=>session,{},async()=>{}, {findById:()=>({select:()=>({lean:async()=>account})})});
 return fn();
}
test('unsigned visitor cannot use admin pricing',async()=>assert.equal((await authorize(null,null)).status,401));
test('regular account cannot become admin with a forged session role',async()=>assert.equal((await authorize({user:{id:'u',isAdmin:true}},{isAdmin:false,banned:false})).status,403));
test('revoked or missing account cannot keep administrator access',async()=>assert.equal((await authorize({user:{id:'u',isAdmin:true}},null)).status,403));
test('suspended administrator is blocked',async()=>assert.equal((await authorize({user:{id:'u',isAdmin:true}},{isAdmin:true,banned:true})).status,403));
test('current database admin role is sufficient even if old session role is false',async()=>{const session={user:{id:'u',isAdmin:false}};assert.equal(await authorize(session,{isAdmin:true,banned:false}),session);});
const flowSource=fs.readFileSync(new URL('../../lib/flowPro/server.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'').replace(/export (async )?function/g,(_,$1)=>($1||'')+'function');
const {assertSameOrigin,readJSON}=new Function('LIMITS',flowSource+'\nreturn {assertSameOrigin,readJSON};')({bytes:1024});
test('cross-site pricing and run writes are refused',()=>{assert.throws(()=>assertSameOrigin(new Request('https://site.example/api',{method:'POST',headers:{origin:'https://evil.example','sec-fetch-site':'cross-site'}})),e=>e.status===403);});
test('same-origin run writes are accepted',()=>{assert.doesNotThrow(()=>assertSameOrigin(new Request('https://site.example/api',{method:'POST',headers:{origin:'https://site.example','sec-fetch-site':'same-origin'}})));});
test('request stream is bounded even without Content-Length',async()=>{await assert.rejects(readJSON(new Request('https://site.example/api',{method:'POST',body:JSON.stringify({text:'x'.repeat(2000)})})),e=>e.status===413);});
test('raw JSON may not override object prototype keys',async()=>{await assert.rejects(readJSON(new Request('https://site.example/api',{method:'POST',body:'{"__proto__":{"admin":true}}'})),e=>e.status===400);});
test('explicit larger data-tool limit accepts validated bounded payloads',async()=>{const value=await readJSON(new Request('https://site.example/api',{method:'POST',body:JSON.stringify({text:'x'.repeat(2000)})}),{maxBytes:4096});assert.equal(value.text.length,2000);});
