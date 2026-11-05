import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const root='.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
if(fs.existsSync(root))for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite')){
 const db=new DatabaseSync(`${root}/${file}`);db.exec('PRAGMA busy_timeout=5000');
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t=>t.name);
 if(!tables.includes('auth_accounts')){console.log('No auth_accounts in local database; left unchanged.');db.close();continue;}
 const before=db.prepare("SELECT id,email,role,password_hash FROM auth_accounts WHERE role='admin'").get();
 const counts=Object.fromEntries(['members','tasks','applications','auth_accounts'].filter(t=>tables.includes(t)).map(t=>[t,db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n]));
 if(!tables.includes('account_profiles')){db.exec('BEGIN IMMEDIATE');try{db.exec(fs.readFileSync('drizzle/0006_account_profiles.sql','utf8'));db.exec('COMMIT');console.log('Applied additive 0006 profile migration to local database.');}catch(e){db.exec('ROLLBACK');throw e;}}
 else console.log('Profile migration already applied; skipped.');
 const after=db.prepare("SELECT id,email,role,password_hash FROM auth_accounts WHERE role='admin'").get();
 const unchanged=JSON.stringify(before)===JSON.stringify(after)&&Object.entries(counts).every(([t,n])=>db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n===n);
 if(!unchanged)throw Error('Unexpected account/data change');
 console.log(JSON.stringify({adminExists:!!after,existingAdminAndDataPreserved:unchanged}));db.close();
}
