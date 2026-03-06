import type { WelfareCaseDTO, WelfareCaseDetailDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { fetchJson, isApiErrorStatus } from '@/lib/api';
import { buildScopeParams, resolveScopeSelection } from '@/lib/scope-query';
import { WelfarePanel } from './panel';

async function loadCases(
  token: string,
  scopeType?: 'global' | 'branch' | 'class',
  scopeId?: string,
): Promise<WelfareCaseDTO[]> {
  const params = buildScopeParams({ scopeType, scopeId });
  params.set('includeClosed', 'true');
  return fetchJson(`/welfare/cases?${params.toString()}`, { token });
}

async function loadCase(caseId: string, token: string): Promise<WelfareCaseDetailDTO> {
  return fetchJson(`/welfare/cases/${caseId}`, { token });
}

type WelfareAdminPageProps = {
  searchParams?: Promise<{ scopeType?: string; scopeId?: string }>;
};

export default async function WelfareAdminPage({ searchParams }: WelfareAdminPageProps) {
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

  let cases: WelfareCaseDTO[];
  let initialCase: WelfareCaseDetailDTO | null;
  try {
    cases = await loadCases(user.token, scope.scopeType, scope.scopeId);
    initialCase = cases.length ? await loadCase(cases[0].id, user.token) : null;
  } catch (error) {
    if (isApiErrorStatus(error, 403)) {
      redirect('/admin');
    }
    throw error;
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <p className="admin-page-kicker">Welfare</p>
        <h1 className="admin-page-title">Welfare cases</h1>
        <p className="admin-page-subtitle">
          Track welfare appeals, record contributions, and manage payouts for beneficiaries.
        </p>
      </header>
      <WelfarePanel
        cases={cases}
        initialCase={initialCase}
        authToken={user.token}
        activeScopeType={scope.scopeType}
        activeScopeId={scope.scopeId ?? null}
      />
    </div>
  );
}

