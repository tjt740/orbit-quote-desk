import {env} from './server-env';
import {storage} from './storage';
const COOKIE='orbit_admin';
export const SESSION_SECONDS=8*60*60;
export const authHeaders={'Cache-Control':'no-store'};
const encoder=new TextEncoder();
export const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const unhex=(value:string)=>Uint8Array.from(value.match(/../g)??[],b=>parseInt(b,16));
export async function digest(value:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));}
export function requestOrigin(req:Request){return process.env.ORBIT_PUBLIC_ORIGIN||new URL(new URL(req.url).protocol+'//'+(req.headers.get('host')||new URL(req.url).host)).origin;}
export function sameOrigin(req:Request){return req.headers.get('origin')===requestOrigin(req);}
export function sessionToken(req:Request){const token=req.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);return token&&/^[a-f0-9]{64}$/.test(token)?token:null;}
export function sessionCookie(req:Request,token:string,seconds=SESSION_SECONDS){return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${requestOrigin(req).startsWith('https:')?'; Secure':''}`;}
export async function subject(req:Request){void req;return digest('site-visitor');}
export async function credentialVersion(){if(!env.ORBIT_ADMIN_USERNAME||!env.ORBIT_ADMIN_PASSWORD_HASH)throw Error('Admin configuration unavailable');return digest(env.ORBIT_ADMIN_USERNAME+':'+env.ORBIT_ADMIN_PASSWORD_HASH);}
export async function isAdmin(req:Request){
 const token=sessionToken(req);if(!token)return false;
 const session=await storage().prepare('SELECT subject,credential_version,expires_at FROM admin_sessions WHERE token_hash=?').bind(await digest(token)).first<{subject:string;credential_version:string;expires_at:number}>();
 return !!session&&session.expires_at>Date.now()&&session.subject===await subject(req)&&session.credential_version===await credentialVersion();
}
export async function writeAccess(req:Request){
 if(!sameOrigin(req))return Response.json({error:'invalid_origin'},{status:403,headers:authHeaders});
 try{if(!await isAdmin(req))return Response.json({error:'admin_required'},{status:401,headers:authHeaders});return null;}catch{console.error('Administrator permission check unavailable');return Response.json({error:'auth_unavailable'},{status:503,headers:authHeaders});}
}
export async function verifyPassword(username:string,password:string){
 if(!env.ORBIT_ADMIN_USERNAME||!env.ORBIT_ADMIN_PASSWORD_HASH)throw Error('Admin configuration unavailable');
 const config=JSON.parse(env.ORBIT_ADMIN_PASSWORD_HASH) as {salt:string;hash:string};
 if(!/^[a-f0-9]{48}$/.test(config.salt)||!/^[a-f0-9]{64}$/.test(config.hash))throw Error('Invalid admin configuration');
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const actual=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(config.salt),iterations:100000,hash:'SHA-256'},key,256));
 const expected=unhex(config.hash);let mismatch=0;for(let i=0;i<32;i++)mismatch|=actual[i]^expected[i];
 return mismatch===0&&username===env.ORBIT_ADMIN_USERNAME;
}
