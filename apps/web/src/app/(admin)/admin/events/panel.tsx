'use client';

import type { BranchDTO, ClassSetDTO, EventDTO } from '@gcuoba/types';
import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '@/lib/api';
import { PaginationControls } from '@/components/ui/pagination-controls';

type EventsPanelProps = {
  initialEvents: EventDTO[];
  branches: BranchDTO[];
  classes: ClassSetDTO[];
  authToken: string;
  activeScopeType?: 'global' | 'branch' | 'class';
  activeScopeId?: string | null;
};

type EventFormState = {
  title: string;
  description: string;
  scopeType: 'global' | 'branch' | 'class';
  scopeId: string;
  location: string;
  startAt: string;
  endAt: string;
  status: 'draft' | 'published' | 'cancelled';
};

type ScopeAccess = {
  hasGlobalAccess: boolean;
  hasBranchAccess: boolean;
  hasClassAccess: boolean;
  branchIds: string[];
  classIds: string[];
};

type EventsViewTab = 'manage' | 'create';

export function EventsPanel({
  initialEvents,
  branches,
  classes,
  authToken,
  activeScopeType,
  activeScopeId,
}: EventsPanelProps) {
  const [events, setEvents] = useState(initialEvents);
  const [scopeAccess, setScopeAccess] = useState<ScopeAccess | null>(null);
  const [formState, setFormState] = useState<EventFormState>({
    title: '',
    description: '',
    scopeType: 'global',
    scopeId: '',
    location: '',
    startAt: '',
    endAt: '',
    status: 'draft',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'cancelled'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'branch' | 'class'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [viewTab, setViewTab] = useState<EventsViewTab>('manage');
  const isScopeLocked = Boolean(activeScopeType);

  useEffect(() => {
    fetchJson<ScopeAccess>('/roles/access/scopes', { token: authToken })
      .then(setScopeAccess)
      .catch(() => setScopeAccess(null));
  }, [authToken]);

  const allowedScopeTypes = useMemo(() => {
    if (activeScopeType) {
      return [activeScopeType] as Array<EventFormState['scopeType']>;
    }
    if (!scopeAccess) {
      return ['global', 'branch', 'class'] as Array<EventFormState['scopeType']>;
    }
    const rows: Array<EventFormState['scopeType']> = [];
    if (scopeAccess.hasGlobalAccess) {
      rows.push('global');
    }
    if (scopeAccess.hasBranchAccess) {
      rows.push('branch');
    }
    if (scopeAccess.hasClassAccess) {
      rows.push('class');
    }
    return rows.length > 0 ? rows : (['global'] as Array<EventFormState['scopeType']>);
  }, [activeScopeType, scopeAccess]);

  const filteredBranches = useMemo(() => {
    if (activeScopeType === 'branch' && activeScopeId) {
      return branches.filter((entry) => entry.id === activeScopeId);
    }
    if (!scopeAccess || scopeAccess.hasGlobalAccess) {
      return branches;
    }
    const allowed = new Set(scopeAccess.branchIds);
    return branches.filter((entry) => allowed.has(entry.id));
  }, [activeScopeId, activeScopeType, branches, scopeAccess]);

  const filteredClasses = useMemo(() => {
    if (activeScopeType === 'class' && activeScopeId) {
      return classes.filter((entry) => entry.id === activeScopeId);
    }
    if (!scopeAccess || scopeAccess.hasGlobalAccess) {
      return classes;
    }
    const allowed = new Set(scopeAccess.classIds);
    return classes.filter((entry) => allowed.has(entry.id));
  }, [activeScopeId, activeScopeType, classes, scopeAccess]);

  useEffect(() => {
    setFormState((prev) => {
      const nextScopeType = allowedScopeTypes.includes(prev.scopeType) ? prev.scopeType : allowedScopeTypes[0];
      const availableIds =
        nextScopeType === 'branch'
          ? filteredBranches.map((entry) => entry.id)
          : nextScopeType === 'class'
            ? filteredClasses.map((entry) => entry.id)
            : [];
      const nextScopeId =
        nextScopeType === 'global'
          ? ''
          : availableIds.includes(prev.scopeId)
            ? prev.scopeId
            : availableIds[0] ?? '';
      if (nextScopeType === prev.scopeType && nextScopeId === prev.scopeId) {
        return prev;
      }
      return {
        ...prev,
        scopeType: nextScopeType,
        scopeId: nextScopeId,
      };
    });
  }, [allowedScopeTypes, filteredBranches, filteredClasses]);

  const scopeOptions = useMemo(() => {
    if (formState.scopeType === 'branch') {
      return filteredBranches.map((entry) => ({ id: entry.id, label: entry.name }));
    }
    if (formState.scopeType === 'class') {
      return filteredClasses.map((entry) => ({ id: entry.id, label: entry.label }));
    }
    return [];
  }, [filteredBranches, filteredClasses, formState.scopeType]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((entry) => {
      if (statusFilter !== 'all' && (entry.status ?? 'draft') !== statusFilter) {
        return false;
      }
      if (scopeFilter !== 'all' && entry.scopeType !== scopeFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return (
        entry.title.toLowerCase().includes(normalizedQuery) ||
        (entry.description ?? '').toLowerCase().includes(normalizedQuery) ||
        (entry.location ?? '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [events, query, scopeFilter, statusFilter]);

  const pagedEvents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [query, scopeFilter, statusFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredEvents.length, page, pageSize]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const effectiveScopeType = activeScopeType ?? formState.scopeType;
      const effectiveScopeId =
        effectiveScopeType === 'global' ? undefined : activeScopeId ?? formState.scopeId;
      const payload = {
        title: formState.title,
        description: formState.description || undefined,
        scopeType: effectiveScopeType,
        scopeId: effectiveScopeId,
        location: formState.location || undefined,
        startAt: new Date(formState.startAt).toISOString(),
        endAt: formState.endAt ? new Date(formState.endAt).toISOString() : undefined,
        status: formState.status,
      };
      const created = await fetchJson<EventDTO>('/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        token: authToken,
      });
      setEvents((prev) => [created, ...prev]);
      const resetScopeType = activeScopeType ?? allowedScopeTypes[0];
      const resetScopeId =
        resetScopeType === 'branch'
          ? activeScopeType === 'branch'
            ? activeScopeId ?? ''
            : filteredBranches[0]?.id ?? ''
          : resetScopeType === 'class'
            ? activeScopeType === 'class'
              ? activeScopeId ?? ''
              : filteredClasses[0]?.id ?? ''
            : '';
      setFormState({
        title: '',
        description: '',
        scopeType: resetScopeType,
        scopeId: resetScopeId,
        location: '',
        startAt: '',
        endAt: '',
        status: 'draft',
      });
      setViewTab('manage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: 'draft' | 'published' | 'cancelled') {
    const prompt =
      status === 'published'
        ? 'Publish this event now?'
        : status === 'cancelled'
          ? 'Cancel this event?'
          : 'Move this event back to draft?';
    if (!window.confirm(prompt)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await fetchJson<EventDTO>(`/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        token: authToken,
      });
      setEvents((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this event?')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await fetchJson(`/events/${id}`, { method: 'DELETE', token: authToken });
      setEvents((prev) => prev.filter((entry) => entry.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event.');
    } finally {
      setLoading(false);
    }
  }

  function resolveScopeLabel(entry: EventDTO) {
    if (entry.scopeType === 'branch') {
      return branches.find((branch) => branch.id === entry.scopeId)?.name ?? entry.scopeId ?? 'Branch';
    }
    if (entry.scopeType === 'class') {
      return classes.find((classSet) => classSet.id === entry.scopeId)?.label ?? entry.scopeId ?? 'Class';
    }
    return 'Global';
  }

  return (
    <section className="space-y-6 surface-card p-6 shadow-sm">
      {(error || loading) && (
        <div
          className={`status-banner text-sm ${
            error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          {error ?? (loading ? 'Saving...' : null)}
        </div>
      )}

      <section className="rounded-xl border border-red-100 bg-red-50/70 p-2 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              viewTab === 'manage'
                ? 'border-red-300 bg-red-600 text-white shadow-sm'
                : 'border-red-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
            }`}
            onClick={() => setViewTab('manage')}
          >
            Manage events
          </button>
          <button
            type="button"
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              viewTab === 'create'
                ? 'border-red-300 bg-red-600 text-white shadow-sm'
                : 'border-red-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
            }`}
            onClick={() => setViewTab('create')}
          >
            Create event
          </button>
        </div>
      </section>

      {viewTab === 'create' && (
      <form onSubmit={handleCreate} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs uppercase text-slate-500">
            Title
            <input
              required
              className="field-input"
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>
          <label className="text-xs uppercase text-slate-500">
            Scope
            <select
              className="field-input"
              value={formState.scopeType}
              disabled={isScopeLocked}
              onChange={(event) =>
                setFormState((prev) => {
                  const nextScopeType = event.target.value as EventFormState['scopeType'];
                  const nextScopeId =
                    nextScopeType === 'branch'
                      ? filteredBranches[0]?.id ?? ''
                      : nextScopeType === 'class'
                        ? filteredClasses[0]?.id ?? ''
                        : '';
                  return {
                    ...prev,
                    scopeType: nextScopeType,
                    scopeId: nextScopeId,
                  };
                })
              }
            >
              {allowedScopeTypes.map((scopeType) => (
                <option key={scopeType} value={scopeType}>
                  {scopeType === 'global' ? 'Global' : scopeType === 'branch' ? 'Branch' : 'Class'}
                </option>
              ))}
            </select>
          </label>
        </div>
        {formState.scopeType !== 'global' && (
          <label className="text-xs uppercase text-slate-500">
            Scope target
            <select
              required
              className="field-input"
              value={formState.scopeId}
              disabled={isScopeLocked}
              onChange={(event) => setFormState((prev) => ({ ...prev, scopeId: event.target.value }))}
            >
              <option value="">Select scope</option>
              {scopeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs uppercase text-slate-500">
          Description
          <textarea
            className="field-input"
            rows={3}
            value={formState.description}
            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs uppercase text-slate-500">
            Start (local time)
            <input
              type="datetime-local"
              required
              className="field-input"
              value={formState.startAt}
              onChange={(event) => setFormState((prev) => ({ ...prev, startAt: event.target.value }))}
            />
          </label>
          <label className="text-xs uppercase text-slate-500">
            End (optional)
            <input
              type="datetime-local"
              className="field-input"
              value={formState.endAt}
              onChange={(event) => setFormState((prev) => ({ ...prev, endAt: event.target.value }))}
            />
          </label>
        </div>
        <label className="text-xs uppercase text-slate-500">
          Location
          <input
            className="field-input"
            value={formState.location}
            onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
          />
        </label>
        <label className="text-xs uppercase text-slate-500">
          Status
          <select
            className="field-input"
            value={formState.status}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, status: event.target.value as EventFormState['status'] }))
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <button type="submit" className="btn-primary">
          Create event
        </button>
      </form>
      )}

      {viewTab === 'manage' && (
      <div className="rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Events</h3>
          <span className="text-xs text-slate-500">{filteredEvents.length} record(s)</span>
        </div>
        <div className="grid gap-3 border-b border-slate-100 px-4 py-3 md:grid-cols-3">
          <label className="text-xs text-slate-500">
            Search
            <input
              className="field-input text-sm"
              placeholder="Search title, description, or location"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="text-xs text-slate-500">
            Status
            <select
              className="field-input text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'draft' | 'published' | 'cancelled')}
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Scope
            <select
              className="field-input text-sm"
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value as 'all' | 'global' | 'branch' | 'class')}
            >
              <option value="all">All</option>
              <option value="global">Global</option>
              <option value="branch">Branch</option>
              <option value="class">Class</option>
            </select>
          </label>
        </div>
        {filteredEvents.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No events scheduled.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pagedEvents.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                  <p className="text-xs text-slate-500">
                    {entry.startAt ? new Date(entry.startAt).toLocaleString() : 'TBD'}
                    {entry.location ? ` - ${entry.location}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    Scope: {entry.scopeType} - {resolveScopeLabel(entry)}
                  </p>
                  <p className="text-xs text-slate-500">
                    RSVP: {entry.attendeeCount ?? 0} attending | Contributions:{' '}
                    {(entry.contributionTotal ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{entry.status ?? 'draft'}</span>
                  <button type="button" className="btn-pill" onClick={() => handleStatusChange(entry.id, 'published')}>
                    Publish
                  </button>
                  <button type="button" className="btn-pill" onClick={() => handleStatusChange(entry.id, 'draft')}>
                    Draft
                  </button>
                  <button type="button" className="btn-pill" onClick={() => handleStatusChange(entry.id, 'cancelled')}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-pill border-rose-200 bg-rose-50 text-rose-700"
                    onClick={() => handleDelete(entry.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="px-4 pb-4">
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={filteredEvents.length}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        </div>
      </div>
      )}
    </section>
  );
}
