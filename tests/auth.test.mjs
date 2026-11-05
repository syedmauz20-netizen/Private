import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(file,custom={}){const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const exports={};new Function('require','exports',code)(n=>custom[n]??require(n),exports);return exports;}
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec(readFileSync('migration-guide/schema-fresh.sql','utf8'));sqlite.exec(readFileSync('drizzle/0005_password_auth.sql','utf8'));sqlite.exec(readFileSync('drizzle/0006_account_profiles.sql','utf8'));
const db={prepare(sql){let args=[];const stmt={bind(...values){args=values;return stmt},async first(){return sqlite.prepare(sql).get(...args)??null},async run(){if(/RETURNING/i.test(sql))return {results:sqlite.prepare(sql).all(...args),meta:{changes:1}};const r=sqlite.prepare(sql).run(...args);return {results:[],meta:{changes:Number(r.changes)}}}};return stmt;},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const stmt of statements)results.push(await stmt.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
let token='';const env={DB:db,AUTH_ORIGIN:'https://work.example',AUTH_SETUP_TOKEN:'test-setup-token-'.repeat(4)};
const passwords=load('lib/password.ts');const sessions=load('lib/session.ts',{'cloudflare:workers':{env},'next/headers':{cookies:async()=>({get:()=>token?{value:token}:undefined})}});
const auth=load('app/api/auth/route.ts',{'../../../lib/session':sessions,'../../../lib/password':passwords});
const actor=load('lib/portal-auth.ts',{'./session':sessions}).portalActor;
const password='a secure test password 713';
const post=(x,origin=env.AUTH_ORIGIN)=>auth.POST(new Request(env.AUTH_ORIGIN+'/api/auth',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.4'},body:JSON.stringify(x)}));
const capture=r=>{token=/rwn_session=([^;]*)/.exec(r.headers.get('set-cookie')||'')?.[1]||'';};
let r=await post({action:'setup',setupToken:env.AUTH_SETUP_TOKEN,password},'https://attacker.example');assert.equal(r.status,403);
r=await post({action:'setup',setupToken:'wrong',password});assert.equal(r.status,403);
r=await post({action:'setup',setupToken:env.AUTH_SETUP_TOKEN,password});assert.equal(r.status,200);
r=await post({action:'setup',setupToken:env.AUTH_SETUP_TOKEN,password});assert.equal(r.status,409);
const admin=sqlite.prepare("SELECT * FROM auth_accounts WHERE role='admin'").get();assert.notEqual(admin.password_hash,password);assert.equal(await passwords.verifyPassword('wrong',admin.password_hash),false);
assert.notEqual(await passwords.hashPassword(password),await passwords.hashPassword(password));
r=await post({action:'login',email:sessions.OWNER,password:'wrong password value'});assert.equal(r.status,401);
r=await post({action:'login',email:sessions.OWNER.toUpperCase(),password});assert.equal(r.status,200);capture(r);assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/Secure/);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);assert.equal((await actor()).admin,true);
const savedToken=token;assert.notEqual(sqlite.prepare('SELECT token_hash FROM auth_sessions').get().token_hash,token);
r=await post({action:'logout'});assert.equal(r.status,200);assert.equal(await actor(),null);token=savedToken;assert.equal(await sessions.session(),null);
sqlite.prepare('INSERT INTO members(id,name,email,created_at) VALUES (?,?,?,?)').run('m','Employee','employee@example.com',new Date().toISOString());
const h=await passwords.hashPassword(password);sqlite.prepare("INSERT INTO auth_accounts(id,email,role,member_id,password_hash) VALUES ('employee','employee@example.com','employee','m',?)").run(h);
r=await post({action:'login',email:'employee@example.com',password});assert.equal(r.status,200);assert.equal((await r.json()).next,'/change-password');capture(r);assert.ok(await sessions.session());assert.equal(await actor(),null);
r=await post({action:'change_password',currentPassword:password,password:'replacement password 921'});assert.equal(r.status,200);assert.equal(await sessions.session(),null);
r=await post({action:'login',email:'employee@example.com',password});assert.equal(r.status,401);
r=await post({action:'login',email:'employee@example.com',password:'replacement password 921'});assert.equal(r.status,200);capture(r);assert.equal((await actor()).memberId,'m');assert.equal((await actor()).admin,false);
// No stale password may mint a new session after an admin reset.
await assert.rejects(()=>sessions.newSession('employee',h));
sqlite.prepare("UPDATE members SET active='no' WHERE id='m'").run();assert.equal(await actor(),null);
r=await post({action:'login',email:'employee@example.com',password:'replacement password 921'});assert.equal(r.status,401);
sqlite.prepare("UPDATE members SET active='yes' WHERE id='m'").run();sqlite.prepare('UPDATE auth_sessions SET expires_at=0').run();assert.equal(await sessions.session(),null);
for(let i=0;i<8;i++)assert.notEqual((await post({action:'login',email:'nobody@example.com',password})).status,429);
assert.equal((await post({action:'login',email:'nobody@example.com',password})).status,429);
assert.throws(()=>sqlite.prepare("INSERT INTO auth_accounts(id,email,role,password_hash,must_change_password) VALUES ('bad','other@example.com','admin',?,0)").run(h));
console.log('Auth integration checks passed: real SQLite migrations, salted hashes, setup protection, role checks, secure cookies, hashed session tokens, logout, forced change, old-password rejection, disabled/expired sessions and rate limits.');
// Exercise the real admin account-management branch against the same SQLite database.
sqlite.prepare('DELETE FROM auth_limits').run();
r=await post({action:'login',email:sessions.OWNER,password});assert.equal(r.status,200);capture(r);
const schema=load('db/schema.ts');
const portal=load('app/api/portal/route.ts',{
 '../../../lib/session':sessions,
 '../../../lib/password':passwords,
 '../../../lib/portal-auth':{portalActor:actor},
 '../../../db':{getDb:()=>({insert:()=>({values:async()=>({})})})},
 '../../../db/schema':schema,
 '../../../lib/task-forms':load('lib/task-forms.ts'),
 '../../../lib/portal-permissions':load('lib/portal-permissions.ts'),
});
const manage=x=>portal.POST(new Request(env.AUTH_ORIGIN+'/api/portal',{method:'POST',headers:{Origin:env.AUTH_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify(x)}));
r=await manage({action:'add_member',name:'New colleague',email:'new@example.com',temporaryPassword:password});assert.equal(r.status,200);
const created=sqlite.prepare("SELECT a.*,m.name FROM auth_accounts a JOIN members m ON m.id=a.member_id WHERE a.email='new@example.com'").get();assert.equal(created.role,'employee');assert.equal(created.must_change_password,1);assert.equal(created.name,'New colleague');
const adminToken=token;
r=await post({action:'login',email:'new@example.com',password});assert.equal(r.status,200);capture(r);const employeeToken=token;
r=await manage({action:'reset_password',id:created.member_id,temporaryPassword:'reset password fixture 555'});assert.equal(r.status,403);
token=adminToken;
// Logging into another account revoked the old current session above; obtain a fresh admin session.
r=await post({action:'login',email:sessions.OWNER,password});assert.equal(r.status,200);capture(r);const activeAdmin=token;
r=await manage({action:'reset_password',id:created.member_id,temporaryPassword:'reset password fixture 555'});assert.equal(r.status,200);
token=employeeToken;assert.equal(await sessions.session(),null);
r=await post({action:'login',email:'new@example.com',password});assert.equal(r.status,401);
r=await post({action:'login',email:'new@example.com',password:'reset password fixture 555'});assert.equal(r.status,200);capture(r);assert.equal((await r.json()).next,'/change-password');const resetToken=token;
token=activeAdmin;r=await manage({action:'toggle_member',id:created.member_id,active:'no'});assert.equal(r.status,200);token=resetToken;assert.equal(await sessions.session(),null);
token=activeAdmin;r=await manage({action:'toggle_member',id:created.member_id,active:'yes'});assert.equal(r.status,200);token=resetToken;assert.equal(await sessions.session(),null);
console.log('Admin management checks passed: create employee, deny employee reset, reset/revoke old password and sessions, disable and enable without reviving sessions.');
// Settings persist only the authenticated administrator's profile, never identity or role.
const account=load('app/api/account/route.ts',{'../../../lib/session':sessions});
token=activeAdmin;
let result=await account.GET();assert.equal(result.status,200);let accountData=await result.json();assert.equal(accountData.emailEditable,false);assert.equal(accountData.email,sessions.OWNER);assert.equal(JSON.stringify(accountData).includes('password_hash'),false);
const saveProfile=x=>account.POST(new Request(env.AUTH_ORIGIN+'/api/account',{method:'POST',headers:{Origin:env.AUTH_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify(x)}));
const profile={displayName:'Workspace Owner',fullName:'Test Administrator',jobTitle:'Operations',phone:'',timezone:'Asia/Karachi',bio:'Profile fixture'};
assert.equal((await saveProfile({...profile,email:'unverified@example.com'})).status,400);
assert.equal((await saveProfile({...profile,role:'employee'})).status,400);
assert.equal((await saveProfile({...profile,timezone:'Invalid/Zone'})).status,400);
assert.equal((await saveProfile(profile)).status,200);
assert.deepEqual((await (await account.GET()).json()).profile,profile);
assert.equal((await actor()).displayName,profile.displayName);
assert.equal(sqlite.prepare('SELECT role FROM auth_accounts WHERE id=?').get(admin.id).role,'admin');
const redirect={redirect:path=>{throw Error('redirect:'+path);}};
const setupPage=load('app/setup/page.tsx',{'../auth-form':()=>null,'../../lib/session':sessions,'next/navigation':redirect}).default;
await assert.rejects(()=>setupPage(),/redirect:\/dashboard/);
const loginPage=load('app/login/page.tsx',{'../auth-form':()=>null,'../../lib/session':sessions}).default;
assert.equal((await loginPage()).props.showSetup,false);
const uninitialized=load('app/login/page.tsx',{'../auth-form':()=>null,'../../lib/session':{adminExists:async()=>false}}).default;
assert.equal((await uninitialized()).props.showSetup,true);
const emptySetup=load('app/setup/page.tsx',{'../auth-form':()=>null,'../../lib/session':{adminExists:async()=>false},'next/navigation':redirect}).default;
assert.equal((await emptySetup()).props.mode,'setup');
token='';await assert.rejects(()=>setupPage(),/redirect:\/login/);assert.equal((await account.GET()).status,403);
assert.equal((await post({action:'setup'})).status,409);
// Both employee role and anonymous access must be rejected by settings.
r=await post({action:'login',email:'employee@example.com',password:'replacement password 921'});assert.equal(r.status,200);capture(r);assert.equal((await account.GET()).status,403);assert.equal((await saveProfile(profile)).status,403);await assert.rejects(()=>setupPage(),/redirect:\/login/);
token=activeAdmin;
const secondCookie=await sessions.newSession(admin.id,admin.password_hash);const secondToken=/rwn_session=([^;]+)/.exec(secondCookie)[1];
const sessionCount=sqlite.prepare('SELECT count(*) AS n FROM auth_sessions WHERE account_id=?').get(admin.id).n;assert.ok(sessionCount>=2);
r=await post({action:'change_password',currentPassword:'incorrect current password',password:'new administrator password 951'});assert.equal(r.status,400);assert.equal(sqlite.prepare('SELECT count(*) AS n FROM auth_sessions WHERE account_id=?').get(admin.id).n,sessionCount);
r=await post({action:'change_password',currentPassword:password,password:'new administrator password 951'});assert.equal(r.status,200);assert.equal((await r.json()).next,'/login');assert.match(r.headers.get('set-cookie'),/Max-Age=0/);
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM auth_sessions WHERE account_id=?').get(admin.id).n,0);
assert.equal(await sessions.session(),null);token=secondToken;assert.equal(await sessions.session(),null);
r=await post({action:'login',email:sessions.OWNER,password});assert.equal(r.status,401);
r=await post({action:'login',email:sessions.OWNER,password:'new administrator password 951'});assert.equal(r.status,200);capture(r);assert.equal((await actor()).admin,true);assert.equal((await actor()).displayName,profile.displayName);
console.log('Account/settings checks passed: setup link visibility and redirects, repeated setup rejection, profile persistence, email/role tampering denial, current password verification, all-session revocation and admin role preservation.');
