'use client';
import {useEffect,useState} from 'react';
type Profile={displayName:string;fullName:string;jobTitle:string;phone:string;timezone:string;bio:string};
export default function AccountSettings({onSaved}:{onSaved:()=>Promise<void>}){
  const [profile,setProfile]=useState<Profile|null>(null),[email,setEmail]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState(false),[changing,setChanging]=useState(false);
  async function load(){try{setError('');const r=await fetch('/api/account',{cache:'no-store'});const j=await r.json() as {error:string;profile:Profile;email:string};if(!r.ok)throw Error(j.error);setProfile(j.profile);setEmail(j.email);}catch(e){setError(e instanceof Error?e.message:'Please retry.');}}
  useEffect(()=>{void load();},[]);
  const fields=[['displayName','Display name',120],['fullName','Full name',160],['jobTitle','Job title',150],['phone','Phone',60],['timezone','Time zone (e.g. Asia/Karachi)',100]] as const;
  return <div className="account-settings">
    {error&&<p className="portal-alert" role="alert">{error}</p>}{message&&<p className="portal-toast" role="status">{message}</p>}
    {!profile?<button onClick={load}>Retry loading account</button>:<>
      <section className="portal-panel credential-card"><h2>Administrator profile</h2>
        <form onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');setMessage('');try{const r=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(profile)});const j=await r.json() as {error:string};if(!r.ok)throw Error(j.error);await onSaved();setMessage('Profile saved.');}catch(e){setError(e instanceof Error?e.message:'Please retry.');}finally{setSaving(false);}}}>
          <label>Login email<input value={email} type="email" readOnly autoComplete="username"/></label>
          <p>Email is read-only because email verification is not configured.</p><p>Role: Administrator</p>
          {fields.map(([key,label,max])=><label key={key}>{label}<input name={key} value={profile[key]} maxLength={max} required={key==='displayName'} onChange={e=>setProfile({...profile,[key]:e.target.value})}/></label>)}
          <label>About you<textarea name="bio" value={profile.bio} maxLength={1500} rows={4} onChange={e=>setProfile({...profile,bio:e.target.value})}/></label>
          <button className="portal-primary" disabled={saving}>{saving?'Saving...':'Save profile'}</button>
        </form>
      </section>
      <section className="portal-panel credential-card"><h2>Change password</h2><p>Your current password is required. Saving signs out every session, including this one.</p>
        <form onSubmit={async e=>{
          e.preventDefault();const form=e.currentTarget,values=Object.fromEntries(new FormData(form));setError('');setMessage('');
          if(values.password!==values.confirm){setError('Passwords do not match.');return;}
          setChanging(true);try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'change_password',currentPassword:values.currentPassword,password:values.password})});const j=await r.json() as {error:string;next:string};if(!r.ok)throw Error(j.error);form.reset();window.location.assign(j.next);}catch(e){setError(e instanceof Error?e.message:'Please retry.');setChanging(false);}
        }}>
          <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128}/></label>
          <label>New password (12-128 characters)<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label>
          <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label>
          <button className="portal-primary" disabled={changing}>{changing?'Changing password...':'Change password and sign out'}</button>
        </form>
      </section>
    </>}
  </div>;
}
