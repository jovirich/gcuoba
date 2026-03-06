'use client';

import type { BranchExecutiveSummaryDTO } from '@gcuoba/types';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { fetchJson } from '@/lib/api';
import { PaginationControls } from '@/components/ui/pagination-controls';

type Props = {
  userId: string;
  summary: BranchExecutiveSummaryDTO;
  authToken: string;
};

export function BranchExecutivePanel({ userId, summary, authToken }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [requestQueryByBranch, setRequestQueryByBranch] = useState<Record<string, string>>({});
  const [requestPageByBranch, setRequestPageByBranch] = useState<Record<string, number>>({});
  const [requestPageSizeByBranch, setRequestPageSizeByBranch] = useState<Record<string, number>>({});
  const [handoverProcessing, setHandoverProcessing] = useState(false);
  const [handover, setHandover] = useState({
    branchId: summary.branches[0]?.id ?? '',
    roleId: '',
    userId: '',
    startDate: '',
  });
  const [error, setError] = useState<string | null>(null);

  async function handleDecision(membershipId: string, action: 'approve' | 'reject') {
    const actionLabel = action === 'approve' ? 'approve' : 'reject';
    const proceed = window.confirm(`Are you sure you want to ${actionLabel} this branch membership request?`);
    if (!proceed) {
      return;
    }
    setProcessing(membershipId);
    setError(null);
    try {
      await fetchJson(`/branch-executive/${userId}/memberships/${membershipId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: notes[membershipId] }),
        token: authToken,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update membership.');
    } finally {
      setProcessing(null);
    }
  }

  async function handleHandoverSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHandoverProcessing(true);
    setError(null);
    try {
      await fetchJson(`/branch-executive/${userId}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: handover.branchId,
          roleId: handover.roleId,
          userId: handover.userId,
          startDate: handover.startDate || undefined,
        }),
        token: authToken,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record handover.');
    } finally {
      setHandoverProcessing(false);
    }
  }

  if (summary.branches.length === 0) {
    return (
      <section className="surface-card p-6 text-sm text-slate-500">
        You do not currently have branch executive assignments.
      </section>
    );
  }

  const branchMemberOptions = handover.branchId
    ? summary.branchMembers.filter((member) => member.branchIds.includes(handover.branchId))
    : summary.branchMembers;

  return (
    <div className="space-y-6">
      {error && <p className="status-banner status-banner-error">{error}</p>}
      {summary.branches.map((branch) => (
        <section key={branch.id} className="space-y-4 surface-card p-6 shadow-sm">
          <header>
            <h2 className="text-xl font-semibold text-slate-900">{branch.name}</h2>
            <p className="text-sm text-slate-500">
              {branch.country ?? 'No country specified'} &middot; {branch.pendingRequests.length} pending request(s)
            </p>
          </header>
          {(() => {
            const query = (requestQueryByBranch[branch.id] ?? '').trim().toLowerCase();
            const filteredRequests = branch.pendingRequests.filter((request) => {
              if (!query) {
                return true;
              }
              return `${request.memberName ?? ''} ${request.memberEmail ?? ''} ${request.status}`
                .toLowerCase()
                .includes(query);
            });
            const pageSize = requestPageSizeByBranch[branch.id] ?? 8;
            const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
            const currentPage = Math.min(requestPageByBranch[branch.id] ?? 1, totalPages);
            const start = (currentPage - 1) * pageSize;
            const pagedRequests = filteredRequests.slice(start, start + pageSize);

            return (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-slate-500">
                    Search requests
                    <input
                      className="field-input text-sm"
                      placeholder="Search member or status"
                      value={requestQueryByBranch[branch.id] ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setRequestQueryByBranch((prev) => ({ ...prev, [branch.id]: value }));
                        setRequestPageByBranch((prev) => ({ ...prev, [branch.id]: 1 }));
                      }}
                    />
                  </label>
                  <p className="text-xs text-slate-500 md:pt-6">{filteredRequests.length} record(s)</p>
                </div>

                {filteredRequests.length === 0 && (
                  <p className="text-sm text-slate-500">No pending requests for this branch.</p>
                )}

                <ul className="space-y-3">
                  {pagedRequests.map((request) => (
                    <li key={request.id} className="rounded-xl border border-slate-100 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{request.memberName ?? 'Unknown member'}</p>
                          <p className="text-xs text-slate-500">{request.memberEmail ?? 'No email on file'}</p>
                          <p className="text-xs text-slate-400">
                            Requested {request.requestedAt ? new Date(request.requestedAt).toLocaleString() : 'recently'}
                          </p>
                        </div>
                        <div className="text-xs uppercase text-slate-500">{request.status}</div>
                      </div>

                      <textarea
                        className="field-input mt-3 text-sm"
                        placeholder="Optional note"
                        value={notes[request.id] ?? ''}
                        onChange={(event) => setNotes((prev) => ({ ...prev, [request.id]: event.target.value }))}
                      />

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary disabled:opacity-50"
                          onClick={() => handleDecision(request.id, 'approve')}
                          disabled={processing === request.id}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn-pill border-rose-200 bg-rose-50 text-rose-700 disabled:opacity-50"
                          onClick={() => handleDecision(request.id, 'reject')}
                          disabled={processing === request.id}
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <PaginationControls
                  page={currentPage}
                  pageSize={pageSize}
                  total={filteredRequests.length}
                  onPageChange={(value) => setRequestPageByBranch((prev) => ({ ...prev, [branch.id]: value }))}
                  onPageSizeChange={(value) => {
                    setRequestPageSizeByBranch((prev) => ({ ...prev, [branch.id]: value }));
                    setRequestPageByBranch((prev) => ({ ...prev, [branch.id]: 1 }));
                  }}
                />
              </>
            );
          })()}
        </section>
      ))}

      <section className="space-y-4 surface-card p-6 shadow-sm">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">Record executive handover</h2>
          <p className="text-sm text-slate-500">Assign a branch role to an approved branch member.</p>
        </header>

        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleHandoverSubmit}>
          <label className="space-y-1 text-sm text-slate-600">
            <span>Branch</span>
            <select
              required
              className="field-input text-sm"
              value={handover.branchId}
              onChange={(event) =>
                setHandover((prev) => ({
                  ...prev,
                  branchId: event.target.value,
                  userId: '',
                }))
              }
            >
              <option value="">Select branch</option>
              {summary.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-600">
            <span>Role</span>
            <select
              required
              className="field-input text-sm"
              value={handover.roleId}
              onChange={(event) => setHandover((prev) => ({ ...prev, roleId: event.target.value }))}
            >
              <option value="">Select role</option>
              {summary.branchRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-600">
            <span>New executive</span>
            <select
              required
              className="field-input text-sm"
              value={handover.userId}
              onChange={(event) => setHandover((prev) => ({ ...prev, userId: event.target.value }))}
            >
              <option value="">Select member</option>
              {branchMemberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-600">
            <span>Start date</span>
            <input
              type="date"
              className="field-input text-sm"
              value={handover.startDate}
              onChange={(event) => setHandover((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="btn-primary disabled:opacity-50"
              disabled={handoverProcessing}
            >
              {handoverProcessing ? 'Recording...' : 'Record handover'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}


