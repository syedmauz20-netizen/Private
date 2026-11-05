import { strict as assert } from 'node:assert';
import { fixture } from './helpers/supabase-fixture.mjs';
const { pg, sql } = await fixture();
const admin = crypto.randomUUID(), employee = crypto.randomUUID(), other = crypto.randomUUID();
const adminSid = crypto.randomUUID(), employeeSid = crypto.randomUUID();
async function asUser(id, sid, query) {
  await pg.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: id, session_id: sid, user_metadata: { role: 'admin' }, app_metadata: { role: 'admin' } })]);
  await pg.exec('SET ROLE authenticated');
  try { return (await pg.query(query)).rows; } finally { await pg.exec('RESET ROLE'); }
}
try {
  for (const [id,email] of [[admin,'admin@example.test'],[employee,'employee@example.test'],[other,'other@example.test']]) await sql`INSERT INTO auth.users VALUES(${id},${email})`;
  await sql`INSERT INTO members(id,name,email,created_at) VALUES('m','Employee','employee@example.test','2026-11-05'),('other','Other','other@example.test','2026-11-05')`;
  await sql`INSERT INTO portal_accounts(id,email,role,member_id,must_change_password) VALUES(${admin},'admin@example.test','admin',null,false),(${employee},'employee@example.test','employee','m',false),(${other},'other@example.test','employee','other',false)`;
  await sql`INSERT INTO auth.sessions VALUES(${adminSid},${admin}),(${employeeSid},${employee})`;
  await sql`INSERT INTO tasks(id,title,description,assignee_id,priority,due_date,created_at,updated_at) VALUES('mine','Mine','Test','m','normal','2026-11-06','2026-11-05','2026-11-05'),('theirs','Theirs','Test','other','normal','2026-11-06','2026-11-05','2026-11-05')`;
  await sql`INSERT INTO applications(id,name,email,country,role,availability,experience,created_at) VALUES('cv','Candidate','candidate@example.test','PK','Support','Full','Fixture','2026-11-05')`;
  await sql`INSERT INTO workspace_resources(id,kind,title,category,body,active,created_at,updated_at) VALUES('published','guide','Guide','General','Fixture','yes','2026-11-05','2026-11-05'),('draft','guide','Draft','General','Fixture','no','2026-11-05','2026-11-05')`;
  await sql`INSERT INTO storage.objects(id,bucket_id,name) VALUES(${crypto.randomUUID()},'portal-cvs','resumes/cv/file')`;
  assert.deepEqual((await asUser(employee,employeeSid,'SELECT id FROM tasks')).map(x=>x.id), ['mine']);
  assert.deepEqual(await asUser(employee,employeeSid,'SELECT * FROM applications'), []);
  assert.deepEqual((await asUser(employee,employeeSid,'SELECT id FROM members')).map(x=>x.id), ['m']);
  assert.deepEqual((await asUser(employee,employeeSid,'SELECT id FROM workspace_resources')).map(x=>x.id), ['published']);
  assert.deepEqual(await asUser(employee,employeeSid,'SELECT * FROM storage.objects'), []);
  // Spoofed metadata cannot affect protected roles, writes or approvals.
  await assert.rejects(()=>asUser(employee,employeeSid,"UPDATE portal_accounts SET role='admin'"), /permission denied/);
  await assert.rejects(()=>asUser(employee,employeeSid,"UPDATE tasks SET status='completed'"), /permission denied/);
  await assert.rejects(()=>asUser(employee,employeeSid,"INSERT INTO portal_accounts(id,email,role) VALUES(gen_random_uuid(),'attacker@example.test','admin')"), /permission denied/);
  assert.equal((await asUser(admin,adminSid,'SELECT * FROM applications')).length,1);
  assert.equal((await asUser(admin,adminSid,'SELECT * FROM tasks')).length,2);
  assert.equal((await asUser(admin,adminSid,'SELECT * FROM storage.objects')).length,1);
  await sql`UPDATE portal_accounts SET must_change_password=true WHERE id=${employee}`;
  assert.deepEqual(await asUser(employee,employeeSid,'SELECT * FROM tasks'), []);
  await sql`UPDATE portal_accounts SET must_change_password=false WHERE id=${employee}`;
  await sql`UPDATE members SET active='no' WHERE id='m'`;
  assert.deepEqual(await asUser(employee,employeeSid,'SELECT * FROM tasks'), []);
  await sql`UPDATE members SET active='yes' WHERE id='m'`;
  await sql`INSERT INTO portal_revoked_sessions VALUES(${employeeSid},${employee})`;
  assert.deepEqual(await asUser(employee,employeeSid,'SELECT * FROM tasks'), []);
  assert.deepEqual(await asUser(employee,crypto.randomUUID(),'SELECT * FROM tasks'), []);
  await pg.exec('SET ROLE anon');
  await assert.rejects(()=>pg.query('SELECT * FROM applications'),/permission denied/);
  assert.deepEqual((await pg.query('SELECT * FROM storage.objects')).rows,[]);
  await pg.exec('RESET ROLE');
  assert.equal((await sql`SELECT public,file_size_limit FROM storage.buckets WHERE id='portal-cvs'`)[0].public,false);
  await assert.rejects(()=>sql`UPDATE portal_accounts SET role='admin',member_id=null WHERE id=${other}`,/unique/);
  console.log('PostgreSQL RLS checks passed: own-task isolation, admin-only applications/CVs, published resources, forged metadata, write/promotion denial, forced-change/disabled/revoked sessions and anonymous access. Supabase-managed schemas use minimal local fixtures.');
} finally { await pg.close(); }
