import { strict as assert } from 'node:assert';
import { fixture, load } from './helpers/supabase-fixture.mjs';
import { drizzle } from 'drizzle-orm/pglite';
const { pg, sql } = await fixture();
const users = new Map();
let sid = null;
const issued = new Map();
let failUpdate = false;
const provider = {
  async createUser({ email, password }) {
    if ([...users.values()].some(u => u.email === email)) return { error: { message: 'duplicate' }, data: {} };
    const id = crypto.randomUUID(); const user = { id, email, password };
    users.set(id, user); await sql`INSERT INTO auth.users(id,email) VALUES(${id},${email})`;
    return { data: { user }, error: null };
  },
  async updateUserById(id, { password }) { if (failUpdate) return { error: {} }; users.get(id).password = password; return { data: { user: users.get(id) }, error: null }; },
  async deleteUser(id) { users.delete(id); await sql`DELETE FROM auth.users WHERE id=${id}`; return { error: null }; },
};
function client(isolated = false) {
  let local = null;
  const current = () => isolated ? local : sid;
  return { auth: {
    async getUser() { const user = users.get(issued.get(current())); return { data: { user: user ? { id: user.id, email: user.email } : null }, error: null }; },
    async getClaims() { return { data: { claims: { session_id: current() } } }; },
    async signInWithPassword({ email, password }) {
      const user = [...users.values()].find(u => u.email === email && u.password === password);
      if (!user) return { error: {}, data: {} };
      const session = crypto.randomUUID(); await sql`INSERT INTO auth.sessions VALUES(${session},${user.id})`; issued.set(session, user.id);
      if (isolated) local = session; else sid = session;
      return { data: { user: { id: user.id, email: user.email } }, error: null };
    },
    async signOut({ scope = 'global' } = {}) {
      if (current()) { if (scope === 'global') await sql`DELETE FROM auth.sessions WHERE user_id=${issued.get(current())}`; else await sql`DELETE FROM auth.sessions WHERE id=${current()}`; }
      if (isolated) local = null; else sid = null;
      return { error: null };
    },
  } };
}
const createClient = async () => client();
process.env.AUTH_ORIGIN = 'https://work.example';
const sessions = load('lib/session.ts', { '../db': { database: () => sql }, './supabase/server': { createClient } });
const actor = load('lib/portal-auth.ts', { './session': sessions }).portalActor;
const auth = load('app/api/auth/route.ts', {
  '../../../lib/session': sessions, '../../../lib/supabase/server': { createClient },
  '../../../lib/supabase/admin': { adminClient: () => ({ auth: { admin: provider } }), passwordClient: () => client(true) },
  '../../../lib/password': load('lib/password.ts'),
});
const employees = load('lib/employees.ts', { '../db': { database: () => sql }, './session': sessions, './password': load('lib/password.ts'), './supabase/admin': { adminClient: () => ({ auth: { admin: provider } }) } });
const schema = load('db/schema.ts');
process.env.DATABASE_URL = 'postgresql://synthetic.invalid/test';
const { getDb } = load('db/index.ts', { postgres: { default: () => sql }, 'drizzle-orm/postgres-js': { drizzle: () => drizzle(pg, { schema }) }, './schema': schema });
const db = getDb();
const portal = load('app/api/portal/route.ts', {
  '../../../lib/session': sessions, '../../../lib/employees': employees, '../../../lib/portal-auth': { portalActor: actor },
  '../../../db': { getDb: () => db }, '../../../db/schema': schema,
  '../../../lib/task-forms': load('lib/task-forms.ts'), '../../../lib/portal-permissions': load('lib/portal-permissions.ts'),
});
const account = load('app/api/account/route.ts', { '../../../lib/session': sessions });
const forms = load('lib/task-forms.ts');
const workspace = load('app/api/workspace/route.ts', {
  '../../../lib/session': sessions, '../../../lib/portal-auth': { portalActor: actor }, '../../../db': { getDb: () => db },
  '../../../db/schema': schema, '../../../lib/task-forms': forms, '../../../lib/workspace-policy': load('lib/workspace-policy.ts'),
});
const post = (api, input, origin = process.env.AUTH_ORIGIN) => api.POST(new Request(process.env.AUTH_ORIGIN + '/api/test', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.4' }, body: JSON.stringify(input) }));
const password = 'synthetic password fixture 123';
try {
  assert.equal((await post(auth, { action: 'setup', password })).status, 403);
  assert.equal((await post(auth, { action: 'login', email: 'owner@example.test', password }, 'https://other.test')).status, 403);
  assert.equal(await actor(), null);
  const owner = (await provider.createUser({ email: 'owner@example.test', password })).data.user;
  await sql`INSERT INTO portal_accounts(id,email,role,must_change_password) VALUES(${owner.id},${owner.email},'admin',false)`;
  assert.equal((await post(auth, { action: 'login', email: owner.email, password: 'wrong password 123' })).status, 401);
  assert.equal((await post(auth, { action: 'login', email: owner.email, password })).status, 200);
  assert.equal((await actor()).admin, true); const adminSession = sid;
  assert.equal((await post(portal, { action: 'add_member', name: 'Employee', email: 'employee@example.test', temporaryPassword: password })).status, 200);
  const employee = (await sql`SELECT * FROM portal_accounts WHERE role='employee'`)[0];
  assert.ok(employee.must_change_password);
  assert.equal((await post(auth, { action: 'login', email: employee.email, password })).status, 200);
  assert.equal(await actor(), null);
  assert.equal((await post(auth, { action: 'change_password', currentPassword: 'wrong password 123', password: 'replacement password 456' })).status, 400);
  assert.equal((await post(auth, { action: 'change_password', currentPassword: password, password: 'replacement password 456' })).status, 200);
  assert.equal((await post(auth, { action: 'login', email: employee.email, password })).status, 401);
  assert.equal((await post(auth, { action: 'login', email: employee.email, password: 'replacement password 456' })).status, 200);
  assert.equal((await actor()).memberId, employee.member_id); const employeeSession = sid;
  // Preserve real portal workflows against the new PostgreSQL schema/transactions.
  sid = adminSession;
  const formSchema = forms.standardTaskForm();
  assert.equal((await post(portal, { action: 'create_task', title: 'Migration fixture', description: 'Synthetic assignment', assigneeId: employee.member_id, priority: 'normal', dueDate: '2026-11-10', formSchema })).status, 200);
  const task = (await sql`SELECT * FROM tasks`)[0];
  assert.equal((await post(portal, { action: 'add_checklist', id: task.id, title: 'Check the result' })).status, 200);
  assert.equal((await post(workspace, { action: 'save_resource', kind: 'guide', title: 'Fixture guide', category: 'General', body: 'Read the task instructions', url: '' })).status, 200);
  sid = employeeSession;
  const answers = { fields: { workCompleted: 'Completed', result: 'Completed as instructed', findings: 'Checked', exceptions: '' }, rows: [] };
  assert.equal((await post(workspace, { action: 'save_task_form', taskId: task.id, mode: 'draft', answers })).status, 200);
  assert.equal((await post(workspace, { action: 'save_task_form', taskId: task.id, mode: 'submit', answers })).status, 200);
  assert.equal((await sql`SELECT status FROM tasks WHERE id=${task.id}`)[0].status, 'review');
  assert.equal((await sql`SELECT * FROM work_submissions`).length, 1);
  assert.equal((await post(portal, { action: 'review_task', id: task.id, decision: 'approve', feedback: 'Approved' })).status, 403);
  assert.equal((await post(workspace, { action: 'save_profile', name: 'Employee updated', timezone: 'Asia/Karachi', bio: '', skills: 'Support', availability: 'Weekdays' })).status, 200);
  assert.equal((await post(workspace, { action: 'create_request', category: 'general', subject: 'Fixture request', body: 'Need guidance' })).status, 200);
  const request = (await sql`SELECT * FROM employee_requests`)[0];
  const personal = await (await workspace.GET(new Request('https://work.example/api/workspace?memberId=ignored'))).json();
  assert.equal(personal.member.id, employee.member_id); assert.equal(personal.submissions.length, 1); assert.equal(personal.resources.length, 1);
  sid = adminSession;
  assert.equal((await post(workspace, { action: 'reply_request', id: request.id, status: 'resolved', reply: 'Instructions supplied' })).status, 200);
  assert.equal((await post(portal, { action: 'review_task', id: task.id, decision: 'approve', feedback: 'Approved' })).status, 200);
  assert.equal((await sql`SELECT status FROM tasks WHERE id=${task.id}`)[0].status, 'completed');
  const resource = (await sql`SELECT id FROM workspace_resources`)[0];
  assert.equal((await post(workspace, { action: 'toggle_resource', id: resource.id, active: 'no' })).status, 200);
  await sql`INSERT INTO applications(id,name,email,country,role,availability,experience,created_at) VALUES('fixture-candidate','Candidate','candidate@example.test','PK','Support','Weekdays','Synthetic','2026-11-05')`;
  assert.equal((await post(portal, { action: 'update_candidate', id: 'fixture-candidate', stage: 'shortlisted', notes: 'Follow up' })).status, 200);
  assert.equal((await sql`SELECT stage FROM applications`)[0].stage, 'shortlisted');
  sid = employeeSession;
  assert.equal((await post(workspace, { action: 'save_task_form', taskId: task.id, mode: 'draft', answers })).status, 400);
  assert.equal((await post(portal, { action: 'reset_password', id: employee.member_id, temporaryPassword: password })).status, 403);
  assert.equal((await account.GET()).status, 403);
  sid = adminSession;
  assert.equal((await post(portal, { action: 'reset_password', id: employee.member_id, temporaryPassword: 'new temporary password 789' })).status, 200);
  sid = employeeSession; assert.equal(await sessions.session(), null);
  assert.equal((await post(auth, { action: 'login', email: employee.email, password: 'new temporary password 789' })).status, 200);
  assert.ok((await sessions.session()).must_change_password); const resetSession = sid;
  sid = adminSession;
  assert.equal((await post(portal, { action: 'toggle_member', id: employee.member_id, active: 'no' })).status, 200);
  sid = resetSession; assert.equal(await sessions.session(), null);
  sid = adminSession; assert.equal((await post(portal, { action: 'toggle_member', id: employee.member_id, active: 'yes' })).status, 200);
  sid = resetSession; assert.equal(await sessions.session(), null);
  sid = adminSession;
  const profile = { displayName: 'Workspace owner', fullName: 'Synthetic Administrator', jobTitle: 'Operations', phone: '', timezone: 'Asia/Karachi', bio: 'Fixture' };
  assert.equal((await post(account, { ...profile, role: 'employee' })).status, 400);
  assert.equal((await post(account, { ...profile, email: 'other@example.test' })).status, 400);
  assert.equal((await post(account, profile)).status, 200);
  assert.equal((await (await account.GET()).json()).profile.displayName, profile.displayName);
  assert.equal((await actor()).admin, true);
  failUpdate = true;
  assert.equal((await post(portal, { action: 'reset_password', id: employee.member_id, temporaryPassword: password })).status, 400);
  assert.ok((await sql`SELECT must_change_password FROM portal_accounts WHERE id=${employee.id}`)[0].must_change_password);
  assert.equal((await post(auth, { action: 'logout' })).status, 200);
  sid = adminSession; assert.equal(await actor(), null);
  await sql`DELETE FROM portal_limits`;
  for (let i = 0; i < 8; i++) assert.equal((await post(auth, { action: 'login', email: 'missing@example.test', password })).status, 401);
  assert.equal((await post(auth, { action: 'login', email: 'missing@example.test', password })).status, 429);
  console.log('Supabase portal integration checks passed with a provider test double and real PostgreSQL migrations/queries: login, forced change, employee management, task draft/submission/approval, requests, resources, candidates, revocation, profile tampering and rate limits.');
} finally { await pg.close(); }
