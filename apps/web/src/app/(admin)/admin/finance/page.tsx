import type { FinanceAdminSummaryDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { fetchJson } from '@/lib/api';
import { resolveScopeSelection, withScope } from '@/lib/scope-query';
import { FinancePanel } from './panel';

async function loadSummary(token: string): Promise<FinanceAdminSummaryDTO | null> {
  try {
    return await fetchJson('/finance/admin/summary', { token });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('API 403:')) {
      return null;
    }
    throw error;
  }
}

type FinanceAdminPageProps = {
  searchParams?: Promise<{ scopeType?: string; scopeId?: string; section?: string }>;
};

export default async function FinanceAdminPage({ searchParams }: FinanceAdminPageProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; status?: string; token?: string } | undefined;
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
  const section = normalizeFinanceSection(params?.section);

  const summary = await loadSummary(user.token);
  if (!summary) {
    return (
      <div className="admin-page">
        <header className="admin-page-header">
          <p className="admin-page-kicker">Finance</p>
          <h1 className="admin-page-title">Dues, expenses, and payments</h1>
          <p className="admin-page-subtitle">
            This account does not have finance permissions yet. Ask a super admin to grant a finance role.
          </p>
        </header>
        <div className="status-banner status-banner-error">Finance access is currently restricted for your role.</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <p className="admin-page-kicker">Finance</p>
        <h1 className="admin-page-title">Dues, expenses, and payments</h1>
        <p className="admin-page-subtitle">
          Review member invoices, process expense approvals, and capture payments.
        </p>
        <p className="admin-page-subtitle">
          Need projects? Visit{' '}
          <a className="text-red-600 underline" href={withScope('/admin/projects', scope)}>
            the projects workspace
          </a>
          .
        </p>
        <p className="admin-page-subtitle">
          Need ledgers? Visit{' '}
          <a className="text-red-600 underline" href={withScope('/admin/finance/ledger', scope)}>
            the ledger workspace
          </a>
          .
        </p>
      </header>
      <FinancePanel
        summary={summary}
        authToken={user.token}
        activeScopeType={scope.scopeType}
        activeScopeId={scope.scopeId ?? null}
        initialSection={section}
        enabledSections={['reports', 'dues', 'expenses', 'payments']}
      />
    </div>
  );
}

function normalizeFinanceSection(value?: string) {
  if (value === 'reports' || value === 'dues' || value === 'expenses' || value === 'payments') {
    return value;
  }
  return 'reports';
}


