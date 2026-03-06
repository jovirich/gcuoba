import type { BranchExecutiveSummaryDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { fetchJson, isApiErrorStatus } from '@/lib/api';
import { BranchExecutivePanel } from './panel';

async function loadSummary(userId: string, token: string): Promise<BranchExecutiveSummaryDTO> {
  return fetchJson(`/branch-executive/${userId}`, { token });
}

export default async function BranchExecutivePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; status?: string; token?: string } | undefined;
  if (!user?.id || !user.token) {
    redirect('/login');
  }

  if (user.status !== 'active') {
    redirect('/profile?pending=1');
  }

  let summary: BranchExecutiveSummaryDTO;
  try {
    summary = await loadSummary(user.id, user.token);
  } catch (error) {
    if (isApiErrorStatus(error, 403)) {
      redirect('/admin');
    }
    throw error;
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <p className="admin-page-kicker">Branch governance</p>
        <h1 className="admin-page-title">Branch executive center</h1>
        <p className="admin-page-subtitle">
          Review join requests and record leadership handovers for your branches.
        </p>
      </header>
      <BranchExecutivePanel userId={user.id} summary={summary} authToken={user.token} />
    </div>
  );
}

