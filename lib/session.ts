import 'server-only';
import { createHash } from 'node:crypto';
import { database } from '../db';
import { createClient } from './supabase/server';
export { database } from '../db';
export function configuration() {
  const value = process.env.AUTH_ORIGIN;
  if (!value) throw new Error('AUTH_ORIGIN is required');
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('HTTPS required');
  return { origin: url.origin };
}
export function sameOrigin(request: Request) { return request.headers.get('origin') === configuration().origin; }
export async function session() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data } = await supabase.auth.getClaims();
  const sid = data?.claims.session_id;
  if (typeof sid !== 'string') return null;
  const rows = await database()`
    SELECT a.id,a.email,a.role,a.member_id,a.must_change_password,a.credential_version,
           COALESCE(p.display_name,m.name,'Administrator') AS name
    FROM portal_accounts a LEFT JOIN members m ON m.id=a.member_id
    LEFT JOIN account_profiles p ON p.account_id=a.id
    WHERE a.id=${user.id} AND (a.role='admin' OR m.active='yes')
      AND EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id::text=${sid} AND s.user_id=a.id)
      AND NOT EXISTS(SELECT 1 FROM portal_revoked_sessions r WHERE r.session_id::text=${sid})`;
  const account = rows[0] as { id: string; email: string; role: string; member_id: string | null; must_change_password: boolean; credential_version: number; name: string } | undefined;
  return account && account.email.toLowerCase() === user.email?.toLowerCase() ? account : null;
}
export async function revokeSessions(userId: string) {
  await database()`INSERT INTO portal_revoked_sessions(session_id,user_id)
    SELECT id,user_id FROM auth.sessions WHERE user_id=${userId} ON CONFLICT DO NOTHING`;
}
export async function rateLimit(request: Request, label: string, identity = '') {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const window = Math.floor(Date.now() / 900000);
  const hash = (v: string) => createHash('sha256').update(v).digest('hex');
  const keys = [`${label}:ip:${hash(ip)}:${window}`, `${label}:identity:${hash(identity || ip)}:${window}`];
  return database().begin(async tx => {
    await tx`DELETE FROM portal_limits WHERE expires_at < ${Date.now()}`;
    let allowed = true;
    for (const [i, key] of keys.entries()) {
      const rows = await tx`INSERT INTO portal_limits(key,attempts,expires_at) VALUES(${key},1,${(window + 1) * 900000})
        ON CONFLICT(key) DO UPDATE SET attempts=portal_limits.attempts+1 RETURNING attempts`;
      if (rows[0].attempts > (i === 0 ? 30 : 8)) allowed = false;
    }
    return allowed;
  });
}
export async function adminExists() { return (await database()`SELECT id FROM portal_accounts WHERE role='admin' LIMIT 1`).length > 0; }
