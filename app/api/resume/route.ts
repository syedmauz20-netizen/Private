import {env} from 'cloudflare:workers';
import {portalActor} from '../../../lib/portal-auth';
import {getDb} from '../../../db';
import {applications} from '../../../db/schema';
import {eq} from 'drizzle-orm';
import {safeResumeName} from '../../../lib/resume';
export async function GET(req:Request){const a=await portalActor();if(!a?.admin)return Response.json({error:'Superadmin access required'},{status:403});const id=new URL(req.url).searchParams.get('id');if(!id)return Response.json({error:'Missing application'},{status:400});const row=(await getDb().select().from(applications).where(eq(applications.id,id)))[0];if(!row?.resumeKey)return Response.json({error:'No résumé attached to this application'},{status:404});const obj=await (env as any).BUCKET.get(row.resumeKey);if(!obj)return Response.json({error:'File not found'},{status:404});return new Response(obj.body,{headers:{'Content-Type':row.resumeType||'application/octet-stream','Content-Disposition':'attachment; filename="'+safeResumeName(row.resumeName||'resume.pdf')+'"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}})}
