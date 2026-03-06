import type { ClassSetDTO, DashboardSummaryDTO } from '@gcuoba/types';
import { authOptions } from '@/lib/auth-options';
import { toClassDto } from '@/lib/server/dto-mappers';
import { buildDashboardSummary } from '@/lib/server/dashboard';
import { connectMongo } from '@/lib/server/mongo';
import { ClassModel } from '@/lib/server/models';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

async function getDashboardSummary(userId: string): Promise<DashboardSummaryDTO | null> {
  try {
    await connectMongo();
    return await buildDashboardSummary(userId);
  } catch (error) {
    console.warn('Failed to load dashboard summary', error);
    return null;
  }
}

async function getClasses(): Promise<ClassSetDTO[]> {
  await connectMongo();
  const docs = await ClassModel.find().sort({ entryYear: -1 }).exec();
  return docs.map((doc) => toClassDto(doc));
}

export default async function MemberDashboardPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string; token?: string } | undefined;
  const userId = sessionUser?.id;
  if (!userId || !sessionUser?.token) {
    redirect('/login');
  }

  if (sessionUser?.status !== 'active') {
    redirect('/profile?pending=1');
  }

  const summary = await getDashboardSummary(userId);
  if (!summary) {
    return (
      <main className="p-4 md:p-6">
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Unable to load your dashboard data right now. Please try again shortly.
        </p>
      </main>
    );
  }

  const outstanding = summary.outstandingInvoices;
  const branchMemberships = summary.branchMemberships;
  const announcements = summary.announcements ?? [];
  const upcomingEvents = summary.events ?? [];
  const duesSummary = summary.duesSummary;
  const classes = await getClasses();
  const branchMap = new Map(summary.branches.map((branch) => [branch.id, branch]));
  const classMap = new Map(classes.map((classSet) => [classSet.id, classSet]));
  const memberClass = summary.classMembership ? classMap.get(summary.classMembership.classId) : null;
  const primaryTotals = duesSummary.totalsByCurrency[duesSummary.primaryCurrency] ?? {
    due: 0,
    paid: 0,
    balance: 0,
  };
  const topSchemes = duesSummary.schemes.slice(0, 3);

  return (
    <main className="member-page p-4 md:p-6">
      <header className="member-page-header">
        <p className="member-page-kicker">Welcome back</p>
        <h1 className="member-page-title">{summary.user?.name ?? 'Member dashboard'}</h1>
        <p className="member-page-subtitle">Overview of dues, branch status, welfare, and updates.</p>
      </header>

      <section className="surface-card p-4">
        <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link className="btn-secondary" href="/notifications">
            Notifications
          </Link>
          <Link className="btn-secondary" href="/documents">
            Documents
          </Link>
          <Link className="btn-secondary" href="/dues">
            Dues
          </Link>
          <Link className="btn-secondary" href="/profile">
            Profile
          </Link>
          <Link className="btn-secondary" href="/events">
            Events
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-4">
          <p className="text-xs uppercase text-slate-500">Class details</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {memberClass ? memberClass.label : 'Class not assigned'}
          </h2>
          <p className="text-sm text-slate-500">
            {memberClass
              ? `Entry year ${memberClass.entryYear} (${memberClass.status})`
              : 'Contact support or update your profile if this is incorrect.'}
          </p>
          {summary.classMembership?.joinedAt && (
            <p className="mt-2 text-xs text-slate-500">
              Joined: {new Date(summary.classMembership.joinedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="surface-card p-4">
          <p className="text-xs uppercase text-slate-500">Active welfare appeals</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {summary.welfareCases.length > 0
              ? `${summary.welfareCases.length} active appeal${summary.welfareCases.length > 1 ? 's' : ''}`
              : 'No active appeals'}
          </h2>
          <p className="text-sm text-slate-500">
            Current welfare requests available to members in your scope.
          </p>
          <ul className="mt-3 space-y-2">
            {summary.welfareCases.slice(0, 3).map((wcase) => (
              <li key={wcase.id} className="rounded-xl border border-red-50 bg-red-50/40 p-3">
                <p className="text-sm font-semibold text-slate-900">{wcase.title}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{wcase.description}</p>
                <p className="text-xs text-slate-500">
                  Target: {wcase.targetAmount.toLocaleString()} {wcase.currency}
                </p>
              </li>
            ))}
            {summary.welfareCases.length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                No active welfare appeals at the moment.
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500">Dues summary</p>
              <h2 className="text-lg font-semibold text-slate-900">{duesSummary.year}</h2>
            </div>
            <span className="text-xs text-slate-500">Primary currency: {duesSummary.primaryCurrency}</span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Due</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {primaryTotals.due.toLocaleString()} {duesSummary.primaryCurrency}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Paid</dt>
              <dd className="text-lg font-semibold text-red-600">
                {primaryTotals.paid.toLocaleString()} {duesSummary.primaryCurrency}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Balance</dt>
              <dd className="text-lg font-semibold text-rose-600">
                {primaryTotals.balance.toLocaleString()} {duesSummary.primaryCurrency}
              </dd>
            </div>
          </dl>
          {topSchemes.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase text-slate-500">Top dues</p>
              <ul className="mt-2 space-y-1 text-sm">
                {topSchemes.map((scheme) => (
                  <li key={scheme.schemeId ?? scheme.label} className="flex items-center justify-between">
                    <span className="text-slate-700">{scheme.label}</span>
                    <span className="font-semibold text-slate-900">
                      {scheme.balance.toLocaleString()} {scheme.currency}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {duesSummary.hasPriorOutstanding && (
            <p className="mt-3 text-xs text-amber-600">
              You have outstanding balances from previous years.
            </p>
          )}
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500">Upcoming events</p>
              <h2 className="text-lg font-semibold text-slate-900">Your calendar</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{upcomingEvents.length} events</span>
              <Link href="/events" className="text-red-600 underline">
                View all
              </Link>
            </div>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No upcoming events yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="rounded-xl border border-slate-100 p-3">
                  <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                  {event.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{event.description}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {event.startAt ? new Date(event.startAt).toLocaleString() : 'TBD'}
                    {event.location ? ` - ${event.location}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {outstanding.length > 0 && (
        <section className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-rose-900">Outstanding dues</h2>
            <Link className="text-sm font-medium text-rose-800 underline" href="/profile">
              Update profile to change class/branch
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {outstanding.map((invoice) => (
              <li key={invoice.id} className="rounded-xl border border-rose-100 bg-white/70 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{invoice.scheme?.title ?? 'Dues invoice'}</p>
                    <p className="text-xs text-slate-500">{invoice.periodStart ? new Date(invoice.periodStart).toLocaleDateString() : 'Pending period'}</p>
                  </div>
                  <p className="text-sm font-semibold text-rose-700">
                    {invoice.amount.toLocaleString()} {invoice.currency}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="surface-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Branch memberships</h2>
            <p className="text-xs text-slate-500">Track approvals and request additional branches.</p>
          </div>
          <Link className="text-sm font-medium text-red-600" href="/profile">
            Manage profile
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {branchMemberships.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No branch memberships yet. Use the profile page to request one.
            </li>
          )}
          {branchMemberships.map((membership) => (
            <li key={membership.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-900">
                  {branchMap.get(membership.branchId)?.name ?? `Branch ${membership.branchId}`}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    membership.status === 'approved'
                      ? 'bg-red-100 text-red-800'
                      : membership.status === 'requested'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {membership.status}
                </span>
              </div>
              {membership.note ? <p className="mt-1 text-xs text-slate-500">{membership.note}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card p-4">
        <h2 className="text-lg font-semibold text-slate-900">Announcements</h2>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Latest updates</span>
          <Link href="/announcements" className="text-red-600 underline">
            View all
          </Link>
        </div>
        {announcements.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements available.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{announcement.title}</p>
                  <span className="btn-pill border-slate-200 text-[11px] uppercase text-slate-600">
                    {announcement.scopeType}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleString() : 'Recently'}
                </p>
                <p className="text-sm text-slate-600">{announcement.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}



