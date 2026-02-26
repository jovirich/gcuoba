import type { AnnouncementDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { fetchJson } from '@/lib/api';

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
      <section className="space-y-4">
        {announcements.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements available.</p>
        ) : (
          announcements.map((announcement) => (
            <article key={announcement.id} className="surface-card p-4">
              <h2 className="text-lg font-semibold text-slate-900">{announcement.title}</h2>
              <p className="text-xs text-slate-500">
                {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleString() : 'Posted recently'}
              </p>
              <p className="mt-2 text-sm text-slate-700">{announcement.body}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}


