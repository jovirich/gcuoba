import Link from 'next/link';
import { resolveScopeSelection, withScope } from '@/lib/scope-query';

type AdminHomePageProps = {
  searchParams?: Promise<{ scopeType?: string; scopeId?: string }>;
};

export default async function AdminHomePage({ searchParams }: AdminHomePageProps) {
    const params = searchParams ? await searchParams : undefined;
    const scope = resolveScopeSelection({
      scopeType: params?.scopeType,
      scopeId: params?.scopeId,
    });
    const isClassScope = scope.scopeType === 'class';
    const isBranchOrClassScope = scope.scopeType === 'branch' || scope.scopeType === 'class';
    const quickLinks = [
      {
        href: withScope('/admin/members', scope),
        label: 'Manage members and assign executive roles',
        hidden: false,
      },
      {
        href: withScope('/admin/branch-executive', scope),
        label: 'Review branch membership requests',
        hidden: isClassScope,
      },
      {
        href: withScope('/admin/setup', scope),
        label: 'Manage branches, classes, and houses',
        hidden: isBranchOrClassScope,
      },
      {
        href: withScope('/admin/welfare', scope),
        label: 'Manage welfare cases',
        hidden: false,
      },
      {
        href: withScope('/admin/finance', scope),
        label: 'Manage invoices and payments',
        hidden: false,
      },
      {
        href: withScope('/admin/dues', scope),
        label: 'View dues broadsheet',
        hidden: false,
      },
      {
        href: withScope('/admin/projects', scope),
        label: 'Manage project budgets and delivery',
        hidden: false,
      },
      {
        href: withScope('/admin/finance/ledger', scope),
        label: 'View member/class ledgers',
        hidden: false,
      },
      {
        href: withScope('/admin/audit-logs', scope),
        label: 'View audit logs',
        hidden: isBranchOrClassScope,
      },
      {
        href: withScope('/admin/notifications-queue', scope),
        label: 'Process notification emails',
        hidden: false,
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
            <section className="surface-card p-4">
                <h2 className="text-lg font-semibold text-slate-900">Quick links</h2>
                <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {quickLinks.map((entry) => (
                      <li key={entry.href}>
                        <Link
                          className="surface-muted block px-3 py-2 text-red-700 hover:bg-red-50"
                          href={entry.href}
                        >
                          {entry.label}
                        </Link>
                      </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}


