'use client';

import type {
  BranchDTO,
  ClassSetDTO,
  WelfareCaseDTO,
  WelfareCaseDetailDTO,
  WelfareCategoryDTO,
  WelfareQueueItemDTO,
} from '@gcuoba/types';
import { fetchJson } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type WelfarePanelProps = {
  cases: WelfareCaseDTO[];
  initialCase: WelfareCaseDetailDTO | null;
  authToken: string;
  activeScopeType?: 'global' | 'branch' | 'class';
  activeScopeId?: string | null;
};

type CaseState = {
  data: WelfareCaseDetailDTO | null;
  loading: boolean;
  error: string | null;
};

type ContributionFormState = {
  contributorName: string;
  contributorEmail: string;
  amount: string;
  notes: string;
};

type PayoutFormState = {
  amount: string;
  channel: string;
  reference: string;
  notes: string;
};

type CreateCaseFormState = {
  title: string;
  description: string;
  categoryId: string;
  scopeType: 'global' | 'branch' | 'class';
  scopeId: string;
  targetAmount: string;
  currency: string;
  beneficiaryName: string;
  beneficiaryUserId: string;
};

type CaseStatus = 'open' | 'closed';

export function WelfarePanel({
  cases,
  initialCase,
  authToken,
  activeScopeType,
  activeScopeId,
}: WelfarePanelProps) {
  const router = useRouter();
  const [selectedCaseId, setSelectedCaseId] = useState(initialCase?.id ?? cases[0]?.id ?? '');
  const [caseState, setCaseState] = useState<CaseState>({
    data: initialCase,
    loading: false,
    error: null,
  });
  const hasSkippedInitialCaseFetch = useRef(false);
  const [contributionForm, setContributionForm] = useState<ContributionFormState>({
    contributorName: '',
    contributorEmail: '',
    amount: '',
    notes: '',
  });
  const [payoutForm, setPayoutForm] = useState<PayoutFormState>({
    amount: '',
    channel: 'transfer',
    reference: '',
    notes: '',
  });
  const [caseForm, setCaseForm] = useState<CreateCaseFormState>({
    title: '',
    description: '',
    categoryId: '',
    scopeType: 'global',
    scopeId: '',
    targetAmount: '',
    currency: 'NGN',
    beneficiaryName: '',
    beneficiaryUserId: '',
  });
  const [categories, setCategories] = useState<WelfareCategoryDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [classes, setClasses] = useState<ClassSetDTO[]>([]);
  const [queue, setQueue] = useState<WelfareQueueItemDTO[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueActionId, setQueueActionId] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [creatingCase, setCreatingCase] = useState(false);
  const [caseStatusBusy, setCaseStatusBusy] = useState(false);
  const isScopeLocked = Boolean(activeScopeType);
  const effectiveScopeType = activeScopeType ?? caseForm.scopeType;
  const effectiveScopeId =
    effectiveScopeType === 'global' ? '' : activeScopeId ?? caseForm.scopeId;

  useEffect(() => {
    const setupCategoryParams = new URLSearchParams();
    setupCategoryParams.set('scopeType', activeScopeType ?? 'global');
    if (activeScopeType && activeScopeType !== 'global' && activeScopeId) {
      setupCategoryParams.set('scopeId', activeScopeId);
    }

    Promise.all([
      fetchJson<BranchDTO[]>('/branches', { token: authToken }),
      fetchJson<ClassSetDTO[]>('/classes', { token: authToken }),
      fetchJson<WelfareCategoryDTO[]>(`/welfare/categories?${setupCategoryParams.toString()}`, {
        token: authToken,
      }),
    ])
      .then(([branchesData, classesData, categoriesData]) => {
        setBranches(branchesData);
        setClasses(classesData);
        setCategories(categoriesData);
        if (!caseForm.categoryId) {
          setCaseForm((prev) => ({
            ...prev,
            categoryId: categoriesData[0]?.id ?? '',
          }));
        }
      })
      .catch((error) => {
        setSubmissionError(error instanceof Error ? error.message : 'Failed to load welfare setup data.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScopeId, activeScopeType, authToken]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('scopeType', effectiveScopeType);
    if (effectiveScopeType !== 'global' && effectiveScopeId) {
      params.set('scopeId', effectiveScopeId);
    }

    fetchJson<WelfareCategoryDTO[]>(`/welfare/categories?${params.toString()}`, {
      token: authToken,
    })
      .then((items) => {
        setCategories(items);
        setCaseForm((prev) => ({
          ...prev,
          categoryId: items.some((item) => item.id === prev.categoryId) ? prev.categoryId : items[0]?.id ?? '',
        }));
      })
      .catch((error) => {
        setSubmissionError(error instanceof Error ? error.message : 'Failed to load categories.');
      });
  }, [authToken, effectiveScopeId, effectiveScopeType]);

  useEffect(() => {
    if (!activeScopeType) {
      return;
    }
    setCaseForm((prev) => ({
      ...prev,
      scopeType: activeScopeType,
      scopeId: activeScopeType === 'global' ? '' : activeScopeId ?? prev.scopeId,
    }));
  }, [activeScopeId, activeScopeType]);

  useEffect(() => {
    void loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScopeId, activeScopeType, authToken]);

  useEffect(() => {
    if (!selectedCaseId) {
      setCaseState({ data: null, loading: false, error: null });
      return;
    }

    if (
      initialCase &&
      !hasSkippedInitialCaseFetch.current &&
      initialCase.id === selectedCaseId
    ) {
      hasSkippedInitialCaseFetch.current = true;
      setCaseState({ data: initialCase, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setCaseState((prev) => ({ ...prev, loading: true, error: null }));
    fetchJson<WelfareCaseDetailDTO>(`/welfare/cases/${selectedCaseId}`, { token: authToken })
      .then((detail) => {
        if (!cancelled) {
          setCaseState({ data: detail, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setCaseState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load case.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCaseId, authToken, initialCase]);

  const selectedCase = useMemo(() => cases.find((c) => c.id === selectedCaseId) ?? null, [cases, selectedCaseId]);
  const caseForStats = caseState.data ?? selectedCase;

  const scopeOptions = useMemo(() => {
    if (effectiveScopeType === 'branch') {
      if (activeScopeType === 'branch' && activeScopeId) {
        return branches.filter((item) => item.id === activeScopeId);
      }
      return branches;
    }
    if (activeScopeType === 'class' && activeScopeId) {
      return classes.filter((item) => item.id === activeScopeId);
    }
    return classes;
  }, [activeScopeId, activeScopeType, branches, classes, effectiveScopeType]);

  async function loadQueue() {
    setQueueLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', 'pending');
      if (activeScopeType) {
        params.set('scopeType', activeScopeType);
      }
      if (activeScopeType && activeScopeType !== 'global' && activeScopeId) {
        params.set('scopeId', activeScopeId);
      }
      const pending = await fetchJson<WelfareQueueItemDTO[]>(`/welfare/queue?${params.toString()}`, {
        token: authToken,
      });
      setQueue(pending);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to load workflow queue.');
    } finally {
      setQueueLoading(false);
    }
  }

  async function handleCreateCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingCase(true);
    setSubmissionError(null);
    setSubmissionStatus(null);

    try {
      await fetchJson<WelfareCaseDTO>('/welfare/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: caseForm.title,
          description: caseForm.description,
          categoryId: caseForm.categoryId,
          scopeType: effectiveScopeType,
          scopeId: effectiveScopeType === 'global' ? undefined : effectiveScopeId,
          targetAmount: Number(caseForm.targetAmount || 0),
          currency: caseForm.currency,
          beneficiaryName: caseForm.beneficiaryName || undefined,
          beneficiaryUserId: caseForm.beneficiaryUserId || undefined,
        }),
        token: authToken,
      });

      setCaseForm({
        title: '',
        description: '',
        categoryId: categories[0]?.id ?? '',
        scopeType: activeScopeType ?? 'global',
        scopeId:
          activeScopeType === 'branch' || activeScopeType === 'class'
            ? activeScopeId ?? ''
            : '',
        targetAmount: '',
        currency: 'NGN',
        beneficiaryName: '',
        beneficiaryUserId: '',
      });
      setSubmissionStatus('Welfare case created.');
      router.refresh();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to create welfare case.');
    } finally {
      setCreatingCase(false);
    }
  }

  async function handleCaseStatusChange(status: CaseStatus) {
    if (!selectedCaseId) {
      return;
    }
    setCaseStatusBusy(true);
    setSubmissionError(null);
    setSubmissionStatus(null);
    try {
      await fetchJson<WelfareCaseDTO>(`/welfare/cases/${selectedCaseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        token: authToken,
      });
      setSubmissionStatus(`Case marked ${status}.`);
      await refreshCase(selectedCaseId);
      router.refresh();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to update case status.');
    } finally {
      setCaseStatusBusy(false);
    }
  }

  async function handleContributionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCaseId) {
      return;
    }
    setSubmissionStatus(null);
    setSubmissionError(null);
    try {
      await fetchJson(`/welfare/cases/${selectedCaseId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributorName: contributionForm.contributorName,
          contributorEmail: contributionForm.contributorEmail || undefined,
          amount: Number(contributionForm.amount),
          notes: contributionForm.notes || undefined,
        }),
        token: authToken,
      });
      setContributionForm({ contributorName: '', contributorEmail: '', amount: '', notes: '' });
      setSubmissionStatus('Contribution submitted for approval.');
      await refreshCase(selectedCaseId);
      await loadQueue();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to record contribution.');
    }
  }

  async function handlePayoutSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCaseId) {
      return;
    }
    setSubmissionStatus(null);
    setSubmissionError(null);
    try {
      await fetchJson(`/welfare/cases/${selectedCaseId}/payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payoutForm.amount),
          channel: payoutForm.channel,
          reference: payoutForm.reference || undefined,
          notes: payoutForm.notes || undefined,
        }),
        token: authToken,
      });
      setPayoutForm({ amount: '', channel: 'transfer', reference: '', notes: '' });
      setSubmissionStatus('Payout submitted for approval.');
      await refreshCase(selectedCaseId);
      await loadQueue();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to record payout.');
    }
  }

  async function reviewQueueItem(item: WelfareQueueItemDTO, action: 'approve' | 'reject') {
    setQueueActionId(item.id);
    setSubmissionError(null);
    setSubmissionStatus(null);
    try {
      const note = action === 'reject' ? window.prompt('Enter rejection reason:') : window.prompt('Optional approval note:');
      if (action === 'reject' && !note?.trim()) {
        setSubmissionError('Rejection reason is required.');
        setQueueActionId(null);
        return;
      }

      const basePath = item.kind === 'contribution' ? '/welfare/contributions' : '/welfare/payouts';
      await fetchJson(`${basePath}/${item.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note || undefined }),
        token: authToken,
      });

      setSubmissionStatus(`${item.kind} ${action}d.`);
      await loadQueue();
      if (item.caseId === selectedCaseId) {
        await refreshCase(item.caseId);
      }
      router.refresh();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : `Failed to ${action} ${item.kind}.`);
    } finally {
      setQueueActionId(null);
    }
  }

  async function refreshCase(caseId: string) {
    setCaseState((prev) => ({ ...prev, loading: true }));
    const detail = await fetchJson<WelfareCaseDetailDTO>(`/welfare/cases/${caseId}`, { token: authToken });
    setCaseState({ data: detail, loading: false, error: null });
  }

  return (
    <section className="space-y-6">
      {(submissionStatus || submissionError) && (
        <div
          className={`status-banner text-sm ${
            submissionError
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {submissionError ?? submissionStatus}
        </div>
      )}

      <section className="surface-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create welfare case</h2>
        <form onSubmit={handleCreateCase} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            Title
            <input
              required
              className="field-input"
              value={caseForm.title}
              onChange={(event) => setCaseForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Category
            <select
              required
              className="field-input"
              value={caseForm.categoryId}
              onChange={(event) => setCaseForm((prev) => ({ ...prev, categoryId: event.target.value }))}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">
            Description
            <textarea
              required
              rows={3}
              className="field-input"
              value={caseForm.description}
              onChange={(event) => setCaseForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Scope
            <select
              className="field-input"
              value={effectiveScopeType}
              disabled={isScopeLocked}
              onChange={(event) =>
                setCaseForm((prev) => ({
                  ...prev,
                  scopeType: event.target.value as CreateCaseFormState['scopeType'],
                  scopeId: '',
                }))
              }
            >
              <option value="global">Global</option>
              <option value="branch">Branch</option>
              <option value="class">Class</option>
            </select>
          </label>
          {effectiveScopeType !== 'global' && (
            <label className="text-sm text-slate-600">
              {effectiveScopeType === 'branch' ? 'Branch' : 'Class'}
              <select
                required
                className="field-input"
                value={effectiveScopeId}
                disabled={isScopeLocked}
                onChange={(event) => setCaseForm((prev) => ({ ...prev, scopeId: event.target.value }))}
              >
                <option value="">Select</option>
                {scopeOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {'entryYear' in item ? `${item.entryYear} - ${item.label}` : item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm text-slate-600">
            Target amount
            <input
              type="number"
              min="0"
              step="0.01"
              className="field-input"
              value={caseForm.targetAmount}
              onChange={(event) => setCaseForm((prev) => ({ ...prev, targetAmount: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Currency
            <input
              className="field-input uppercase"
              maxLength={3}
              value={caseForm.currency}
              onChange={(event) => setCaseForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Beneficiary name
            <input
              className="field-input"
              value={caseForm.beneficiaryName}
              onChange={(event) => setCaseForm((prev) => ({ ...prev, beneficiaryName: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Beneficiary user ID
            <input
              className="field-input"
              value={caseForm.beneficiaryUserId}
              onChange={(event) => setCaseForm((prev) => ({ ...prev, beneficiaryUserId: event.target.value }))}
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="btn-primary disabled:opacity-50"
              disabled={creatingCase}
            >
              {creatingCase ? 'Creating...' : 'Create case'}
            </button>
          </div>
        </form>
      </section>

      <section className="surface-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Approval queue</h2>
          <button
            type="button"
            className="btn-pill"
            onClick={() => void loadQueue()}
            disabled={queueLoading}
          >
            Refresh
          </button>
        </div>
        {queue.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No pending approvals.</p>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Type</th>
                  <th className="py-2">Case</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Submitted by</th>
                  <th className="py-2">Submitted at</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={`${item.kind}-${item.id}`} className="table-row">
                    <td className="py-2 capitalize">{item.kind}</td>
                    <td className="py-2">{item.caseTitle}</td>
                    <td className="py-2">
                      {item.amount.toLocaleString()} {item.currency}
                    </td>
                    <td className="py-2">{item.submittedBy ?? '-'}</td>
                    <td className="py-2 text-xs text-slate-500">
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '-'}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-pill border-red-200 bg-red-50 text-red-700"
                          disabled={queueActionId === item.id}
                          onClick={() => void reviewQueueItem(item, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn-pill border-rose-200 bg-rose-50 text-rose-700"
                          disabled={queueActionId === item.id}
                          onClick={() => void reviewQueueItem(item, 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {cases.length > 0 && (
        <section className="surface-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[240px]">
              <label className="text-xs uppercase text-slate-500">Case</label>
              <select
                className="field-input"
                value={selectedCaseId}
                onChange={(event) => {
                  setSelectedCaseId(event.target.value);
                  setCaseState((prev) => ({ ...prev, error: null }));
                }}
              >
                {cases.map((caseItem) => (
                  <option key={caseItem.id} value={caseItem.id}>
                    {caseItem.title}
                  </option>
                ))}
              </select>
            </div>
            {caseState.loading && <p className="text-sm text-slate-500">Loading case...</p>}
            {caseState.error && <p className="text-sm text-rose-600">{caseState.error}</p>}
            {caseState.data && (
              <button
                type="button"
                className="btn-pill disabled:opacity-50"
                onClick={() => void handleCaseStatusChange(caseState.data?.status === 'open' ? 'closed' : 'open')}
                disabled={caseStatusBusy}
              >
                {caseState.data.status === 'open' ? 'Close case' : 'Re-open case'}
              </button>
            )}
          </div>

          {caseForStats && (
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <StatCard label="Target" value={`${caseForStats.targetAmount.toLocaleString()} ${caseForStats.currency}`} />
              <StatCard
                label="Raised (approved)"
                value={`${(caseForStats.totalRaised ?? 0).toLocaleString()} ${caseForStats.currency}`}
                tone="positive"
              />
              <StatCard
                label="Disbursed (approved)"
                value={`${(caseForStats.totalDisbursed ?? 0).toLocaleString()} ${caseForStats.currency}`}
              />
              <StatCard label="Status" value={caseForStats.status.toUpperCase()} />
            </div>
          )}

          {caseState.data && (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <form onSubmit={handleContributionSubmit} className="space-y-3 surface-muted p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Record contribution</h3>
                  <label className="text-xs text-slate-500">
                    Contributor name
                    <input
                      required
                      className="field-input"
                      value={contributionForm.contributorName}
                      onChange={(event) =>
                        setContributionForm((prev) => ({ ...prev, contributorName: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Contributor email
                    <input
                      type="email"
                      className="field-input"
                      value={contributionForm.contributorEmail}
                      onChange={(event) =>
                        setContributionForm((prev) => ({ ...prev, contributorEmail: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Amount ({caseState.data.currency})
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      className="field-input"
                      value={contributionForm.amount}
                      onChange={(event) =>
                        setContributionForm((prev) => ({ ...prev, amount: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Notes
                    <textarea
                      className="field-input"
                      rows={3}
                      value={contributionForm.notes}
                      onChange={(event) =>
                        setContributionForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                    />
                  </label>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Submit contribution
                  </button>
                </form>

                <form onSubmit={handlePayoutSubmit} className="space-y-3 surface-muted p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Record payout</h3>
                  <label className="text-xs text-slate-500">
                    Amount ({caseState.data.currency})
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      className="field-input"
                      value={payoutForm.amount}
                      onChange={(event) =>
                        setPayoutForm((prev) => ({ ...prev, amount: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Channel
                    <input
                      required
                      className="field-input"
                      value={payoutForm.channel}
                      onChange={(event) =>
                        setPayoutForm((prev) => ({ ...prev, channel: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Reference
                    <input
                      className="field-input"
                      value={payoutForm.reference}
                      onChange={(event) =>
                        setPayoutForm((prev) => ({ ...prev, reference: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Notes
                    <textarea
                      className="field-input"
                      rows={3}
                      value={payoutForm.notes}
                      onChange={(event) =>
                        setPayoutForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                    />
                  </label>
                  <button
                    type="submit"
                    className="btn-secondary"
                  >
                    Submit payout
                  </button>
                </form>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DataTable
                  title="Contributions"
                  emptyLabel="No contributions yet."
                  headers={['Contributor', 'Amount', 'Status', 'Date']}
                  rows={caseState.data.contributions.map((contribution) => [
                    contribution.contributorName,
                    `${contribution.amount.toLocaleString()} ${contribution.currency}`,
                    contribution.status,
                    contribution.paidAt ? new Date(contribution.paidAt).toLocaleString() : '-',
                  ])}
                />
                <DataTable
                  title="Payouts"
                  emptyLabel="No payouts yet."
                  headers={['Amount', 'Channel', 'Status', 'Date']}
                  rows={caseState.data.payouts.map((payout) => [
                    `${payout.amount.toLocaleString()} ${payout.currency}`,
                    payout.channel,
                    payout.status,
                    payout.disbursedAt ? new Date(payout.disbursedAt).toLocaleString() : '-',
                  ])}
                />
              </div>
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'positive' }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className={`text-xl font-semibold ${tone === 'positive' ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function DataTable({
  title,
  headers,
  rows,
  emptyLabel,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  emptyLabel: string;
}) {
  return (
    <section className="surface-card p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="py-2">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="table-row">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${index}-${cellIndex}`} className="py-2 pr-4 text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}




