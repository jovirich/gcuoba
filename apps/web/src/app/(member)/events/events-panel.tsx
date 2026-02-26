'use client';

import type { EventDTO, EventParticipationDTO } from '@gcuoba/types';
import { useMemo, useState } from 'react';
import { fetchJson } from '@/lib/api';

type Props = {
  initialEvents: EventDTO[];
  authToken: string;
};

type DraftParticipation = {
  status: 'interested' | 'attending' | 'not_attending';
  contributionAmount: string;
  contributionCurrency: string;
  contributionNote: string;
};

type ParticipationResponse = {
  participation: EventParticipationDTO | null;
  summary: { attendeeCount: number; contributionTotal: number };
};

function initialDraft(event: EventDTO): DraftParticipation {
  const status = event.myRsvp && event.myRsvp !== 'none' ? event.myRsvp : 'interested';
  return {
    status,
    contributionAmount: String(event.myContributionAmount ?? 0),
    contributionCurrency: 'NGN',
    contributionNote: '',
  };
}

const DEFAULT_DRAFT: DraftParticipation = {
  status: 'interested',
  contributionAmount: '0',
  contributionCurrency: 'NGN',
  contributionNote: '',
};

export function EventsPanel({ initialEvents, authToken }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});
  const [errorById, setErrorById] = useState<Record<string, string | null>>({});
  const [successById, setSuccessById] = useState<Record<string, string | null>>({});
  const [draftById, setDraftById] = useState<Record<string, DraftParticipation>>(() =>
    Object.fromEntries(initialEvents.map((event) => [event.id, initialDraft(event)])),
  );

  const orderedEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        const left = a.startAt ? new Date(a.startAt).getTime() : Number.MAX_SAFE_INTEGER;
        const right = b.startAt ? new Date(b.startAt).getTime() : Number.MAX_SAFE_INTEGER;
        return left - right;
      }),
    [events],
  );

  function setDraft(eventId: string, patch: Partial<DraftParticipation>) {
    setDraftById((prev) => ({
      ...prev,
      [eventId]: { ...(prev[eventId] ?? DEFAULT_DRAFT), ...patch },
    }));
  }

  async function saveParticipation(eventId: string) {
    const draft = draftById[eventId];
    const amount = Number(draft?.contributionAmount ?? 0);
    if (!Number.isFinite(amount) || amount < 0) {
      setErrorById((prev) => ({ ...prev, [eventId]: 'Contribution amount must be zero or greater.' }));
      return;
    }

    setBusyById((prev) => ({ ...prev, [eventId]: true }));
    setErrorById((prev) => ({ ...prev, [eventId]: null }));
    setSuccessById((prev) => ({ ...prev, [eventId]: null }));
    try {
      const payload = {
        status: draft.status,
        contributionAmount: amount,
        contributionCurrency: draft.contributionCurrency || 'NGN',
        contributionNote: draft.contributionNote || undefined,
      };
      const response = await fetchJson<ParticipationResponse>(`/events/${eventId}/participation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        token: authToken,
      });
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId
            ? {
                ...event,
                attendeeCount: response.summary.attendeeCount,
                contributionTotal: response.summary.contributionTotal,
                myRsvp: response.participation?.status ?? 'none',
                myContributionAmount: response.participation?.contributionAmount ?? 0,
              }
            : event,
        ),
      );
      setSuccessById((prev) => ({ ...prev, [eventId]: 'Participation saved.' }));
    } catch (error) {
      setErrorById((prev) => ({
        ...prev,
        [eventId]: error instanceof Error ? error.message : 'Failed to save participation.',
      }));
    } finally {
      setBusyById((prev) => ({ ...prev, [eventId]: false }));
    }
  }

  if (orderedEvents.length === 0) {
    return <p className="text-sm text-slate-500">No events available.</p>;
  }

  return (
    <section className="space-y-4">
      {orderedEvents.map((event) => {
        const draft = draftById[event.id] ?? initialDraft(event);
        const busy = Boolean(busyById[event.id]);
        const error = errorById[event.id];
        const success = successById[event.id];

        return (
          <article key={event.id} className="surface-card p-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{event.title}</h2>
              <p className="text-xs text-slate-500">
                {event.startAt ? new Date(event.startAt).toLocaleString() : 'Date to be announced'}
                {event.location ? ` - ${event.location}` : ''}
              </p>
              <p className="text-xs text-slate-500">
                {event.attendeeCount ?? 0} attending | Contributions: {(event.contributionTotal ?? 0).toLocaleString()}
              </p>
              {event.description && <p className="mt-2 text-sm text-slate-700">{event.description}</p>}
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-xs uppercase text-slate-500 md:col-span-1">
                RSVP
                <select
                  className="field-input"
                  value={draft.status}
                  onChange={(entry) => setDraft(event.id, { status: entry.target.value as DraftParticipation['status'] })}
                >
                  <option value="interested">Interested</option>
                  <option value="attending">Attending</option>
                  <option value="not_attending">Not attending</option>
                </select>
              </label>
              <label className="text-xs uppercase text-slate-500 md:col-span-1">
                Contribution Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="field-input"
                  value={draft.contributionAmount}
                  onChange={(entry) => setDraft(event.id, { contributionAmount: entry.target.value })}
                />
              </label>
              <label className="text-xs uppercase text-slate-500 md:col-span-1">
                Currency
                <input
                  className="field-input uppercase"
                  value={draft.contributionCurrency}
                  maxLength={3}
                  onChange={(entry) => setDraft(event.id, { contributionCurrency: entry.target.value.toUpperCase() })}
                />
              </label>
              <label className="text-xs uppercase text-slate-500 md:col-span-1">
                Note
                <input
                  className="field-input"
                  value={draft.contributionNote}
                  onChange={(entry) => setDraft(event.id, { contributionNote: entry.target.value })}
                />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn-primary disabled:opacity-50"
                disabled={busy}
                onClick={() => void saveParticipation(event.id)}
              >
                {busy ? 'Saving...' : 'Save response'}
              </button>
              <p className="text-xs text-slate-500">
                Your current RSVP: {event.myRsvp ?? 'none'} | Your contribution: {(event.myContributionAmount ?? 0).toLocaleString()}
              </p>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            {success && <p className="text-sm text-red-700">{success}</p>}
          </article>
        );
      })}
    </section>
  );
}
