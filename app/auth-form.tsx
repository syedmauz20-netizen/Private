'use client';
import { useState } from 'react';
export default function AuthForm({ mode, showSetup = false }: { mode: 'login' | 'change_password'; showSetup?: boolean }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  return <main className="auth-page"><section className="auth-card">
    <a href="/">RemoteWorkNest.</a><h1>{mode === 'login' ? 'Sign in' : 'Change your password'}</h1>
    <p>{mode === 'change_password' ? 'Your temporary password must be replaced before opening your workspace. You will sign in again after changing it.' : 'Use your work email and password.'}</p>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError('');
      const input = Object.fromEntries(new FormData(event.currentTarget));
      if (input.confirm !== undefined && input.confirm !== input.password) { setError('Passwords do not match'); setBusy(false); return; }
      try {
        const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, action: mode }) });
        const result = await response.json() as { error?: string; next: string };
        if (!response.ok) throw new Error(result.error);
        window.location.assign(result.next);
      } catch (error) { setError(error instanceof Error ? error.message : 'Please retry'); setBusy(false); }
    }}>
      {mode === 'login' && <label>Email<input type="email" name="email" autoComplete="username" required maxLength={200} /></label>}
      {mode === 'change_password' && <label>Current password<input type="password" name="currentPassword" autoComplete="current-password" required maxLength={128} /></label>}
      <label>{mode === 'login' ? 'Password' : 'New password (12-128 characters)'}<input type="password" name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={12} maxLength={128} /></label>
      {mode !== 'login' && <label>Confirm password<input type="password" name="confirm" autoComplete="new-password" required minLength={12} maxLength={128} /></label>}
      <p role="alert">{error}</p><button disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Save password'}</button>
    </form>
    {mode === 'login' && showSetup && <a href="/setup">First administrator setup</a>}
  </section></main>;
}
