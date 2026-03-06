import type { DuesBroadsheetDTO } from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { DuesBroadsheetPanel } from '@/components/dues/dues-broadsheet-panel';
import { fetchJson } from '@/lib/api';
import { authOptions } from '@/lib/auth-options';

async function loadInitial(token: string): Promise<DuesBroadsheetDTO | null> {
  const year = new Date().getFullYear();
  try {
    return await fetchJson<DuesBroadsheetDTO>(`/finance/dues/me?year=${year}`, { token });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('API 400:')) {
      return null;
    }
    throw error;
  }
}

export default async function MemberDuesPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; token?: string; status?: string } | undefined;
  if (!user?.id || !user.token) {
    redirect('/login');
  }
  if (user.status !== 'active') {
    redirect('/profile?pending=1');
  }

  const initialData = await loadInitial(user.token);
  if (!initialData) {
    return (
      <main className="member-page p-4 md:p-6">
        <header className="member-page-header">
          <p className="member-page-kicker">Dues</p>
          <h1 className="member-page-title">Class dues broadsheet</h1>
          <p className="member-page-subtitle">
            A class membership is required before your dues broadsheet can be displayed.
          </p>
        </header>
      </main>
    );
  }

  return (
    <main className="member-page p-4 md:p-6">
      <header className="member-page-header">
        <p className="member-page-kicker">Dues</p>
        <h1 className="member-page-title">Class dues broadsheet</h1>
        <p className="member-page-subtitle">
          Review current-year dues, previous outstanding, and payment progress across your class.
        </p>
      </header>
      <DuesBroadsheetPanel
        endpoint="/finance/dues/me"
        authToken={user.token}
        initialData={initialData}
        title="Class dues view"
        subtitle="Search classmates and filter by dues position."
      />
    </main>
  );
}
