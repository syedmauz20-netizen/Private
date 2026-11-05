import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { configuration, session } from '../../../lib/session';
export async function GET(request: Request) {
  const origin = configuration().origin;
  const code = new URL(request.url).searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const account = await session();
      if (account) return NextResponse.redirect(new URL(account.must_change_password ? '/change-password' : '/dashboard', origin), { headers: { 'Cache-Control': 'private, no-store' } });
      await supabase.auth.signOut();
    }
  }
  return NextResponse.redirect(new URL('/login?error=authentication', origin), { headers: { 'Cache-Control': 'private, no-store' } });
}
