'use client';

import type { DuesBroadsheetDTO, DuesBroadsheetStatus } from '@gcuoba/types';
import { fetchJson } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { PaginationControls } from '@/components/ui/pagination-controls';

type DuesBroadsheetPanelProps = {
  endpoint: string;
  authToken: string;
  initialData: DuesBroadsheetDTO;
  title?: string;
  subtitle?: string;
};

export function DuesBroadsheetPanel({
  endpoint,
  authToken,
  initialData,
  title = 'Dues broadsheet',
  subtitle = 'Track yearly dues position by member.',
}: DuesBroadsheetPanelProps) {
  const [data, setData] = useState<DuesBroadsheetDTO>(initialData);
  const [year, setYear] = useState(String(initialData.year));
  const [query, setQuery] = useState(initialData.query ?? '');
  const [status, setStatus] = useState<DuesBroadsheetStatus | ''>(initialData.status ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.rows.slice(start, start + pageSize);
  }, [data.rows, page, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(data.rows.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [data.rows.length, page, pageSize]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const parsedYear = Number(year);
      if (Number.isInteger(parsedYear)) {
        params.set('year', String(parsedYear));
      }
      if (query.trim()) {
        params.set('query', query.trim());
      }
      if (status) {
        params.set('status', status);
      }
      const path = appendQuery(endpoint, params);
      const next = await fetchJson<DuesBroadsheetDTO>(path, { token: authToken });
      setData(next);
      setPage(1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dues broadsheet.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load();
  }

  return (
    <section className="surface-card p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-4">
        <label className="text-sm text-slate-600">
          Year
          <input
            type="number"
            min="2000"
            max="2100"
            className="field-input"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </label>
        <label className="text-sm text-slate-600 md:col-span-2">
          Search
          <input
            className="field-input"
            placeholder="Search by member name or alumni number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="text-sm text-slate-600">
          Filter
          <select
            className="field-input"
            value={status}
            onChange={(event) => setStatus(event.target.value as DuesBroadsheetStatus | '')}
          >
            <option value="">All statuses</option>
            <option value="clear">Not owing</option>
            <option value="owing_current">Owing current year</option>
            <option value="outstanding_prior">Outstanding from previous years</option>
          </select>
        </label>
        <div className="md:col-span-4">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Loading...' : 'Apply filters'}
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
      )}

      <div className="grid gap-3 md:grid-cols-5">
        <StatCard label="Members" value={formatCompactNumber(data.totals.members)} />
        <StatCard label="Current year dues" value={formatAmount(data.totals.currentYearDues, data.currency)} />
        <StatCard label="Paid so far" value={formatAmount(data.totals.paidSoFar, data.currency)} positive />
        <StatCard label="Outstanding (prior)" value={formatAmount(data.totals.priorOutstanding, data.currency)} warning />
        <StatCard label="Balance owing" value={formatAmount(data.totals.balanceOwing, data.currency)} negative />
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
            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-sm text-slate-500">
                  No dues records found for the selected filters.
                </td>
              </tr>
            )}
            {pagedRows.map((row) => (
              <tr key={row.userId} className={`table-row ${statusRowClass(row.status)}`}>
                <td className="py-2">
                  <div className="font-medium text-slate-900">{row.memberName}</div>
                  <div className="text-xs text-slate-500">{row.alumniNumber ?? 'Alumni number pending'}</div>
                </td>
                <td className="py-2 text-sm text-slate-700">
                  {row.joinedAt ? formatDate(row.joinedAt) : 'N/A'}
                </td>
                <td className="py-2 text-sm text-slate-700">{formatAmount(row.currentYearDues, row.currency)}</td>
                <td className="py-2 text-sm text-slate-700">{formatAmount(row.priorOutstanding, row.currency)}</td>
                <td className="py-2 text-sm text-slate-700">{formatAmount(row.paidSoFar, row.currency)}</td>
                <td className="py-2 text-sm font-semibold text-slate-900">
                  {formatAmount(row.balanceOwing, row.currency)}
                </td>
                <td className="py-2">
                  <span className={`btn-pill border ${statusPillClass(row.status)}`}>
                    {statusLabel(row.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={data.rows.length}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
      />
    </section>
  );
}

function appendQuery(endpoint: string, params: URLSearchParams) {
  const [path, raw = ''] = endpoint.split('?');
  const merged = new URLSearchParams(raw);
  params.forEach((value, key) => merged.set(key, value));
  const query = merged.toString();
  return query ? `${path}?${query}` : path;
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
