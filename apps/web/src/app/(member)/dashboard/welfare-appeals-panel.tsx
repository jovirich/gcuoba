'use client';

import type { WelfareCaseDTO } from '@gcuoba/types';
import { buildApiUrl } from '@/lib/api';
import { useState } from 'react';
import Link from 'next/link';

type WelfareAppealsPanelProps = {
  cases: WelfareCaseDTO[];
  authToken: string;
};

type ContributionDraft = {
  amount: string;
  notes: string;
  paidAt: string;
  evidence: File | null;
};

type CaseMessage = {
  tone: 'success' | 'error';
  text: string;
};

function nowLocalDateTimeValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function emptyDraft(): ContributionDraft {
  return {
    amount: '',
    notes: '',
    paidAt: nowLocalDateTimeValue(),
    evidence: null,
  };
}

export function WelfareAppealsPanel({ cases, authToken }: WelfareAppealsPanelProps) {
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ContributionDraft>>({});
  const [messages, setMessages] = useState<Record<string, CaseMessage>>({});
  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);
  const [fileInputVersion, setFileInputVersion] = useState<Record<string, number>>({});

  function getDraft(caseId: string): ContributionDraft {
    return drafts[caseId] ?? emptyDraft();
  }

  function updateDraft(caseId: string, updates: Partial<ContributionDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [caseId]: {
        ...getDraft(caseId),
        ...updates,
      },
    }));
  }

  function setCaseMessage(caseId: string, message: CaseMessage | null) {
    setMessages((prev) => {
      if (!message) {
        const next = { ...prev };
        delete next[caseId];
        return next;
      }
      return { ...prev, [caseId]: message };
    });
  }

  async function submitContribution(caseId: string) {
    const draft = getDraft(caseId);
    const amountNumber = Number(draft.amount || 0);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setCaseMessage(caseId, { tone: 'error', text: 'Enter a valid amount greater than zero.' });
      return;
    }

    setBusyCaseId(caseId);
    setCaseMessage(caseId, null);
    try {
      const formData = new FormData();
      formData.append('amount', String(amountNumber));
      if (draft.notes.trim()) {
        formData.append('notes', draft.notes.trim());
      }
      if (draft.paidAt) {
        formData.append('paidAt', draft.paidAt);
      }
      if (draft.evidence) {
        formData.append('paymentEvidence', draft.evidence);
      }

      const response = await fetch(buildApiUrl(`/welfare/cases/${caseId}/contributions`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
        cache: 'no-store',
      });
      const bodyText = await response.text();
      if (!response.ok) {
        throw new Error(bodyText || response.statusText || 'Failed to submit contribution.');
      }

      setDrafts((prev) => ({ ...prev, [caseId]: emptyDraft() }));
      setFileInputVersion((prev) => ({ ...prev, [caseId]: (prev[caseId] ?? 0) + 1 }));
      setCaseMessage(caseId, {
        tone: 'success',
        text: 'Payment submitted. It is now pending executive approval.',
      });
    } catch (error) {
      setCaseMessage(caseId, {
        tone: 'error',
        text: error instanceof Error ? error.message : 'Failed to submit payment.',
      });
    } finally {
      setBusyCaseId(null);
    }
  }

  if (cases.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
        No active welfare appeals at the moment.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {cases.map((wcase) => {
        const isExpanded = expandedCaseId === wcase.id;
        const draft = getDraft(wcase.id);
        const message = messages[wcase.id];
        const currentBusy = busyCaseId === wcase.id;
        const version = fileInputVersion[wcase.id] ?? 0;
        return (
          <section key={wcase.id} className="rounded-xl border border-red-100 bg-red-50/40 p-3">
            <button
              type="button"
              className="w-full text-left"
              onClick={() => setExpandedCaseId((prev) => (prev === wcase.id ? null : wcase.id))}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{wcase.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{wcase.description}</p>
                </div>
                <span className="text-xs font-semibold text-red-700">{wcase.status.toUpperCase()}</span>
              </div>
              <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                <p>
                  Target: <span className="font-semibold">{wcase.targetAmount.toLocaleString()} {wcase.currency}</span>
                </p>
                <p>
                  Raised: <span className="font-semibold">{(wcase.totalRaised ?? 0).toLocaleString()} {wcase.currency}</span>
                </p>
                {wcase.attendanceRequired && (
                  <p className="sm:col-span-2 text-red-700">
                    Attendance required: {wcase.attendanceEventTitle || 'Linked event'}
                    {wcase.attendanceEventStartAt
                      ? ` on ${new Date(wcase.attendanceEventStartAt).toLocaleString()}`
                      : ''}
                    {wcase.attendanceEventLocation ? ` at ${wcase.attendanceEventLocation}` : ''}
                  </p>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-3 rounded-xl border border-red-100 bg-white p-3">
                {wcase.attendanceRequired && (
                  <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
                    This welfare requires attendance. Track RSVP on the{' '}
                    <Link href="/events" className="underline font-semibold">
                      Events page
                    </Link>
                    .
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Post your payment with optional evidence. Executive approval is required before it counts as received.
                </p>
                <label className="text-xs text-slate-500">
                  Amount ({wcase.currency})
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="field-input"
                    value={draft.amount}
                    onChange={(event) => updateDraft(wcase.id, { amount: event.target.value })}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Payment date/time
                  <input
                    type="datetime-local"
                    className="field-input"
                    value={draft.paidAt}
                    onChange={(event) => updateDraft(wcase.id, { paidAt: event.target.value })}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Evidence of payment (image or PDF)
                  <input
                    key={`evidence-${wcase.id}-${version}`}
                    type="file"
                    accept="image/*,application/pdf"
                    className="field-input"
                    onChange={(event) =>
                      updateDraft(wcase.id, { evidence: event.target.files?.[0] ?? null })
                    }
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Note (optional)
                  <textarea
                    rows={3}
                    className="field-input"
                    value={draft.notes}
                    onChange={(event) => updateDraft(wcase.id, { notes: event.target.value })}
                  />
                </label>
                {message && (
                  <p
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      message.tone === 'success'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {message.text}
                  </p>
                )}
                <button
                  type="button"
                  className="btn-primary disabled:opacity-60"
                  disabled={currentBusy}
                  onClick={() => void submitContribution(wcase.id)}
                >
                  {currentBusy ? 'Submitting...' : 'Submit payment'}
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
