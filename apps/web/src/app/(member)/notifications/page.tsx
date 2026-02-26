import type { NotificationDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { fetchJson } from '@/lib/api';
import { NotificationsPanel } from './panel';

export default async function MemberNotificationsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; token?: string; status?: string } | undefined;
  if (!user?.id || !user.token) {
    redirect('/login');
  }
  if (user.status !== 'active') {
    redirect('/profile?pending=1');
  }

  const notifications = await fetchJson<NotificationDTO[]>('/notifications/me?limit=100', {
    token: user.token,
  });

  return (
    <main className="member-page p-4 md:p-6">
      <header className="member-page-header">
        <p className="member-page-kicker">Inbox</p>
        <h1 className="member-page-title">Notifications</h1>
        <p className="member-page-subtitle">Read updates across approvals, dues, and announcements.</p>
      </header>
      <NotificationsPanel initialNotifications={notifications} authToken={user.token} />
    </main>
  );
}

