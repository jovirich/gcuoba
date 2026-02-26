import type { AdminMemberDTO, ClassSetDTO, UserDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { fetchJson } from '@/lib/api';
import { resolveScopeSelection } from '@/lib/scope-query';
import { LedgerPanel } from './panel';

type FinanceLedgerPageProps = {
  searchParams?: Promise<{ scopeType?: string; scopeId?: string }>;
};

export default async function FinanceLedgerPage({ searchParams }: FinanceLedgerPageProps) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; token?: string; status?: string } | undefined;
  if (!sessionUser?.id || !sessionUser?.token) {
    redirect('/login');
  }

  if (sessionUser.status !== 'active') {
    redirect('/profile?pending=1');
  }

  const params = searchParams ? await searchParams : undefined;
  const scope = resolveScopeSelection({
    scopeType: params?.scopeType,
    scopeId: params?.scopeId,
  });
  const scopedMembersPath = buildScopedPath('/admin/members', scope.scopeType, scope.scopeId);

  const [members, classes] = await Promise.all([
    fetchJson<AdminMemberDTO[]>(scopedMembersPath, { token: sessionUser.token }),
    fetchJson<ClassSetDTO[]>('/classes', { token: sessionUser.token }),
  ]);
  const users: UserDTO[] = members.map((member) => member.user);
  const visibleClasses =
    scope.scopeType === 'class' && scope.scopeId
      ? classes.filter((entry) => entry.id === scope.scopeId)
      : classes;

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <p className="admin-page-kicker">Finance</p>
        <h1 className="admin-page-title">Ledgers</h1>
        <p className="admin-page-subtitle">
          Review member and class account activity using the Node-based finance stack.
        </p>
      </header>
      <LedgerPanel
        users={users}
        classes={visibleClasses}
        authToken={sessionUser.token}
        activeScopeType={scope.scopeType}
        activeScopeId={scope.scopeId ?? null}
      />
    </div>
  );
}

function buildScopedPath(
  path: string,
  scopeType?: 'global' | 'branch' | 'class',
  scopeId?: string,
) {
  const params = new URLSearchParams();
  if (scopeType) {
    params.set('scopeType', scopeType);
  }
  if (scopeId) {
    params.set('scopeId', scopeId);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

