import {database,configuration,sameOrigin,rateLimit,digest,OWNER,session,newSession,revokeCurrent,cookie} from '../../../lib/session';
import {hashPassword,verifyPassword,validPassword} from '../../../lib/password';
const reply=(data:object,status=200,extra:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...extra}});
export async function POST(req:Request){try{
 if(!sameOrigin(req))return reply({error:'Invalid origin'},403);
 if(Number(req.headers.get('content-length')||0)>8192)return reply({error:'Request too large'},413);
 const raw=await req.text();if(raw.length>8192)return reply({error:'Request too large'},413);
 const x=JSON.parse(raw);if(!x||typeof x!=='object')return reply({error:'Invalid request'},400);
 const db=database();
 if(x.action==='logout'){await revokeCurrent();return reply({ok:true,next:'/login'},200,{'Set-Cookie':cookie('',0)});}
 if(x.action==='setup'){
 if(await db.prepare("SELECT id FROM auth_accounts WHERE role='admin'").first())return reply({error:'Admin setup is already complete.'},409);
 if(!await rateLimit(req,'setup'))return reply({error:'Too many attempts. Retry in 15 minutes.'},429);
 const secret=configuration().setupToken;
 if(!secret||secret.length<32||typeof x.setupToken!=='string'||digest(x.setupToken)!==digest(secret))return reply({error:'Invalid setup token'},403);
 if(!validPassword(x.password))return reply({error:'Use a password of 12-128 characters.'},400);
 const created=await db.prepare("INSERT INTO auth_accounts (id,email,role,password_hash,must_change_password) VALUES (?,?,'admin',?,0) ON CONFLICT DO NOTHING").bind(crypto.randomUUID(),OWNER,await hashPassword(x.password)).run();
 if(!created.meta.changes)return reply({error:'Admin setup is already complete.'},409);
 return reply({ok:true,next:'/login'});
 }
 if(x.action==='login'){
 const email=typeof x.email==='string'?x.email.trim().toLowerCase():'';
 if(!await rateLimit(req,'login',email))return reply({error:'Too many attempts. Retry in 15 minutes.'},429);
 if(!validPassword(x.password)||email.length>200)return reply({error:'Invalid email or password'},401);
 const a=await db.prepare("SELECT a.* FROM auth_accounts a LEFT JOIN members m ON m.id=a.member_id WHERE a.email=? AND (a.role='admin' OR m.active='yes')").bind(email).first<{id:string;password_hash:string;must_change_password:number}>();
 // Perform the same expensive password operation for an unknown account.
 const h=a?.password_hash||'scrypt$32768$8$3$00000000000000000000000000000000$'+'0'.repeat(128);
 const valid=await verifyPassword(x.password,h);
 if(!a||!valid)return reply({error:'Invalid email or password'},401);
 await revokeCurrent();return reply({ok:true,next:a.must_change_password?'/change-password':'/dashboard'},200,{'Set-Cookie':await newSession(a.id,a.password_hash)});
 }
 if(x.action==='change_password'){
 const a=await session();if(!a)return reply({error:'Sign in first'},401);
 if(!await rateLimit(req,'password',a.id))return reply({error:'Too many attempts. Retry in 15 minutes.'},429);
 if(!validPassword(x.password)||typeof x.currentPassword!=='string'||x.currentPassword.length>128||x.password===x.currentPassword)return reply({error:'Choose a different password of 12-128 characters.'},400);
 if(!await verifyPassword(x.currentPassword,a.password_hash))return reply({error:'Current password is incorrect'},400);
 const hash=await hashPassword(x.password);
 const [result]=await db.batch([
 db.prepare('UPDATE auth_accounts SET password_hash=?,must_change_password=0 WHERE id=? AND password_hash=?').bind(hash,a.id,a.password_hash),
 db.prepare('DELETE FROM auth_sessions WHERE account_id=? AND EXISTS (SELECT 1 FROM auth_accounts WHERE id=? AND password_hash=?)').bind(a.id,a.id,hash),
 ]);
 if(!result.meta.changes)return reply({error:'Account changed. Sign in again.'},409);
 return reply({ok:true,next:'/login'},200,{'Set-Cookie':cookie('',0)});
 }
 return reply({error:'Unknown action'},400);
 }catch{return reply({error:'Authentication could not be completed. Check server configuration or retry.'},500);}}
