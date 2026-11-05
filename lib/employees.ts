import 'server-only';
import { database } from '../db';
import { adminClient } from './supabase/admin';
import { revokeSessions } from './session';
import { validPassword } from './password';

// Call only after the route has verified the current actor is an administrator.
export async function manageEmployee(input: { action: string; id?: string; name?: string; email?: string; active?: string; temporaryPassword?: string }) {
  const sql = database();
  if (input.action === 'add_member') {
    if (!input.name?.trim() || input.name.length > 120 || !input.email || input.email.length > 200 || !/^\S+@\S+\.\S+$/.test(input.email) || !validPassword(input.temporaryPassword)) throw new Error('Enter a valid name, email and temporary password of 12-128 characters.');
    const email = input.email.trim().toLowerCase();
    if ((await sql`SELECT id::text FROM portal_accounts WHERE lower(email)=${email} UNION ALL SELECT id FROM members WHERE lower(email)=${email}`).length) throw new Error('Account already exists.');
    const supabase = adminClient();
    const created = await supabase.auth.admin.createUser({ email, password: input.temporaryPassword, email_confirm: true });
    if (created.error || !created.data.user) throw new Error('Supabase could not create the login. Check whether that email already exists in Auth.');
    const user = created.data.user;
    try {
      await sql.begin(async tx => {
        const id = crypto.randomUUID();
        await tx`INSERT INTO members(id,name,email,user_id,created_at) VALUES(${id},${input.name!.trim()},${email},${user.id},${new Date().toISOString()})`;
        await tx`INSERT INTO portal_accounts(id,email,role,member_id,must_change_password) VALUES(${user.id},${email},'employee',${id},true)`;
      });
    } catch {
      // Compensate only the Auth user created by this attempt, never an existing user.
      const cleanup = await supabase.auth.admin.deleteUser(user.id);
      if (cleanup.error) throw new Error('Profile creation failed. Ask the Supabase operator to reconcile the new Auth user before retrying.');
      throw new Error('Employee profile could not be saved.');
    }
    return;
  }
  const account = (await sql`SELECT a.id FROM portal_accounts a JOIN members m ON m.id=a.member_id WHERE m.id=${input.id || ''} AND a.role='employee'`)[0];
  if (!account) throw new Error('Employee not found.');
  if (input.action === 'toggle_member') {
    if (!['yes', 'no'].includes(input.active || '')) throw new Error('Invalid access setting.');
    // Revoke on both transitions so old sessions never return when enabled again.
    await sql.begin(async tx => {
      await tx`UPDATE members SET active=${input.active!} WHERE id=${input.id!}`;
      await tx`INSERT INTO portal_revoked_sessions(session_id,user_id) SELECT id,user_id FROM auth.sessions WHERE user_id=${account.id} ON CONFLICT DO NOTHING`;
    });
    return;
  }
  if (input.action !== 'reset_password' || !validPassword(input.temporaryPassword)) throw new Error('Temporary password must be 12-128 characters.');
  await sql`UPDATE portal_accounts SET must_change_password=true,credential_version=credential_version+1 WHERE id=${account.id}`;
  await revokeSessions(account.id);
  const reset = await adminClient().auth.admin.updateUserById(account.id, { password: input.temporaryPassword });
  if (reset.error) throw new Error('Password reset failed. Access remains restricted; retry the reset.');
  await revokeSessions(account.id);
}
