'use client';

import type {
  NotificationEmailJobDTO,
  NotificationEmailQueueProcessResultDTO,
  NotificationEmailQueueStatsDTO,
  NotificationEmailWorkerStatusDTO,
} from '@gcuoba/types';
import { fetchJson } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { PaginationControls } from '@/components/ui/pagination-controls';

type NotificationsQueuePanelProps = {
  initialStats: NotificationEmailQueueStatsDTO;
  initialJobs: NotificationEmailJobDTO[];
  initialWorkerStatus: NotificationEmailWorkerStatusDTO;
  authToken: string;
};

type JobStatusFilter = '' | 'pending' | 'sent' | 'failed';

export function NotificationsQueuePanel({
  initialStats,
  initialJobs,
  initialWorkerStatus,
  authToken,
}: NotificationsQueuePanelProps) {
  const [stats, setStats] = useState(initialStats);
  const [jobs, setJobs] = useState(initialJobs);
  const [workerStatus, setWorkerStatus] = useState(initialWorkerStatus);
  const [status, setStatus] = useState<JobStatusFilter>('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => jobs.filter((job) => job.status === 'pending').length,
    [jobs],
  );
  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return jobs;
    }
    return jobs.filter((job) => {
      return (
        job.toEmail.toLowerCase().includes(normalizedQuery) ||
        job.subject.toLowerCase().includes(normalizedQuery) ||
        job.status.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [jobs, query]);

  const pagedJobs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [query, status]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredJobs.length, page, pageSize]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '120');
      if (status) {
        params.set('status', status);
      }

      const [nextStats, nextJobs, nextWorkerStatus] = await Promise.all([
        fetchJson<NotificationEmailQueueStatsDTO>('/notifications/admin/email-queue/stats', {
          token: authToken,
        }),
        fetchJson<NotificationEmailJobDTO[]>(`/notifications/admin/email-queue?${params.toString()}`, {
          token: authToken,
        }),
        fetchJson<NotificationEmailWorkerStatusDTO>('/notifications/admin/email-queue/worker-status', {
          token: authToken,
        }),
      ]);
      setStats(nextStats);
      setJobs(nextJobs);
      setWorkerStatus(nextWorkerStatus);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to load queue.');
    } finally {
      setLoading(false);
    }
  }

  async function runWorkerNow() {
    setProcessing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await fetchJson<NotificationEmailQueueProcessResultDTO>(
        '/notifications/admin/email-queue/worker-run',
        {
          method: 'POST',
          token: authToken,
        },
      );
      setMessage(
        `Worker run: processed ${result.processed}, sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}.`,
      );
      await refresh();
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : 'Failed to run worker.');
    } finally {
      setProcessing(false);
    }
  }

  async function processQueue() {
    setProcessing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await fetchJson<NotificationEmailQueueProcessResultDTO>(
        '/notifications/admin/email-queue/process?limit=50',
        {
          method: 'POST',
          token: authToken,
        },
      );

      setMessage(
        `Processed ${result.processed} jobs, sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}.`,
      );
      await refresh();
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : 'Failed to process queue.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="space-y-4">
      {(message || error) && (
        <div
          className={`status-banner text-sm ${
            error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {error ?? message}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Failed" value={stats.failed} />
        <StatCard label="Sent" value={stats.sent} />
      </section>

      <section className="surface-card p-4">
        <h2 className="text-lg font-semibold text-slate-900">Worker status</h2>
        <div className="mt-2 grid gap-3 text-sm md:grid-cols-4">
          <StatusPill label="Enabled" value={workerStatus.enabled ? 'Yes' : 'No'} />
          <StatusPill label="Running" value={workerStatus.running ? 'Yes' : 'No'} />
          <StatusPill label="Poll (s)" value={workerStatus.pollSeconds.toString()} />
          <StatusPill label="Batch size" value={workerStatus.batchSize.toString()} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Last run: {workerStatus.lastRunAt ? new Date(workerStatus.lastRunAt).toLocaleString() : 'Never'}
        </p>
      </section>

      <section className="surface-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">
            Status
            <select
              className="field-input text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as JobStatusFilter)}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <button
            type="button"
            className="btn-secondary disabled:opacity-50"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            className="btn-primary disabled:opacity-50"
            onClick={() => void processQueue()}
            disabled={processing || pendingCount === 0}
          >
            {processing ? 'Processing...' : 'Process pending (50)'}
          </button>
          <button
            type="button"
            className="btn-secondary disabled:opacity-50"
            onClick={() => void runWorkerNow()}
            disabled={processing}
          >
            {processing ? 'Running worker...' : 'Run worker now'}
          </button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-500">
            Search current queue rows
            <input
              className="field-input text-sm"
              placeholder="Search recipient, subject, or status"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <p className="text-xs text-slate-500 md:pt-6">{filteredJobs.length} record(s)</p>
        </div>

        {filteredJobs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No queue records found.</p>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Created</th>
                  <th className="py-2">Recipient</th>
                  <th className="py-2">Subject</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Attempts</th>
                  <th className="py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {pagedJobs.map((job) => (
                  <tr key={job.id} className="table-row">
                    <td className="py-2 text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()}</td>
                    <td className="py-2">{job.toEmail}</td>
                    <td className="py-2">{job.subject}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          job.status === 'sent'
                            ? 'bg-red-100 text-red-800'
                            : job.status === 'failed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2">{job.attempts}</td>
                    <td className="py-2 text-xs text-rose-700">{job.lastError ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={filteredJobs.length}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      </section>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="surface-card p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value.toLocaleString()}</p>
    </article>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-muted p-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}




