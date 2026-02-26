'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { buildAppUrl } from '@/lib/api';

type ResetPasswordResponse = {
  message: string;
};

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params.token;
  const initialEmail = useMemo(() => searchParams.get('email') ?? '', [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(buildAppUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          password,
          passwordConfirmation,
        }),
      });
      const data = (await response.json()) as ResetPasswordResponse;
      if (!response.ok) {
        throw new Error(data.message || 'Unable to reset password.');
      }
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell app-shell">
      <form onSubmit={handleSubmit} className="auth-card space-y-4">
        <p className="text-xs uppercase tracking-[0.18em] text-red-700">Account recovery</p>
        <h1 className="text-2xl font-semibold text-slate-900">Reset password</h1>
        <p className="text-sm text-slate-600">Enter your email and choose a new password.</p>

        {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        {message ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{message}</p>
        ) : null}

        <div>
          <label className="text-sm text-slate-700">Email</label>
          <input
            type="email"
            required
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-700">New password</label>
          <input
            type="password"
            required
            minLength={8}
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-700">Confirm new password</label>
          <input
            type="password"
            required
            minLength={8}
            className="auth-input"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="auth-btn"
        >
          {submitting ? 'Resetting...' : 'Reset password'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Go to{' '}
          <Link className="text-red-700 underline" href="/login">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}


