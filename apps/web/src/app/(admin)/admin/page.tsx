import Link from 'next/link';
import type {
  AdminMemberDTO,
  AnnouncementDTO,
  AuditLogDTO,
  BranchDTO,
  BranchExecutiveSummaryDTO,
  ClassSetDTO,
  CountryDTO,
  DuesBroadsheetDTO,
  EventDTO,
  FinanceAdminSummaryDTO,
  HouseDTO,
  NotificationEmailQueueStatsDTO,
  WelfareCaseDTO,
} from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { fetchJson } from '@/lib/api';
import { authOptions } from '@/lib/auth-options';
import { buildScopeParams, resolveScopeSelection, withScope } from '@/lib/scope-query';

type CockpitCard = {
  id: string;
  title: string;
  href: string;
  stat: string;
  hint: string;
  hidden?: boolean;
  unavailable?: boolean;
};

type AdminHomePageProps = {
  searchParams?: Promise<{ scopeType?: string; scopeId?: string }>;
};

async function safeFetch<T>(task: Promise<T>): Promise<T | null> {
  try {
    return await task;
  } catch {
    return null;
  }
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatTotalsByCurrency(totals: Map<string, number>) {
  if (totals.size === 0) {
    return 'N/A';
  }
  return Array.from(totals.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(' | ');
}

export default async function AdminHomePage({ searchParams }: AdminHomePageProps) {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; name?: string; token?: string; status?: string } | undefined;
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
    const isClassScope = scope.scopeType === 'class';
    const isBranchOrClassScope = scope.scopeType === 'branch' || scope.scopeType === 'class';
    const welfareParams = buildScopeParams(scope);
    welfareParams.set('includeClosed', 'true');
    const duesParams = buildScopeParams(scope);
    duesParams.set('year', String(new Date().getFullYear()));

    const [
      members,
      branchExecutiveSummary,
      financeSummary,
      welfareCases,
      duesBroadsheet,
      events,
      announcements,
      setupBranches,
      setupClasses,
      setupHouses,
      setupCountries,
      auditLogs,
      emailQueueStats,
    ] = await Promise.all([
      safeFetch(fetchJson<AdminMemberDTO[]>(withScope('/admin/members', scope), { token: user.token })),
      isClassScope
        ? Promise.resolve(null)
        : safeFetch(fetchJson<BranchExecutiveSummaryDTO>(`/branch-executive/${user.id}`, { token: user.token })),
      safeFetch(fetchJson<FinanceAdminSummaryDTO>(withScope('/finance/admin/summary', scope), { token: user.token })),
      safeFetch(fetchJson<WelfareCaseDTO[]>(`/welfare/cases?${welfareParams.toString()}`, { token: user.token })),
      safeFetch(fetchJson<DuesBroadsheetDTO>(`/finance/dues/broadsheet?${duesParams.toString()}`, { token: user.token })),
      safeFetch(fetchJson<EventDTO[]>(withScope('/events', scope), { token: user.token })),
      safeFetch(fetchJson<AnnouncementDTO[]>(withScope('/announcements', scope), { token: user.token })),
      isBranchOrClassScope ? Promise.resolve(null) : safeFetch(fetchJson<BranchDTO[]>('/branches', { token: user.token })),
      isBranchOrClassScope ? Promise.resolve(null) : safeFetch(fetchJson<ClassSetDTO[]>('/classes', { token: user.token })),
      isBranchOrClassScope ? Promise.resolve(null) : safeFetch(fetchJson<HouseDTO[]>('/houses', { token: user.token })),
      isBranchOrClassScope ? Promise.resolve(null) : safeFetch(fetchJson<CountryDTO[]>('/countries', { token: user.token })),
      isBranchOrClassScope
        ? Promise.resolve(null)
        : safeFetch(fetchJson<AuditLogDTO[]>('/audit-logs?limit=200', { token: user.token })),
      isBranchOrClassScope
        ? Promise.resolve(null)
        : safeFetch(fetchJson<NotificationEmailQueueStatsDTO>('/notifications/admin/email-queue/stats', { token: user.token })),
    ]);

    const activeMembers = members ? members.filter((entry) => entry.user.status === 'active').length : 0;
    const pendingBranchRequests = branchExecutiveSummary
      ? branchExecutiveSummary.branches.reduce((sum, branch) => sum + branch.pendingRequests.length, 0)
      : 0;
    const outstandingInvoices = financeSummary
      ? financeSummary.invoices.filter((invoice) => invoice.status !== 'paid').length
      : 0;
    const openWelfareCases = welfareCases ? welfareCases.filter((entry) => entry.status === 'open').length : 0;
    const membersOwingDues = duesBroadsheet
      ? duesBroadsheet.rows.filter((row) => row.status !== 'clear').length
      : 0;
    const activeProjects = financeSummary
      ? financeSummary.projects.filter((project) => project.status === 'active').length
      : 0;
    const publishedEvents = events ? events.filter((entry) => entry.status === 'published').length : 0;
    const publishedAnnouncements = announcements
      ? announcements.filter((entry) => entry.status === 'published').length
      : 0;
    const setupTotalRecords =
      (setupBranches?.length ?? 0) +
      (setupClasses?.length ?? 0) +
      (setupHouses?.length ?? 0) +
      (setupCountries?.length ?? 0);
    const failedEmailJobs = emailQueueStats?.failed ?? 0;
    const welfareRaisedByCurrency = new Map<string, number>();
    if (welfareCases) {
      for (const entry of welfareCases) {
        const currency = entry.currency || 'NGN';
        const current = welfareRaisedByCurrency.get(currency) ?? 0;
        welfareRaisedByCurrency.set(currency, current + Number(entry.totalRaised ?? 0));
      }
    }
    const totalWelfareRaised = formatTotalsByCurrency(welfareRaisedByCurrency);

    const duesOwedByCurrency = new Map<string, number>();
    if (duesBroadsheet) {
      duesOwedByCurrency.set(duesBroadsheet.currency || 'NGN', Number(duesBroadsheet.totals.balanceOwing ?? 0));
    }
    const totalDuesOwed = formatTotalsByCurrency(duesOwedByCurrency);

    const cards: CockpitCard[] = [
      {
        id: 'members',
        title: 'Members',
        href: withScope('/admin/members', scope),
        stat: members ? formatCount(members.length) : 'N/A',
        hint: members
          ? `${formatCount(activeMembers)} active accounts in this scope`
          : 'Member stats unavailable for current role',
        unavailable: !members,
      },
      {
        id: 'branch',
        title: 'Branch executive',
        href: withScope('/admin/branch-executive', scope),
        stat: branchExecutiveSummary ? formatCount(pendingBranchRequests) : 'N/A',
        hint: branchExecutiveSummary ? 'Pending branch join requests' : 'Branch workflow not available',
        hidden: isClassScope,
        unavailable: !branchExecutiveSummary,
      },
      {
        id: 'finance',
        title: 'Finance',
        href: withScope('/admin/finance', scope),
        stat: financeSummary ? formatCount(outstandingInvoices) : 'N/A',
        hint: financeSummary ? 'Invoices not fully paid' : 'Finance access unavailable',
        unavailable: !financeSummary,
      },
      {
        id: 'dues',
        title: 'Dues',
        href: withScope('/admin/dues', scope),
        stat: duesBroadsheet ? formatCount(membersOwingDues) : 'N/A',
        hint: duesBroadsheet ? 'Members currently owing dues' : 'Dues broadsheet unavailable',
        unavailable: !duesBroadsheet,
      },
      {
        id: 'welfare',
        title: 'Welfare',
        href: withScope('/admin/welfare', scope),
        stat: welfareCases ? formatCount(openWelfareCases) : 'N/A',
        hint: welfareCases ? 'Open welfare cases' : 'Welfare data unavailable',
        unavailable: !welfareCases,
      },
      {
        id: 'projects',
        title: 'Projects',
        href: withScope('/admin/projects', scope),
        stat: financeSummary ? formatCount(activeProjects) : 'N/A',
        hint: financeSummary ? 'Projects marked active' : 'Project stats unavailable',
        unavailable: !financeSummary,
      },
      {
        id: 'ledger',
        title: 'Ledgers',
        href: withScope('/admin/finance/ledger', scope),
        stat: financeSummary ? formatCount(financeSummary.payments.length) : 'N/A',
        hint: financeSummary ? 'Payments captured in current scope' : 'Ledger summary unavailable',
        unavailable: !financeSummary,
      },
      {
        id: 'events',
        title: 'Events',
        href: withScope('/admin/events', scope),
        stat: events ? formatCount(publishedEvents) : 'N/A',
        hint: events ? 'Published events' : 'Events data unavailable',
        unavailable: !events,
      },
      {
        id: 'announcements',
        title: 'Announcements',
        href: withScope('/admin/announcements', scope),
        stat: announcements ? formatCount(publishedAnnouncements) : 'N/A',
        hint: announcements ? 'Published updates' : 'Announcement data unavailable',
        unavailable: !announcements,
      },
      {
        id: 'setup',
        title: 'Setup',
        href: withScope('/admin/setup', scope),
        stat: !isBranchOrClassScope && setupTotalRecords > 0 ? formatCount(setupTotalRecords) : 'N/A',
        hint: !isBranchOrClassScope ? 'Branches, classes, houses, and countries' : 'Global setup only',
        hidden: isBranchOrClassScope,
        unavailable: isBranchOrClassScope || setupTotalRecords === 0,
      },
      {
        id: 'audit',
        title: 'Audit logs',
        href: withScope('/admin/audit-logs', scope),
        stat: auditLogs ? formatCount(auditLogs.length) : 'N/A',
        hint: auditLogs ? 'Recent audit entries (up to 200)' : 'Audit access unavailable',
        hidden: isBranchOrClassScope,
        unavailable: !auditLogs,
      },
      {
        id: 'email',
        title: 'Email queue',
        href: withScope('/admin/notifications-queue', scope),
        stat: emailQueueStats ? formatCount(emailQueueStats.pending) : 'N/A',
        hint: emailQueueStats
          ? `${formatCount(failedEmailJobs)} failed deliveries`
          : 'Global queue access unavailable',
        hidden: isBranchOrClassScope,
        unavailable: !emailQueueStats,
      },
    ].filter((entry) => !entry.hidden);

    return (
        <div className="admin-page">
            <header className="admin-page-header">
                <p className="admin-page-kicker">Executive workspace</p>
                <h1 className="admin-page-title">Operations cockpit</h1>
                <p className="admin-page-subtitle">
                    Core migration surfaces for finance, welfare, governance, and communication workflows.
                </p>
            </header>
            <section className="grid gap-3 md:grid-cols-2">
                <Link
                  className="surface-card block p-4 transition hover:border-[#efbb71] hover:bg-[#fff8e6]"
                  href={withScope('/admin/welfare', scope)}
                >
                  <p className="text-sm font-semibold text-slate-900">Total welfare raised</p>
                  <p className={`mt-2 text-2xl font-bold ${welfareCases ? 'text-slate-900' : 'text-slate-400'}`}>
                    {welfareCases ? totalWelfareRaised : 'N/A'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {welfareCases ? 'Across all welfare cases in active scope' : 'Welfare totals unavailable'}
                  </p>
                </Link>
                <Link
                  className="surface-card block p-4 transition hover:border-[#efbb71] hover:bg-[#fff8e6]"
                  href={withScope('/admin/dues', scope)}
                >
                  <p className="text-sm font-semibold text-slate-900">Total dues owed</p>
                  <p className={`mt-2 text-2xl font-bold ${duesBroadsheet ? 'text-slate-900' : 'text-slate-400'}`}>
                    {duesBroadsheet ? totalDuesOwed : 'N/A'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {duesBroadsheet ? 'Outstanding dues balance for current scope' : 'Dues totals unavailable'}
                  </p>
                </Link>
            </section>
            <section className="surface-card p-4">
                <div className="module-card-head">
                  <h2 className="text-lg font-semibold text-slate-900">Dashboard modules</h2>
                  <span className="badge-soft">{cards.length} modules</span>
                </div>
                <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {cards.map((entry) => (
                      <li key={entry.id}>
                        <Link
                          className="surface-muted block h-full p-4 transition hover:border-[#efbb71] hover:bg-[#fff8e6]"
                          href={entry.href}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                            <span className="text-xs font-medium text-red-700 underline">Open</span>
                          </div>
                          <p className={`mt-2 text-2xl font-bold ${entry.unavailable ? 'text-slate-400' : 'text-slate-900'}`}>
                            {entry.stat}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{entry.hint}</p>
                        </Link>
                      </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}


