import Link from 'next/link';
import { fetchAppJson } from '@/lib/api';

type VerifyEmailResponse = {
  message: string;
};

type Props = {
  params: Promise<{ userId: string; hash: string }>;
};

async function verifyEmail(userId: string, hash: string): Promise<VerifyEmailResponse> {
  return fetchAppJson<VerifyEmailResponse>(`/api/auth/verify-email/${userId}/${hash}`);
}

export default async function VerifyEmailPage({ params }: Props) {
  const { userId, hash } = await params;
  let message = 'Email verified successfully.';
  let isError = false;

  try {
    const response = await verifyEmail(userId, hash);
    message = response.message;
  } catch (err) {
    isError = true;
    message = err instanceof Error ? err.message : 'Verification failed.';
  }

  return (
    <main className="auth-shell app-shell">
      <div className="auth-card space-y-4 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-red-700">Email verification</p>
        <h1 className="text-2xl font-semibold text-slate-900">Verification status</h1>
        <p className={`rounded-lg p-3 text-sm ${isError ? 'bg-rose-50 text-rose-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </p>
        <p className="text-sm text-slate-500">
          Continue to{' '}
          <Link className="text-red-700 underline" href="/login">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}


