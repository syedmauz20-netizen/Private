'use client';
import {useEffect, useState} from 'react';

type Member = {id:string; name:string; email:string; active:string};
export default function EmployeeLogins({members,mutate,busy}:{members:Member[];mutate:(x:any)=>Promise<boolean>;busy:boolean}) {
  const [message,setMessage] = useState('');
  const [search,setSearch] = useState('');
  const [filter,setFilter] = useState('all');
  const [url,setUrl] = useState('/login');
  useEffect(() => setUrl(window.location.origin+'/login'), []);
  const filtered = members.filter(m => (filter==='all'||m.active===filter) && (m.name+' '+m.email).toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="login-manager-top">
      <section className="create-login-panel">
        <span className="portal-eyebrow">EMPLOYEE ACCESS / NEW LOGIN</span>
        <h2>Create employee login</h2>
        <p>Share the temporary password securely. The employee must replace it before accessing their work. Passwords cannot be viewed or recovered here.</p>
        <form onSubmit={async e => {
          e.preventDefault(); const form=e.currentTarget;
          const values=Object.fromEntries(new FormData(form));
          if(await mutate({action:'add_member',...values})) {form.reset();setMessage('Employee login created. No email was sent.');}
        }}>
          <label>Full name<input name="name" required maxLength={120}/></label>
          <label>Email<input name="email" type="email" required maxLength={200}/></label>
          <label>Temporary password<input name="temporaryPassword" type="password" required minLength={12} maxLength={128} autoComplete="new-password"/></label>
          <button className="portal-primary" disabled={busy}>Create employee login</button>
        </form>
      </section>
      <section className="employee-access-guide">
        <h2>Ready for their first sign-in.</h2>
        <ol>
          <li><b>01</b><div><strong>Create their login</strong><p>Use the employee's work email and a unique temporary password of 12-128 characters.</p></div></li>
          <li><b>02</b><div><strong>Share access privately</strong><p>Send the portal address and temporary password through your preferred secure channel. No invitation email is sent.</p></div></li>
          <li><b>03</b><div><strong>Employee chooses a password</strong><p>They must replace the temporary password before opening their assigned tasks and personal workspace.</p></div></li>
        </ol>
        <label>Employee portal URL<input readOnly value={url}/></label>
        <button className="copy-login-url" onClick={async()=>{try{await navigator.clipboard.writeText(url);setMessage('Portal link copied.');}catch{setMessage('Copy the portal URL from the field above.');}}}>Copy Portal Link</button>
      </section>
    </div>
    <p role="status" className="login-result">{message}</p>
    <div className="login-counts">
      <article><span>Total employee logins</span><b>{members.length}</b></article>
      <article><span>Active logins</span><b>{members.filter(m=>m.active==='yes').length}</b></article>
      <article><span>Disabled logins</span><b>{members.filter(m=>m.active!=='yes').length}</b></article>
    </div>
    <div className="recruit-toolbar">
      <label>Search employees<input value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <select aria-label="Filter employee login access" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All login access</option><option value="yes">Active</option><option value="no">Disabled</option></select>
    </div>
    <div className="team-grid">
      {filtered.map(m=><section className="portal-panel credential-card" key={m.id}>
        <h3>{m.name}</h3><p>{m.email} / {m.active==='yes'?'Active':'Disabled'}</p>
        <button className="login-access-toggle" disabled={busy} onClick={()=>mutate({action:'toggle_member',id:m.id,active:m.active==='yes'?'no':'yes'})}>{m.active==='yes'?'Disable login':'Enable login'}</button>
        <form onSubmit={async e=>{
          e.preventDefault(); const form=e.currentTarget;
          const temporaryPassword=new FormData(form).get('temporaryPassword');
          if(await mutate({action:'reset_password',id:m.id,temporaryPassword})) {form.reset();setMessage('Temporary password set. Previous sessions revoked. Share it securely; a password change is required.');}
        }}>
          <label>New temporary password<input type="password" name="temporaryPassword" minLength={12} maxLength={128} required autoComplete="new-password"/></label>
          <button className="portal-primary" disabled={busy}>Reset password</button>
        </form>
        <p>For existing migrated employees, reset the password to create their new login.</p>
      </section>)}
    </div>
    {!filtered.length&&<section className="portal-panel portal-empty"><h3>No employee logins found.</h3><p>Create an employee login above or adjust your filters.</p></section>}
  </>;
}
