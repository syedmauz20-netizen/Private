import { session } from './session';
export async function portalActor() {
  const account = await session();
  if (!account || account.must_change_password) return null;
  return { userId: account.id, email: account.email, displayName: account.name, admin: account.role === 'admin', memberId: account.member_id || '' };
}
