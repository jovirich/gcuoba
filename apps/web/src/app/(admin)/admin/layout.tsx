import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/admin-nav';
import { LogoutButton } from '@/components/auth/logout-button';
import { RoleSwitcher } from '@/components/role-switcher';
import { authOptions } from '@/lib/auth-options';
import { fetchJson } from '@/lib/api';
import { fetchUserAssignments } from '@/lib/role-assignments';
import { connectMongo } from '@/lib/server/mongo';
import { ClassMembershipModel, ClassModel } from '@/lib/server/models';

type Props = {
  children: ReactNode;
};

async function resolveClaimRedirectPath(userId: string): Promise<string | null> {
  await connectMongo();
  const membership = await ClassMembershipModel.findOne({ userId }).select('classId').lean<{ classId?: string }>().exec();
  if (!membership?.classId) {
    return null;
  }
  const classDoc = await ClassModel.findById(membership.classId)
    .select('entryYear')
    .lean<{ entryYear?: number }>()
    .exec();
  if (!classDoc?.entryYear) {
    return null;
  }
  return `/claim/class/${classDoc.entryYear}`;
}

export default async function AdminLayout({ children }: Props) {
  const session = await getServerSession(authOptions);
  const user = session?.user as {
    id?: string;
    name?: string;
    token?: string;
    status?: string;
    claimStatus?: 'unclaimed' | 'claimed';
  } | undefined;
  if (!user?.id || !user.token) {
    redirect('/login');
  }
  if (user.status !== 'active') {
    redirect('/profile?pending=1');
  }
  if (user.claimStatus === 'unclaimed') {
    const claimRedirectPath = await resolveClaimRedirectPath(user.id);
    if (claimRedirectPath) {
      redirect(claimRedirectPath);
    }
  }

  const [executiveAccess, assignments] = await Promise.all([
    fetchJson<{ allowed: boolean }>('/roles/access/executive', { token: user.token }).catch(
      () => ({ allowed: false }),
    ),
    fetchUserAssignments(user.token),
  ]);
  if (!executiveAccess.allowed) {
    redirect('/dashboard');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar admin-surface fade-rise">
        <p className="text-xs uppercase tracking-[0.2em] text-red-700">Executive Console</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">GCUOBA Portal</h1>
        <p className="mt-1 text-sm text-slate-500">
          Role-scoped administration for finance, welfare, members, and governance.
        </p>
        <div className="mt-6">
          <AdminNav />
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar admin-surface fade-rise flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-red-700">Signed in</p>
            <p className="text-sm font-semibold text-slate-900">{user.name ?? 'Executive user'}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm items-center">
            <RoleSwitcher assignments={assignments} token={user.token} />
            <Link className="btn-secondary border-red-200 bg-red-50 text-red-800" href="/dashboard">
              Member view
            </Link>
            <Link className="btn-secondary" href="/profile">
              Profile
            </Link>
            <LogoutButton className="btn-secondary border-rose-200 bg-rose-50 text-rose-700" />
          </div>
        </header>
        <section className="admin-content admin-surface fade-rise">{children}</section>
      </div>
    </div>
  );
}


