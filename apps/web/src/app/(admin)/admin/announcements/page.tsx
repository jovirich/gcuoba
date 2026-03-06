import type { AnnouncementDTO, BranchDTO, ClassSetDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { fetchJson, isApiErrorStatus } from '@/lib/api';
import { authOptions } from '@/lib/auth-options';
import { resolveScopeSelection, withScope } from '@/lib/scope-query';
import { AnnouncementsPanel } from './panel';

type AdminAnnouncementsPageProps = {
  searchParams?: Promise<{ scopeType?: string; scopeId?: string }>;
};

export default async function AdminAnnouncementsPage({ searchParams }: AdminAnnouncementsPageProps) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as
    | { id?: string; status?: string; token?: string }
    | undefined;
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
  const branchesPath =
    scope.scopeType === 'class'
      ? '/branches?managedOnly=1'
      : withScope('/branches', scope);
  const classesPath =
    scope.scopeType === 'branch'
      ? '/classes?managedOnly=1'
      : withScope('/classes', scope);

  let announcements: AnnouncementDTO[];
  let branches: BranchDTO[];
  let classes: ClassSetDTO[];
  try {
    [announcements, branches, classes] = await Promise.all([
      fetchJson<AnnouncementDTO[]>(withScope('/announcements', scope), {
        token: sessionUser.token,
      }),
      fetchJson<BranchDTO[]>(branchesPath, { token: sessionUser.token }),
      fetchJson<ClassSetDTO[]>(classesPath, { token: sessionUser.token }),
    ]);
  } catch (error) {
    if (isApiErrorStatus(error, 403)) {
      redirect('/admin');
    }
    throw error;
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <p className="admin-page-kicker">Announcements</p>
        <h1 className="admin-page-title">Manage announcements</h1>
        <p className="admin-page-subtitle">
          Create or update scoped announcements for members.
        </p>
      </header>
      <AnnouncementsPanel
        initialAnnouncements={announcements}
        branches={branches}
        classes={classes}
        authToken={sessionUser.token}
        activeScopeType={scope.scopeType}
        activeScopeId={scope.scopeId ?? null}
      />
    </div>
  );
}
