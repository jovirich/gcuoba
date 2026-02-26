import type { EventDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { fetchJson } from '@/lib/api';
import { EventsPanel } from './events-panel';

export default async function MemberEventsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; token?: string } | undefined;
  if (!user?.id || !user.token) {
    redirect('/login');
  }

  const events = await fetchJson<EventDTO[]>('/events?status=published', { token: user.token });

  return (
    <main className="member-page p-4 md:p-6">
      <header className="member-page-header">
        <p className="member-page-kicker">Calendar</p>
        <h1 className="member-page-title">Upcoming events</h1>
        <p className="member-page-subtitle">Track scheduled events, RSVP, and contribution intent.</p>
      </header>
      <EventsPanel initialEvents={events} authToken={user.token} />
    </main>
  );
}

