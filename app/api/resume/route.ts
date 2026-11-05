import {downloadUrl} from '../../../lib/storage';
import {portalActor} from '../../../lib/portal-auth';
import {getDb} from '../../../db';
import {applications} from '../../../db/schema';
import {eq} from 'drizzle-orm';
import {safeResumeName} from '../../../lib/resume';
export async function GET(req:Request){const a=await portalActor();if(!a?.admin)return Response.json({error:'Superadmin access required'},{status:403});const id=new URL(req.url).searchParams.get('id');if(!id)return Response.json({error:'Missing application'},{status:400});const row=(await getDb().select().from(applications).where(eq(applications.id,id)))[0];if(!row?.resumeKey)return Response.json({error:'No résumé attached to this application'},{status:404});return new Response(null,{status:303,headers:{Location:await downloadUrl(row.resumeKey,safeResumeName(row.resumeName||'resume.pdf'),row.resumeType||'application/octet-stream'),'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}})}
