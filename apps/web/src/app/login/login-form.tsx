'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

type LoginFormProps = {
  portal: 'member' | 'admin';
};

export function LoginForm({ portal }: LoginFormProps) {
  const title = portal === 'admin' ? 'Executive sign in' : 'Member sign in';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const targetUrl = portal === 'admin' ? '/admin/select-scope?next=/admin' : '/dashboard';
    const result = await signIn('credentials', {
      email,
      password,
      callbackUrl: targetUrl,
      redirect: false,
    });

    if (!result || result.error) {
      setError('Sign in failed. Check the details you provided are correct.');
      return;
    }

    window.location.assign(targetUrl);
  }

  return (
    <main className="auth-shell app-shell">
      <form onSubmit={handleSubmit} className="auth-card space-y-4">
        <p className="text-xs uppercase tracking-[0.18em] text-red-700">GCUOBA Portal</p>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">
          {portal === 'admin'
            ? 'Use your executive-enabled account to access the executive console and choose your active admin scope.'
            : 'Use your member account to access your dashboard and profile.'}
        </p>
        {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        <div>
          <label className="text-sm text-slate-700">Email</label>
          <input
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm text-slate-700">Password</label>
          <input
            type="password"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="auth-btn">
          Sign in
        </button>
        <p className="text-center text-sm text-slate-500">
          Forgot password?{' '}
          <Link className="text-red-700 underline" href="/forgot-password">
            Reset it here
          </Link>
        </p>
        <p className="text-center text-sm text-slate-500">
          Need a member account?{' '}
          <Link className="text-red-700 underline" href="/register">
            Register here
          </Link>
        </p>
        <p className="text-center text-sm text-slate-500">
          Switch portal:{' '}
          <Link
            className="text-red-700 underline"
            href={portal === 'admin' ? '/login?portal=member' : '/login?portal=admin'}
          >
            {portal === 'admin' ? 'Member sign in' : 'Executive sign in'}
          </Link>
        </p>
      </form>
    </main>
  );
}

