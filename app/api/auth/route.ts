import {env} from '@/lib/server-env';
import {storage} from '@/lib/storage';
import {authHeaders,credentialVersion,digest,hex,isAdmin,sameOrigin,SESSION_SECONDS,sessionCookie,sessionToken,subject,verifyPassword} from '@/lib/admin-auth';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const admin=await isAdmin(req);return Response.json({role:admin?'admin':'viewer',username:admin?env.ORBIT_ADMIN_USERNAME:undefined},{headers:authHeaders});}catch{return Response.json({role:'viewer',error:'auth_unavailable'},{status:503,headers:authHeaders});}}
export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:'invalid_origin'},{status:403,headers:authHeaders});
 try{
  const raw=await req.text();if(raw.length>2048)return Response.json({error:'invalid_credentials'},{status:400,headers:authHeaders});
  let data;try{data=JSON.parse(raw) as {username:unknown;password:unknown};}catch{return Response.json({error:'invalid_credentials'},{status:400,headers:authHeaders});}
  if(typeof data.username!=='string'||typeof data.password!=='string'||data.username.length>100||!data.password.length||data.password.length>300)return Response.json({error:'invalid_credentials'},{status:400,headers:authHeaders});
  const now=Date.now(),key=await digest('login:'+await subject(req)+':'+('site-visitor'));
  const rate=await storage().prepare('INSERT INTO login_attempts (key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END RETURNING attempts,expires_at').bind(key,now+900000,now,now,now+900000).first<{attempts:number;expires_at:number}>();
  if(!rate||rate.attempts>6)return Response.json({error:'too_many_attempts'},{status:429,headers:{...authHeaders,'Retry-After':String(Math.max(1,Math.ceil(((rate?.expires_at??now+900000)-now)/1000)))}});
  if(!await verifyPassword(data.username.trim(),data.password))return Response.json({error:'invalid_credentials'},{status:401,headers:authHeaders});
  const token=hex(crypto.getRandomValues(new Uint8Array(32))),previous=sessionToken(req);
  const statements=[storage().prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(now),storage().prepare('DELETE FROM login_attempts WHERE key=? OR expires_at<=?').bind(key,now),storage().prepare('INSERT INTO admin_sessions (token_hash,subject,credential_version,expires_at) VALUES (?,?,?,?)').bind(await digest(token),await subject(req),await credentialVersion(),now+SESSION_SECONDS*1000)];
  if(previous)statements.push(storage().prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await digest(previous)));
  await storage().batch(statements);
  return Response.json({role:'admin',username:env.ORBIT_ADMIN_USERNAME},{headers:{...authHeaders,'Set-Cookie':sessionCookie(req,token)}});
 }catch{console.error('Administrator login unavailable');return Response.json({error:'auth_unavailable'},{status:503,headers:authHeaders});}
}
export async function DELETE(req:Request){
 if(!sameOrigin(req))return Response.json({error:'invalid_origin'},{status:403,headers:authHeaders});
 try{const token=sessionToken(req);if(token)await storage().prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await digest(token)).run();return Response.json({role:'viewer'},{headers:{...authHeaders,'Set-Cookie':sessionCookie(req,'',0)}});}catch{return Response.json({error:'auth_unavailable'},{status:503,headers:authHeaders});}
}
