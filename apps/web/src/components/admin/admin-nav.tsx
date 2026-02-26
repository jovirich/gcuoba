'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

type AdminNavItem = {
  href: string;
  label: string;
  hint: string;
  hideInScopes?: Array<'branch' | 'class'>;
  activeWhen?: (pathname: string, params: URLSearchParams) => boolean;
};

const navItems: AdminNavItem[] = [
  { href: '/admin', label: 'Overview', hint: 'Workspace home' },
  { href: '/admin/members', label: 'Members', hint: 'Profiles and roles' },
  {
    href: '/admin/finance',
    label: 'Finance',
    hint: 'Dues, expenses, payments',
    activeWhen: (pathname) =>
      pathname.startsWith('/admin/finance') &&
      !pathname.startsWith('/admin/finance/ledger'),
  },
  {
    href: '/admin/projects',
    label: 'Projects',
    hint: 'Budget and delivery',
    activeWhen: (pathname) => pathname.startsWith('/admin/projects'),
  },
  { href: '/admin/finance/ledger', label: 'Ledgers', hint: 'Member and class ledgers' },
  { href: '/admin/welfare', label: 'Welfare', hint: 'Cases and approvals' },
  { href: '/admin/events', label: 'Events', hint: 'Manage event pipeline' },
  { href: '/admin/announcements', label: 'Announcements', hint: 'Publish updates' },
  {
    href: '/admin/branch-executive',
    label: 'Branch Executive',
    hint: 'Membership workflow',
    hideInScopes: ['class'],
  },
  {
    href: '/admin/setup',
    label: 'Setup',
    hint: 'Reference data & roles',
    hideInScopes: ['branch', 'class'],
  },
  {
    href: '/admin/audit-logs',
    label: 'Audit Logs',
    hint: 'Activity trail',
    hideInScopes: ['branch', 'class'],
  },
  { href: '/admin/notifications-queue', label: 'Email Queue', hint: 'Notification delivery' },
];

export function AdminNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scopeType = searchParams.get('scopeType');
  const scopeId = searchParams.get('scopeId');
  const currentScopeType = scopeType === 'branch' || scopeType === 'class' ? scopeType : null;
  const scopeQuery = (() => {
    if (!scopeType) {
      return '';
    }
    const params = new URLSearchParams({ scopeType });
    if (scopeId) {
      params.set('scopeId', scopeId);
    }
    return params.toString();
  })();

  return (
    <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
      {navItems
        .filter((item) => !(currentScopeType && item.hideInScopes?.includes(currentScopeType)))
        .map((item, index) => {
        const active = item.activeWhen
          ? item.activeWhen(pathname ?? '', searchParams)
          : pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
        const href = (() => {
          if (!scopeQuery) {
            return item.href;
          }
          const joiner = item.href.includes('?') ? '&' : '?';
          return `${item.href}${joiner}${scopeQuery}`;
        })();
        return (
          <Link
            key={item.href}
            href={href}
            className={`admin-link fade-rise block rounded-xl px-3 py-2.5 ${active ? 'admin-link-active' : ''}`}
            style={{ animationDelay: `${index * 35}ms` }}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="text-xs text-slate-500">{item.hint}</p>
          </Link>
        );
      })}
    </nav>
  );
}

