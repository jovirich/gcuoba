import type { AnnouncementDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { fetchJson } from '@/lib/api';
import { AnnouncementsPanel } from './panel';

export default async function MemberAnnouncementsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; token?: string } | undefined;
  if (!user?.id || !user.token) {
    redirect('/login');
  }

  const announcements = await fetchJson<AnnouncementDTO[]>('/announcements?status=published', {
    token: user.token,
  });

  return (
    <main className="member-page p-4 md:p-6">
      <header className="member-page-header">
        <p className="member-page-kicker">News</p>
        <h1 className="member-page-title">Announcements</h1>
        <p className="member-page-subtitle">Association notices and updates for members.</p>
      </header>
      <AnnouncementsPanel announcements={announcements} />
    </main>
  );
}


