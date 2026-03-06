import type { DuesBroadsheetDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { DuesBroadsheetPanel } from '@/components/dues/dues-broadsheet-panel';
import { fetchJson } from '@/lib/api';
import { authOptions } from '@/lib/auth-options';
import { resolveScopeSelection, withScope } from '@/lib/scope-query';

type AdminDuesPageProps = {
  searchParams?: Promise<{ scopeType?: string; scopeId?: string }>;
};

async function loadInitial(
  token: string,
  scope: { scopeType?: 'global' | 'branch' | 'class'; scopeId?: string },
): Promise<DuesBroadsheetDTO | null> {
  const params = new URLSearchParams();
  params.set('year', String(new Date().getFullYear()));
  const endpoint = withScope('/finance/dues/broadsheet', scope);
  const path = endpoint.includes('?') ? `${endpoint}&${params.toString()}` : `${endpoint}?${params.toString()}`;
  try {
    return await fetchJson<DuesBroadsheetDTO>(path, { token });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('API 403:')) {
      return null;
    }
    throw error;
  }
}

export default async function AdminDuesPage({ searchParams }: AdminDuesPageProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; token?: string; status?: string } | undefined;
  if (!user?.id || !user.token) {
    redirect('/login');
  }
  if (user.status !== 'active') {
    redirect('/profile?pending=1');
  }

  const params = searchParams ? await searchParams : undefined;
  const scope = resolveScopeSelection({
    scopeType: params?.scopeType,
    scopeId: params?.scopeId,
  });
  if (!scope.scopeType) {
    redirect('/admin/select-scope?next=/admin/dues');
  }

  const initialData = await loadInitial(user.token, scope);
  if (!initialData) {
    return (
      <div className="admin-page">
        <header className="admin-page-header">
          <p className="admin-page-kicker">Dues</p>
          <h1 className="admin-page-title">Dues broadsheet</h1>
          <p className="admin-page-subtitle">
            This account does not have dues access for the selected scope.
          </p>
        </header>
        <div className="status-banner status-banner-error">Dues access is currently restricted for your role.</div>
      </div>
    );
  }

  const endpoint = withScope('/finance/dues/broadsheet', scope);

  return (
    <div className="admin-page space-y-6">
      <header className="admin-page-header">
        <p className="admin-page-kicker">Dues</p>
        <h1 className="admin-page-title">Dues broadsheet</h1>
        <p className="admin-page-subtitle">
          Monitor joined date, current-year dues, prior outstanding, and total balance owed by members.
        </p>
      </header>
      <DuesBroadsheetPanel
        endpoint={endpoint}
        authToken={user.token}
        initialData={initialData}
        title="Scope dues view"
        subtitle="Search and filter members by dues status."
      />
    </div>
  );
}
