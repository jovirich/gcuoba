import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { LogoutButton } from '@/components/auth/logout-button';
import { MemberNav } from '@/components/member/member-nav';
import { RoleSwitcher } from '@/components/role-switcher';
import { fetchUserAssignments } from '@/lib/role-assignments';

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; status?: string; token?: string } | undefined;
  if (!user?.id || !user.token) {
    redirect('/login');
  }
  const assignments = await fetchUserAssignments(user.token);

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4">
        <header className="surface-card fade-rise flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-red-700">Member workspace</p>
            <p className="text-sm font-semibold text-slate-900">{user.name ?? 'Member'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MemberNav />
            <LogoutButton className="btn-secondary" />
          </div>
          {assignments.length > 0 && (
            <div className="flex items-center gap-2">
              <RoleSwitcher
                assignments={assignments}
                token={user.token}
                showPortalLink
                portalBase="/admin/select-scope?next=/admin"
              />
            </div>
          )}
        </header>
        <div className="fade-rise">{children}</div>
      </div>
    </div>
  );
}


