'use client';

import type { AnnouncementDTO, BranchDTO, ClassSetDTO } from '@gcuoba/types';
import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '@/lib/api';

type AnnouncementsPanelProps = {
  initialAnnouncements: AnnouncementDTO[];
  branches: BranchDTO[];
  classes: ClassSetDTO[];
  authToken: string;
  activeScopeType?: 'global' | 'branch' | 'class';
  activeScopeId?: string | null;
};

type FormState = {
  title: string;
  body: string;
  scopeType: 'global' | 'branch' | 'class';
  scopeId: string;
  status: 'draft' | 'published';
};

export function AnnouncementsPanel({
  initialAnnouncements,
  branches,
  classes,
  authToken,
  activeScopeType,
  activeScopeId,
}: AnnouncementsPanelProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [formState, setFormState] = useState<FormState>({
    title: '',
    body: '',
    scopeType: 'global',
    scopeId: '',
    status: 'draft',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isScopeLocked = Boolean(activeScopeType);

  const effectiveScopeType = activeScopeType ?? formState.scopeType;
  const effectiveScopeId =
    effectiveScopeType === 'global' ? '' : activeScopeId ?? formState.scopeId;

  useEffect(() => {
    if (!activeScopeType) {
      return;
    }
    setFormState((prev) => ({
      ...prev,
      scopeType: activeScopeType,
      scopeId:
        activeScopeType === 'global' ? '' : activeScopeId ?? prev.scopeId,
    }));
  }, [activeScopeId, activeScopeType]);

  const scopeOptions = useMemo(() => {
    if (effectiveScopeType === 'branch') {
      if (activeScopeType === 'branch' && activeScopeId) {
        return branches
          .filter((entry) => entry.id === activeScopeId)
          .map((entry) => ({ id: entry.id, label: entry.name }));
      }
      return branches.map((entry) => ({ id: entry.id, label: entry.name }));
    }
    if (effectiveScopeType === 'class') {
      if (activeScopeType === 'class' && activeScopeId) {
        return classes
          .filter((entry) => entry.id === activeScopeId)
          .map((entry) => ({ id: entry.id, label: entry.label }));
      }
      return classes.map((entry) => ({ id: entry.id, label: entry.label }));
    }
    return [];
  }, [activeScopeId, activeScopeType, branches, classes, effectiveScopeType]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await fetchJson<AnnouncementDTO>('/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formState.title,
          body: formState.body,
          scopeType: effectiveScopeType,
          scopeId: effectiveScopeType === 'global' ? undefined : effectiveScopeId,
          status: formState.status,
        }),
        token: authToken,
      });
      setAnnouncements((prev) => [created, ...prev]);
      setFormState({
        title: '',
        body: '',
        scopeType: activeScopeType ?? 'global',
        scopeId:
          activeScopeType === 'branch' || activeScopeType === 'class'
            ? activeScopeId ?? ''
            : '',
        status: 'draft',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create announcement.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, nextStatus: 'draft' | 'published') {
    setLoading(true);
    setError(null);
    try {
      const updated = await fetchJson<AnnouncementDTO>(`/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
        token: authToken,
      });
      setAnnouncements((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update announcement.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await fetchJson(`/announcements/${id}`, {
        method: 'DELETE',
        token: authToken,
      });
      setAnnouncements((prev) => prev.filter((entry) => entry.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete announcement.');
    } finally {
      setLoading(false);
    }
  }

  function resolveScopeLabel(entry: AnnouncementDTO) {
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
              value={effectiveScopeType}
              disabled={isScopeLocked}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  scopeType: event.target.value as FormState['scopeType'],
                  scopeId: '',
                }))
              }
            >
              <option value="global">Global</option>
              <option value="branch">Branch</option>
              <option value="class">Class</option>
            </select>
          </label>
        </div>
        {effectiveScopeType !== 'global' && (
          <label className="text-xs uppercase text-slate-500">
            Scope target
            <select
              required
              className="field-input"
              value={effectiveScopeId}
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
          Body
          <textarea
            required
            className="field-input"
            rows={4}
            value={formState.body}
            onChange={(event) => setFormState((prev) => ({ ...prev, body: event.target.value }))}
          />
        </label>
        <label className="text-xs uppercase text-slate-500">
          Status
          <select
            className="field-input"
            value={formState.status}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, status: event.target.value as FormState['status'] }))
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <button type="submit" className="btn-primary">
          Create announcement
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Existing announcements</h3>
          <span className="text-xs text-slate-500">{announcements.length} record(s)</span>
        </div>
        {announcements.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No announcements created yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {announcements.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                  <p className="text-xs text-slate-500">
                    Scope: {entry.scopeType} - {resolveScopeLabel(entry)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {entry.publishedAt ? new Date(entry.publishedAt).toLocaleString() : 'Not published'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={`rounded-full px-3 py-1 ${
                      entry.status === 'published' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {entry.status}
                  </span>
                  {entry.status === 'draft' ? (
                    <button type="button" className="btn-pill" onClick={() => handleStatusChange(entry.id, 'published')}>
                      Publish
                    </button>
                  ) : (
                    <button type="button" className="btn-pill" onClick={() => handleStatusChange(entry.id, 'draft')}>
                      Unpublish
                    </button>
                  )}
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
      </div>
    </section>
  );
}

