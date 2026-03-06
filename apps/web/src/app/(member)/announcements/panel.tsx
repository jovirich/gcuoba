'use client';

import type { AnnouncementDTO } from '@gcuoba/types';
import { useMemo, useState } from 'react';
import { PaginationControls } from '@/components/ui/pagination-controls';

type Props = {
  announcements: AnnouncementDTO[];
};

export function AnnouncementsPanel({ announcements }: Props) {
  const [query, setQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | AnnouncementDTO['scopeType']>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredAnnouncements = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return announcements.filter((announcement) => {
      if (scopeFilter !== 'all' && announcement.scopeType !== scopeFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return `${announcement.title} ${announcement.body}`
        .toLowerCase()
        .includes(needle);
    });
  }, [announcements, query, scopeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedAnnouncements = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAnnouncements.slice(start, start + pageSize);
  }, [currentPage, filteredAnnouncements, pageSize]);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs text-slate-500">
          Search announcements
          <input
            className="field-input text-sm"
            placeholder="Title or content"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="text-xs text-slate-500">
          Scope
          <select
            className="field-input text-sm"
            value={scopeFilter}
            onChange={(event) => {
              setScopeFilter(event.target.value as typeof scopeFilter);
              setPage(1);
            }}
          >
            <option value="all">All scopes</option>
            <option value="global">Global</option>
            <option value="branch">Branch</option>
            <option value="class">Class</option>
          </select>
        </label>
        <p className="text-xs text-slate-500 md:pt-6">{filteredAnnouncements.length} record(s)</p>
      </div>
      {filteredAnnouncements.length === 0 ? (
        <p className="text-sm text-slate-500">No announcements available.</p>
      ) : (
        pagedAnnouncements.map((announcement) => (
          <article key={announcement.id} className="surface-card p-4">
            <h2 className="text-lg font-semibold text-slate-900">{announcement.title}</h2>
            <p className="text-xs text-slate-500">
              {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleString() : 'Posted recently'}
            </p>
            <p className="mt-2 text-sm text-slate-700">{announcement.body}</p>
          </article>
        ))
      )}
      <PaginationControls
        page={currentPage}
        pageSize={pageSize}
        total={filteredAnnouncements.length}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
      />
    </section>
  );
}
