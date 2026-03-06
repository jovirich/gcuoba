import type {
  NotificationEmailJobDTO,
  NotificationEmailQueueStatsDTO,
  NotificationEmailWorkerStatusDTO,
} from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { fetchJson, isApiErrorStatus } from '@/lib/api';
import { NotificationsQueuePanel } from './panel';

export default async function NotificationsQueuePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; token?: string; status?: string } | undefined;
  if (!user?.id || !user.token) {
    redirect('/login');
  }

  if (user.status !== 'active') {
    redirect('/profile?pending=1');
  }

  let stats: NotificationEmailQueueStatsDTO;
  let jobs: NotificationEmailJobDTO[];
  let workerStatus: NotificationEmailWorkerStatusDTO;
  try {
    [stats, jobs, workerStatus] = await Promise.all([
      fetchJson<NotificationEmailQueueStatsDTO>('/notifications/admin/email-queue/stats', {
        token: user.token,
      }),
      fetchJson<NotificationEmailJobDTO[]>('/notifications/admin/email-queue?limit=100', {
        token: user.token,
      }),
      fetchJson<NotificationEmailWorkerStatusDTO>('/notifications/admin/email-queue/worker-status', {
        token: user.token,
      }),
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
        <p className="admin-page-kicker">Notifications</p>
        <h1 className="admin-page-title">Email queue</h1>
        <p className="admin-page-subtitle">
          Process queued notification emails and inspect delivery failures.
        </p>
      </header>
      <NotificationsQueuePanel
        initialStats={stats}
        initialJobs={jobs}
        initialWorkerStatus={workerStatus}
        authToken={user.token}
      />
    </div>
  );
}

