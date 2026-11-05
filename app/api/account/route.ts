import {database,session,sameOrigin,OWNER} from '../../../lib/session';
const reply=(data:object,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
async function administrator(){const a=await session();return a?.role==='admin'&&a.email===OWNER&&!a.must_change_password?a:null;}
export async function GET(){
  try{
    const a=await administrator();if(!a)return reply({error:'Administrator access required'},403);
    const profile=await database().prepare('SELECT display_name AS displayName,full_name AS fullName,job_title AS jobTitle,phone,timezone,bio FROM account_profiles WHERE account_id=?').bind(a.id).first();
    return reply({email:a.email,role:'admin',profile:profile||{displayName:'Administrator',fullName:'',jobTitle:'',phone:'',timezone:'',bio:''},emailEditable:false});
  }catch{return reply({error:'Account could not be loaded.'},500);}
}
export async function POST(req:Request){
  try{
    if(!sameOrigin(req))return reply({error:'Invalid origin'},403);
    const a=await administrator();if(!a)return reply({error:'Administrator access required'},403);
    if(Number(req.headers.get('content-length')||0)>8192)return reply({error:'Request too large'},413);
    const raw=await req.text();if(raw.length>8192)return reply({error:'Request too large'},413);
    const x=JSON.parse(raw);
    const limits={displayName:120,fullName:160,jobTitle:150,phone:60,timezone:100,bio:1500};
    // Reject unverified email/role changes even if sent directly outside the UI.
    if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!Object.hasOwn(limits,k)))return reply({error:'Only profile fields can be changed. Login email and role are read-only.'},400);
    for(const [key,max] of Object.entries(limits))if(typeof x[key]!=='string'||x[key].length>max)return reply({error:'Check profile field lengths.'},400);
    if(!x.displayName.trim())return reply({error:'Display name is required.'},400);
    if(x.timezone){try{new Intl.DateTimeFormat('en-US',{timeZone:x.timezone});}catch{return reply({error:'Enter a valid time zone, such as Asia/Karachi.'},400);}}
    await database().prepare(`INSERT INTO account_profiles (account_id,display_name,full_name,job_title,phone,timezone,bio,updated_at)
      VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET display_name=excluded.display_name,full_name=excluded.full_name,job_title=excluded.job_title,phone=excluded.phone,timezone=excluded.timezone,bio=excluded.bio,updated_at=excluded.updated_at`)
      .bind(a.id,x.displayName.trim(),x.fullName.trim(),x.jobTitle.trim(),x.phone.trim(),x.timezone.trim(),x.bio.trim(),new Date().toISOString()).run();
    return reply({ok:true});
  }catch{return reply({error:'Profile could not be saved.'},500);}
}
