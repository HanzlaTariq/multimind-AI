import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
const ipv4Block=new BlockList();
const ipv6Block=new BlockList();
const globalIPv6=new BlockList();globalIPv6.addSubnet('2000::',3,'ipv6');
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])ipv4Block.addSubnet(address,prefix,'ipv4');
for(const [address,prefix] of [['::',128],['::1',128],['::ffff:0:0',96],['64:ff9b::',96],['100::',64],['2001:db8::',32],['2002::',16],['fc00::',7],['fe80::',10],['ff00::',8]])ipv6Block.addSubnet(address,prefix,'ipv6');
// Keep address families separate: BlockList maps IPv4 into ::ffff:0:0/96.
export function isPublicAddress(address){
 const family=isIP(address);
 if(family===4)return !ipv4Block.check(address,'ipv4');
 if(family===6)return globalIPv6.check(address,'ipv6')&&!ipv6Block.check(address,'ipv6');
 return false;
}
export function validateHttpUrl(value,allowedHosts=[]){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443'))throw new Error('Only HTTPS on port 443 without URL credentials is allowed');const host=url.hostname.toLowerCase();if(!allowedHosts.map(h=>h.toLowerCase()).includes(host))throw new Error(`Host ${host} is not approved. Add it to FLOW_HTTP_ALLOWED_HOSTS on the server.`);if(isIP(host.replace(/^\[|\]$/g,'')))throw new Error('Use a public DNS hostname, not an IP literal');return url;}
export async function safeHttp(value,{method='GET',headers={},body,timeoutMs=15000,signal,allowedHosts=[]}={}){
 const url=validateHttpUrl(value,allowedHosts);if(!['GET','POST','PUT','PATCH','DELETE','HEAD'].includes(method))throw new Error('Unsupported HTTP method');
 const addresses=await lookup(url.hostname,{all:true,verbatim:true});if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))throw new Error('Private, loopback and reserved network destinations are blocked');
 const payload=body===undefined||['GET','HEAD'].includes(method)?undefined:typeof body==='string'?body:JSON.stringify(body);if(payload&&Buffer.byteLength(payload)>262144)throw new Error('HTTP request body exceeds 256 KB');
 const clean={};for(const[k,v]of Object.entries(headers)){if(/^(host|connection|content-length|transfer-encoding|proxy-authorization|cookie)$/i.test(k))throw new Error(`Header ${k} is not allowed`);clean[k]=String(v);}
 if(payload&&!Object.keys(clean).some(k=>k.toLowerCase()==='content-type'))clean['Content-Type']='application/json';
 return new Promise((resolve,reject)=>{
  // Pin the checked DNS address into this exact request to prevent DNS rebinding.
  const selected=addresses[0];const req=https.request(url,{method,headers:clean,signal,lookup:(_host,opts,cb)=>{if(opts.all)cb(null,[selected]);else cb(null,selected.address,selected.family);}},res=>{
   const chunks=[];let bytes=0;res.on('data',chunk=>{bytes+=chunk.length;if(bytes>1048576){req.destroy(new Error('HTTP response exceeds 1 MB'));return;}chunks.push(chunk);});
   res.on('end',()=>{const text=Buffer.concat(chunks).toString('utf8');let data=text;try{data=JSON.parse(text);}catch{}if(res.statusCode>=300&&res.statusCode<400){reject(new Error('Redirects are not followed for security'));return;}if(res.statusCode>=400){reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0,250)}`));return;}resolve({status:res.statusCode,body:data});});res.on('error',reject);
  });req.setTimeout(Math.max(100,Math.min(30000,Number(timeoutMs)||15000)),()=>req.destroy(new Error('HTTP request timeout')));req.on('error',reject);if(payload)req.write(payload);req.end();
 });
}
