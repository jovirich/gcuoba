'use client';

import type { DuesBroadsheetDTO, DuesBroadsheetRowDTO, DuesBroadsheetStatus } from '@gcuoba/types';
import { useMemo, useState } from 'react';
import { fetchJson } from '@/lib/api';
import { DuesBroadsheetPanel } from './dues-broadsheet-panel';

type MemberDuesTabsPanelProps = {
  userId: string;
  authToken: string;
  initialClassData: DuesBroadsheetDTO;
};

type ActiveTab = 'my' | 'class';

type MyDuesState = {
  year: string;
  row: DuesBroadsheetRowDTO | null;
  currency: string;
  loading: boolean;
  error: string | null;
};

export function MemberDuesTabsPanel({ userId, authToken, initialClassData }: MemberDuesTabsPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('my');
  const [myDues, setMyDues] = useState<MyDuesState>(() => ({
    year: String(initialClassData.year),
    row: pickMemberRow(initialClassData, userId),
    currency: initialClassData.currency,
    loading: false,
    error: null,
  }));

  const myStatusLabel = useMemo(() => {
    if (!myDues.row) {
      return 'No dues row found';
    }
    return statusLabel(myDues.row.status);
  }, [myDues.row]);

  async function loadMyDues() {
    setMyDues((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const parsedYear = Number(myDues.year);
      const params = new URLSearchParams();
      if (Number.isInteger(parsedYear)) {
        params.set('year', String(parsedYear));
      }
      const next = await fetchJson<DuesBroadsheetDTO>(`/finance/dues/me?${params.toString()}`, {
        token: authToken,
      });
      setMyDues((prev) => ({
        ...prev,
        row: pickMemberRow(next, userId),
        currency: next.currency,
        error: null,
      }));
    } catch (error) {
      setMyDues((prev) => ({
        ...prev,
        error: extractErrorMessage(error),
      }));
    } finally {
      setMyDues((prev) => ({ ...prev, loading: false }));
    }
  }

  function handleMyDuesSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadMyDues();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn-pill text-sm ${
            activeTab === 'my'
              ? 'border-red-300 bg-red-100 text-red-800'
              : 'border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
          onClick={() => setActiveTab('my')}
        >
          My dues
        </button>
        <button
          type="button"
          className={`btn-pill text-sm ${
            activeTab === 'class'
              ? 'border-red-300 bg-red-100 text-red-800'
              : 'border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
          onClick={() => setActiveTab('class')}
        >
          Class dues
        </button>
      </div>

      {activeTab === 'my' ? (
        <section className="surface-card p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">My dues</h2>
            <p className="text-sm text-slate-500">View your personal dues position for the selected year.</p>
          </div>

          <form onSubmit={handleMyDuesSubmit} className="grid gap-3 md:grid-cols-4">
            <label className="text-sm text-slate-600">
              Year
              <input
                type="number"
                min="2000"
                max="2100"
                className="field-input"
                value={myDues.year}
                onChange={(event) =>
                  setMyDues((prev) => ({ ...prev, year: event.target.value }))
                }
              />
            </label>
            <div className="md:col-span-3 flex items-end">
              <button type="submit" className="btn-primary" disabled={myDues.loading}>
                {myDues.loading ? 'Loading...' : 'Load my dues'}
              </button>
            </div>
          </form>

          {myDues.error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {myDues.error}
            </p>
          )}

          {!myDues.row ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No dues record found for your profile in this year.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-5">
                <StatCard label="Current year dues" value={formatAmount(myDues.row.currentYearDues, myDues.row.currency)} />
                <StatCard label="Paid so far" value={formatAmount(myDues.row.paidSoFar, myDues.row.currency)} positive />
                <StatCard label="Outstanding (prior)" value={formatAmount(myDues.row.priorOutstanding, myDues.row.currency)} warning />
                <StatCard label="Balance owing" value={formatAmount(myDues.row.balanceOwing, myDues.row.currency)} negative />
                <StatCard label="Status" value={myStatusLabel} />
              </div>

              <div className="table-wrap">
                <table className="table-base">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Member name</th>
                      <th className="py-2">Date joined</th>
                      <th className="py-2">Current year dues</th>
                      <th className="py-2">Outstanding</th>
                      <th className="py-2">Paid so far</th>
                      <th className="py-2">Balance owing</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={`table-row ${statusRowClass(myDues.row.status)}`}>
                      <td className="py-2">
                        <div className="font-medium text-slate-900">{myDues.row.memberName}</div>
                        <div className="text-xs text-slate-500">{myDues.row.alumniNumber ?? 'Alumni number pending'}</div>
                      </td>
                      <td className="py-2 text-sm text-slate-700">
                        {myDues.row.joinedAt ? formatDate(myDues.row.joinedAt) : 'N/A'}
                      </td>
                      <td className="py-2 text-sm text-slate-700">
                        {formatAmount(myDues.row.currentYearDues, myDues.row.currency)}
                      </td>
                      <td className="py-2 text-sm text-slate-700">
                        {formatAmount(myDues.row.priorOutstanding, myDues.row.currency)}
                      </td>
                      <td className="py-2 text-sm text-slate-700">
                        {formatAmount(myDues.row.paidSoFar, myDues.row.currency)}
                      </td>
                      <td className="py-2 text-sm font-semibold text-slate-900">
                        {formatAmount(myDues.row.balanceOwing, myDues.row.currency)}
                      </td>
                      <td className="py-2">
                        <span className={`btn-pill border ${statusPillClass(myDues.row.status)}`}>
                          {statusLabel(myDues.row.status)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : (
        <DuesBroadsheetPanel
          endpoint="/finance/dues/me"
          authToken={authToken}
          initialData={initialClassData}
          title="Class dues view"
          subtitle="Search classmates and filter by dues position."
        />
      )}
    </section>
  );
}

function pickMemberRow(data: DuesBroadsheetDTO, userId: string) {
  return data.rows.find((row) => row.userId === userId) ?? null;
}

function extractErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Failed to load dues records.';
  }
  const match = error.message.match(/^API\s+\d+:\s*(.*)$/i);
  if (!match) {
    return error.message;
  }
  const payload = match[1]?.trim();
  if (!payload) {
    return error.message;
  }
  try {
    const parsed = JSON.parse(payload) as { message?: string };
    if (parsed?.message) {
      return parsed.message;
    }
  } catch {
    return payload;
  }
  return error.message;
}

function formatAmount(value: number, currency: string) {
  return `${formatCompactNumber(value)} ${currency}`;
}

function formatCompactNumber(value: number) {
  const normalized = Number.isFinite(value) ? value : 0;
  const fixed = normalized.toFixed(2);
  const [intPart, decimalPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (decimalPart === '00') {
    return grouped;
  }
  if (decimalPart.endsWith('0')) {
    return `${grouped}.${decimalPart[0]}`;
  }
  return `${grouped}.${decimalPart}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function statusLabel(status: DuesBroadsheetStatus) {
  if (status === 'clear') {
    return 'Not owing';
  }
  if (status === 'owing_current') {
    return 'Owing current year';
  }
  return 'Outstanding prior years';
}

function statusPillClass(status: DuesBroadsheetStatus) {
  if (status === 'clear') {
    return 'border-lime-200 bg-lime-50 text-lime-700';
  }
  if (status === 'owing_current') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  return 'border-rose-200 bg-rose-50 text-rose-700';
}

function statusRowClass(status: DuesBroadsheetStatus) {
  if (status === 'clear') {
    return 'bg-lime-50/30';
  }
  if (status === 'owing_current') {
    return 'bg-amber-50/35';
  }
  return 'bg-rose-50/35';
}

type StatCardProps = {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  warning?: boolean;
};

function StatCard({ label, value, positive, negative, warning }: StatCardProps) {
  const tone = positive
    ? 'text-lime-700'
    : negative
      ? 'text-rose-700'
      : warning
        ? 'text-amber-700'
        : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

