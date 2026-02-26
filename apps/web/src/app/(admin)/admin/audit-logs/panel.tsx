'use client';

import type { AuditLogDTO } from '@gcuoba/types';
import { fetchJson } from '@/lib/api';
import { useState } from 'react';

type AuditLogsPanelProps = {
  initialLogs: AuditLogDTO[];
  authToken: string;
  activeScopeType?: 'global' | 'branch' | 'class';
  activeScopeId?: string | null;
};

type ScopeFilter = '' | 'global' | 'branch' | 'class' | 'private';

export function AuditLogsPanel({
  initialLogs,
  authToken,
  activeScopeType,
  activeScopeId,
}: AuditLogsPanelProps) {
  const [logs, setLogs] = useState<AuditLogDTO[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeType, setScopeType] = useState<ScopeFilter>((activeScopeType ?? '') as ScopeFilter);
  const [scopeId, setScopeId] = useState(activeScopeId ?? '');
  const [actorUserId, setActorUserId] = useState('');
  const [action, setAction] = useState('');
  const scopeLocked = Boolean(activeScopeType);

  async function applyFilters() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '150');
      const effectiveScopeType = (activeScopeType ?? scopeType) as ScopeFilter;
      const effectiveScopeId = activeScopeType ? activeScopeId ?? '' : scopeId;
      if (effectiveScopeType) {
        params.set('scopeType', effectiveScopeType);
      }
      if (effectiveScopeId.trim()) {
        params.set('scopeId', effectiveScopeId.trim());
      }
      if (actorUserId.trim()) {
        params.set('actorUserId', actorUserId.trim());
      }
      if (action.trim()) {
        params.set('action', action.trim());
      }
      const data = await fetchJson<AuditLogDTO[]>(`/audit-logs?${params.toString()}`, {
        token: authToken,
      });
      setLogs(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <section className="surface-card p-4">
        <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="text-xs text-slate-500">
            Scope type
            <select
              className="field-input text-sm"
              value={activeScopeType ?? scopeType}
              disabled={scopeLocked}
              onChange={(event) => setScopeType(event.target.value as ScopeFilter)}
            >
              <option value="">All</option>
              <option value="global">Global</option>
              <option value="branch">Branch</option>
              <option value="class">Class</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Scope ID
            <input
              className="field-input text-sm"
              value={activeScopeType ? activeScopeId ?? '' : scopeId}
              disabled={scopeLocked}
              onChange={(event) => setScopeId(event.target.value)}
              placeholder="optional"
            />
          </label>
          <label className="text-xs text-slate-500">
            Actor user ID
            <input
              className="field-input text-sm"
              value={actorUserId}
              onChange={(event) => setActorUserId(event.target.value)}
              placeholder="optional"
            />
          </label>
          <label className="text-xs text-slate-500">
            Action
            <input
              className="field-input text-sm"
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="e.g. welfare_case.created"
            />
          </label>
        </div>
        <div className="mt-3">
          <button
            type="button"
            className="btn-primary disabled:opacity-50"
            onClick={() => void applyFilters()}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Apply filters'}
          </button>
        </div>
      </section>

      {error && (
        <div className="status-banner status-banner-error">
          {error}
        </div>
      )}

      <section className="surface-card p-4">
        <h2 className="text-lg font-semibold text-slate-900">Entries ({logs.length})</h2>
        {logs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No audit entries found.</p>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Time</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Actor</th>
                  <th className="py-2">Resource</th>
                  <th className="py-2">Scope</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="table-row">
                    <td className="py-2 text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-2">{log.action}</td>
                    <td className="py-2 text-xs">{log.actorUserId}</td>
                    <td className="py-2 text-xs">
                      {log.resourceType}
                      {log.resourceId ? `:${log.resourceId}` : ''}
                    </td>
                    <td className="py-2 text-xs">
                      {log.scopeType ?? '-'}
                      {log.scopeId ? `:${log.scopeId}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}



