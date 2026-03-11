'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buildAppUrl } from '@/lib/api';

type ForgotPasswordResponse = {
  message: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(buildAppUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as ForgotPasswordResponse;
      if (!response.ok) {
        throw new Error(data.message || 'Unable to process password reset request.');
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process password reset request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell app-shell">
      <form onSubmit={handleSubmit} className="auth-card space-y-4">
        <p className="text-xs uppercase tracking-[0.18em] text-red-700">Account recovery</p>
        <h1 className="text-2xl font-semibold text-slate-900">Forgot password</h1>
        <p className="text-sm text-slate-600">Enter your email to generate a password reset link.</p>

        {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        {result ? (
          <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>{result.message}</p>
          </div>
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

        <button
          type="submit"
          disabled={submitting}
          className="auth-btn"
        >
          {submitting ? 'Submitting...' : 'Send reset link'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Back to{' '}
          <Link className="text-red-700 underline" href="/login">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}


