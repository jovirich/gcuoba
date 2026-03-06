'use client';

import type { NotificationDTO } from '@gcuoba/types';
import { fetchJson } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { PaginationControls } from '@/components/ui/pagination-controls';

type NotificationsPanelProps = {
  initialNotifications: NotificationDTO[];
  authToken: string;
};

export function NotificationsPanel({ initialNotifications, authToken }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<NotificationDTO[]>(initialNotifications);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return notifications.filter((notification) => {
      if (filter === 'read' && !notification.read) {
        return false;
      }
      if (filter === 'unread' && notification.read) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return (
        notification.title.toLowerCase().includes(normalizedQuery) ||
        notification.message.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [filter, notifications, query]);

  const pagedNotifications = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredNotifications.length, page, pageSize]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const latest = await fetchJson<NotificationDTO[]>('/notifications/me?limit=100', {
        token: authToken,
      });
      setNotifications(latest);
    } catch (reloadError) {
      setError(reloadError instanceof Error ? reloadError.message : 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  async function markRead(notificationId: string) {
    setBusyId(notificationId);
    setError(null);
    setMessage(null);
    try {
      await fetchJson<NotificationDTO>(`/notifications/${notificationId}/read`, {
        method: 'POST',
        token: authToken,
      });
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true, readAt: new Date().toISOString() }
            : notification,
        ),
      );
      setMessage('Notification marked as read.');
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Failed to mark notification.');
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await fetchJson<{ updated: number }>('/notifications/me/read-all', {
        method: 'POST',
        token: authToken,
      });
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true, readAt: new Date().toISOString() })),
      );
      setMessage('All notifications marked as read.');
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Failed to mark all notifications.');
    } finally {
      setLoading(false);
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

      <section className="surface-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent notifications</h2>
            <p className="text-xs text-slate-500">{unreadCount} unread</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-pill"
              onClick={() => void reload()}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              type="button"
              className="btn-primary disabled:opacity-50"
              onClick={() => void markAllRead()}
              disabled={loading || unreadCount === 0}
            >
              Mark all read
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-xs text-slate-500">
            Search
            <input
              className="field-input text-sm"
              placeholder="Search notifications"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="text-xs text-slate-500">
            Filter
            <select
              className="field-input text-sm"
              value={filter}
              onChange={(event) => setFilter(event.target.value as 'all' | 'unread' | 'read')}
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </label>
          <div className="text-xs text-slate-500 md:pt-6">
            {filteredNotifications.length} record(s)
          </div>
        </div>
        {filteredNotifications.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pagedNotifications.map((notification) => (
              <li
                key={notification.id}
                className={`rounded-xl border p-3 ${
                  notification.read ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                    <p className="text-sm text-slate-600">{notification.message}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <button
                      type="button"
                      className="btn-pill border-red-200 bg-white text-red-700"
                      onClick={() => void markRead(notification.id)}
                      disabled={busyId === notification.id}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={filteredNotifications.length}
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




