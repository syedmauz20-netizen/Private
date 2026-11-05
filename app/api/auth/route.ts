import { sameOrigin, rateLimit, session, database, revokeSessions } from '../../../lib/session';
import { createClient } from '../../../lib/supabase/server';
import { adminClient, passwordClient } from '../../../lib/supabase/admin';
import { validPassword } from '../../../lib/password';
const reply = (data: object, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return reply({ error: 'Invalid origin' }, 403);
    const raw = await request.text();
    if (raw.length > 8192) return reply({ error: 'Request too large' }, 413);
    const input = JSON.parse(raw);
    if (!input || typeof input !== 'object') return reply({ error: 'Invalid request' }, 400);
    if (input.action === 'setup') return reply({ error: 'Administrator setup is performed by the Supabase project owner. See SUPABASE.md.' }, 403);
    const supabase = await createClient();
    if (input.action === 'logout') {
      const account = await session();
      if (account) await revokeSessions(account.id);
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) return reply({ error: 'Sign out could not be completed.' }, 500);
      return reply({ ok: true, next: '/login' });
    }
    if (input.action === 'login') {
      const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      if (!await rateLimit(request, 'login', email)) return reply({ error: 'Too many attempts. Retry in 15 minutes.' }, 429);
      if (!validPassword(input.password) || email.length > 200) return reply({ error: 'Invalid email or password' }, 401);
      const { error } = await supabase.auth.signInWithPassword({ email, password: input.password });
      if (error) return reply({ error: 'Invalid email or password' }, 401);
      const account = await session();
      if (!account) { await supabase.auth.signOut(); return reply({ error: 'Access is not enabled for this account.' }, 403); }
      return reply({ ok: true, next: account.must_change_password ? '/change-password' : '/dashboard' });
    }
    if (input.action === 'change_password') {
      const account = await session();
      if (!account) return reply({ error: 'Sign in first' }, 401);
      if (!await rateLimit(request, 'password', account.id)) return reply({ error: 'Too many attempts. Retry in 15 minutes.' }, 429);
      if (!validPassword(input.password) || !validPassword(input.currentPassword) || input.password === input.currentPassword) return reply({ error: 'Choose a different password of 12-128 characters.' }, 400);
      const verifier = passwordClient();
      const verified = await verifier.auth.signInWithPassword({ email: account.email, password: input.currentPassword });
      if (verified.error || verified.data.user?.id !== account.id) return reply({ error: 'Current password is incorrect' }, 400);
      await verifier.auth.signOut({ scope: 'local' });
      const started = await database()`UPDATE portal_accounts SET must_change_password=true,credential_version=credential_version+1 WHERE id=${account.id} AND credential_version=${account.credential_version} RETURNING credential_version`;
      if (!started.length) return reply({ error: 'Account changed. Sign in again.' }, 409);
      await revokeSessions(account.id);
      const updated = await adminClient().auth.admin.updateUserById(account.id, { password: input.password });
      if (updated.error) throw new Error('Password update failed');
      // Catch sessions issued with the previous password while Auth was updating.
      await revokeSessions(account.id);
      const finished = await database()`UPDATE portal_accounts SET must_change_password=false WHERE id=${account.id} AND credential_version=${started[0].credential_version} RETURNING id`;
      if (!finished.length) return reply({ error: 'Account changed. Ask your administrator to reset the password.' }, 409);
      await supabase.auth.signOut({ scope: 'global' });
      return reply({ ok: true, next: '/login' });
    }
    return reply({ error: 'Unknown action' }, 400);
  } catch { return reply({ error: 'Authentication could not be completed. Check server configuration or retry.' }, 500); }
}
