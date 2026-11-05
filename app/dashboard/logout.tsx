'use client';
export default function Logout(){return <button onClick={async()=>{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(r.ok)window.location.assign('/login');}}>Sign out</button>}
