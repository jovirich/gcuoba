import type { AuditLogDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { fetchJson } from '@/lib/api';
import { buildScopeParams, resolveScopeSelection } from '@/lib/scope-query';
import { AuditLogsPanel } from './panel';

type AuditLogsAdminPageProps = {
  searchParams?: Promise<{ scopeType?: string; scopeId?: string }>;
};

export default async function AuditLogsAdminPage({ searchParams }: AuditLogsAdminPageProps) {
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
  const scopeParams = buildScopeParams(scope);
  scopeParams.set('limit', '100');

  const initialLogs = await fetchJson<AuditLogDTO[]>(`/audit-logs?${scopeParams.toString()}`, {
    token: user.token,
  });

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <p className="admin-page-kicker">Audit</p>
        <h1 className="admin-page-title">Audit logs</h1>
        <p className="admin-page-subtitle">
          Inspect action trails across branch, class, welfare, and document workflows.
        </p>
      </header>
      <AuditLogsPanel
        initialLogs={initialLogs}
        authToken={user.token}
        activeScopeType={scope.scopeType}
        activeScopeId={scope.scopeId ?? null}
      />
    </div>
  );
}

