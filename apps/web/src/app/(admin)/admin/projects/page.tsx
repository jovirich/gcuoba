import type { FinanceAdminSummaryDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { fetchJson } from '@/lib/api';
import { resolveScopeSelection, withScope } from '@/lib/scope-query';
import { FinancePanel } from '../finance/panel';

type ProjectsPageProps = {
  searchParams?: Promise<{ scopeType?: string; scopeId?: string }>;
};

async function loadSummary(
  token: string,
  scope: { scopeType?: 'global' | 'branch' | 'class'; scopeId?: string },
): Promise<FinanceAdminSummaryDTO | null> {
  try {
    return await fetchJson(withScope('/finance/admin/summary', scope), { token });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('API 403:')) {
      return null;
    }
    throw error;
  }
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; status?: string; token?: string } | undefined;
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

  const summary = await loadSummary(user.token, scope);
  if (!summary) {
    return (
      <div className="admin-page">
        <header className="admin-page-header">
          <p className="admin-page-kicker">Projects</p>
          <h1 className="admin-page-title">Projects workspace</h1>
          <p className="admin-page-subtitle">
            This account does not have projects permissions yet. Ask a super admin to grant a projects role.
          </p>
        </header>
        <div className="status-banner status-banner-error">Projects access is currently restricted for your role.</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <p className="admin-page-kicker">Projects</p>
        <h1 className="admin-page-title">Projects workspace</h1>
        <p className="admin-page-subtitle">
          Plan, track, and manage project budgets and delivery across your active scope.
        </p>
      </header>
      <FinancePanel
        summary={summary}
        authToken={user.token}
        activeScopeType={scope.scopeType}
        activeScopeId={scope.scopeId ?? null}
        initialSection="projects"
        enabledSections={['projects']}
        showSectionTabs={false}
      />
    </div>
  );
}
