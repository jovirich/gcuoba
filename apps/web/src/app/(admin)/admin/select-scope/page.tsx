import type { BranchDTO, ClassSetDTO, RoleAssignmentDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { fetchJson } from '@/lib/api';
import { authOptions } from '@/lib/auth-options';
import { fetchUserAssignments } from '@/lib/role-assignments';
import { resolveScopeSelection } from '@/lib/scope-query';

type PageProps = {
  searchParams?: Promise<{
    next?: string;
    scopeType?: string;
    scopeId?: string;
  }>;
};

type ScopeOption = {
  id: string;
  scopeType: 'global' | 'branch' | 'class';
  scopeId: string | null;
  label: string;
  roleCodes: string[];
};

function normalizeNextPath(raw?: string) {
  const value = raw?.trim();
  if (!value || !value.startsWith('/admin')) {
    return '/admin';
  }
  return value;
}

function buildScopedTarget(nextPath: string, option: ScopeOption) {
  const [path, query = ''] = nextPath.split('?');
  const params = new URLSearchParams(query);
  params.set('scopeType', option.scopeType);
  if (option.scopeId) {
    params.set('scopeId', option.scopeId);
  } else {
    params.delete('scopeId');
  }
  const nextQuery = params.toString();
  return nextQuery ? `${path}?${nextQuery}` : path;
}

function buildScopeOptions(
  assignments: RoleAssignmentDTO[],
  branches: BranchDTO[],
  classes: ClassSetDTO[],
) {
  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));
  const classMap = new Map(classes.map((classSet) => [classSet.id, classSet.label]));
  const grouped = new Map<string, ScopeOption>();

  assignments.forEach((assignment) => {
    const scopeType = assignment.scopeType;
    const scopeId = assignment.scopeId ?? null;
    const id = `${scopeType}:${scopeId ?? 'global'}`;
    const existing = grouped.get(id);

    const roleCode = assignment.roleCode?.trim();
    const roleCodes = existing?.roleCodes ?? [];
    if (roleCode && !roleCodes.includes(roleCode)) {
      roleCodes.push(roleCode);
    }

    let label = 'Global';
    if (scopeType === 'branch') {
      label = `Branch: ${branchMap.get(scopeId ?? '') ?? `Branch ${scopeId ?? ''}`}`;
    }
    if (scopeType === 'class') {
      label = `Class: ${classMap.get(scopeId ?? '') ?? `Class ${scopeId ?? ''}`}`;
    }

    grouped.set(id, {
      id,
      scopeType,
      scopeId,
      label,
      roleCodes,
    });
  });

  const order: Record<ScopeOption['scopeType'], number> = {
    global: 0,
    class: 1,
    branch: 2,
  };

  return Array.from(grouped.values()).sort((a, b) => {
    if (order[a.scopeType] !== order[b.scopeType]) {
      return order[a.scopeType] - order[b.scopeType];
    }
    return a.label.localeCompare(b.label);
  });
}

function isSelectedScope(
  option: ScopeOption,
  selected: { scopeType?: 'global' | 'branch' | 'class'; scopeId?: string },
) {
  if (!selected.scopeType) {
    return false;
  }
  if (selected.scopeType !== option.scopeType) {
    return false;
  }
  if (selected.scopeType === 'global') {
    return option.scopeId === null;
  }
  return option.scopeId === (selected.scopeId ?? null);
}

export default async function AdminScopeSelectPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { id?: string; name?: string; token?: string; status?: string }
    | undefined;
  if (!user?.id || !user.token) {
    redirect('/login?portal=admin');
  }
  if (user.status !== 'active') {
    redirect('/profile?pending=1');
  }

  const params = searchParams ? await searchParams : undefined;
  const nextPath = normalizeNextPath(params?.next);
  const requestedScope = resolveScopeSelection({
    scopeType: params?.scopeType,
    scopeId: params?.scopeId,
  });

  const [assignments, branches, classes] = await Promise.all([
    fetchUserAssignments(user.token),
    fetchJson<BranchDTO[]>('/branches', { token: user.token }).catch(() => []),
    fetchJson<ClassSetDTO[]>('/classes', { token: user.token }).catch(() => []),
  ]);

  const options = buildScopeOptions(assignments, branches, classes);
  if (options.length === 0) {
    redirect('/dashboard');
  }
  if (options.length === 1) {
    redirect(buildScopedTarget(nextPath, options[0]));
  }

  const selectedOptionId =
    options.find((option) => isSelectedScope(option, requestedScope))?.id ?? options[0].id;

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <p className="admin-page-kicker">Role selection</p>
        <h1 className="admin-page-title">Choose active admin scope</h1>
        <p className="admin-page-subtitle">
          You have multiple executive assignments. Select one scope to continue. You can switch again anytime.
        </p>
      </header>

      <section className="surface-card p-5">
        <div className="grid gap-3 md:grid-cols-2">
          {options.map((option) => {
            const target = buildScopedTarget(nextPath, option);
            const selected = option.id === selectedOptionId;
            return (
              <Link
                key={option.id}
                href={target}
                className={`rounded-2xl border p-4 transition ${
                  selected
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/40'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Roles: {option.roleCodes.length > 0 ? option.roleCodes.join(', ') : 'assigned'}
                </p>
                <p className="mt-3 text-xs font-semibold text-red-700">Continue with this scope</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
