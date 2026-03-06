'use client';

import type {
  ClassLedgerDTO,
  ClassSetDTO,
  MemberLedgerDTO,
  UserDTO,
} from '@gcuoba/types';
import { fetchJson } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { PaginationControls } from '@/components/ui/pagination-controls';

type LedgerPanelProps = {
  users: UserDTO[];
  classes: ClassSetDTO[];
  authToken: string;
  activeScopeType?: 'global' | 'branch' | 'class';
  activeScopeId?: string | null;
  showClassLedger?: boolean;
};

type LoadState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type LedgerTabKey = 'members' | 'class';

type SchemeLedgerGroup = {
  key: string;
  title: string;
  due: number;
  paid: number;
  balance: number;
  invoices: Array<{
    key: string;
    period: string;
    amount: number;
    paidAmount: number;
    balance: number;
    status: string;
  }>;
  payments: Array<{
    key: string;
    date: string;
    amount: number;
    channel: string;
    reference: string;
  }>;
};

type UnallocatedPaymentRow = {
  key: string;
  date: string;
  amount: number;
  channel: string;
  reference: string;
};

type ActivityTransactionRow = {
  key: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
};

type ActivityLedgerGroup = {
  key: string;
  title: string;
  totalDebit: number;
  totalCredit: number;
  rows: ActivityTransactionRow[];
};

export function LedgerPanel({
  users,
  classes,
  authToken,
  activeScopeType,
  activeScopeId,
  showClassLedger = true,
}: LedgerPanelProps) {
  const [activeTab, setActiveTab] = useState<LedgerTabKey>('members');
  const [expandedMemberIds, setExpandedMemberIds] = useState<string[]>([]);
  const [memberLedgerStates, setMemberLedgerStates] = useState<Record<string, LoadState<MemberLedgerDTO>>>({});
  const [memberQuery, setMemberQuery] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(20);

  const defaultClassId =
    activeScopeType === 'class' && activeScopeId
      ? activeScopeId
      : classes[0]?.id ?? '';
  const [selectedClassId, setSelectedClassId] = useState(defaultClassId);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [classLedgerState, setClassLedgerState] = useState<LoadState<ClassLedgerDTO>>({
    data: null,
    loading: false,
    error: null,
  });
  const classScopeLocked = activeScopeType === 'class' && Boolean(activeScopeId);

  useEffect(() => {
    if (!showClassLedger && activeTab === 'class') {
      setActiveTab('members');
    }
  }, [activeTab, showClassLedger]);

  useEffect(() => {
    const userIdSet = new Set(users.map((user) => user.id));
    setExpandedMemberIds((prev) => prev.filter((userId) => userIdSet.has(userId)));
    setMemberLedgerStates((prev) => {
      const next: Record<string, LoadState<MemberLedgerDTO>> = {};
      Object.entries(prev).forEach(([userId, state]) => {
        if (userIdSet.has(userId)) {
          next[userId] = state;
        }
      });
      return next;
    });
  }, [users]);

  useEffect(() => {
    if (!showClassLedger) {
      setSelectedClassId('');
      setClassLedgerState({ data: null, loading: false, error: null });
      return;
    }
    if (classScopeLocked) {
      if (selectedClassId !== activeScopeId) {
        setSelectedClassId(activeScopeId ?? '');
      }
      return;
    }
    if (!classes.length) {
      setSelectedClassId('');
      return;
    }
    if (!classes.some((entry) => entry.id === selectedClassId)) {
      setSelectedClassId(classes[0]?.id ?? '');
    }
  }, [activeScopeId, classScopeLocked, classes, selectedClassId, showClassLedger]);

  useEffect(() => {
    if (!showClassLedger) {
      return;
    }
    if (!selectedClassId) {
      return;
    }
    setClassLedgerState((prev) => ({ ...prev, loading: true, error: null }));
    const params = selectedYear ? `?year=${selectedYear}` : '';
    fetchJson<ClassLedgerDTO>(`/finance/ledger/classes/${selectedClassId}${params}`, {
      token: authToken,
    })
      .then((ledger) => {
        setClassLedgerState({ data: ledger, loading: false, error: null });
      })
      .catch((error) => {
        setClassLedgerState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load class ledger.',
        });
      });
  }, [selectedClassId, selectedYear, authToken, showClassLedger]);

  const classOptions = useMemo(
    () =>
      classes.map((classSet) => (
        <option key={classSet.id} value={classSet.id}>
          {classSet.entryYear} - {classSet.label}
        </option>
      )),
    [classes],
  );

  const filteredUsers = useMemo(() => {
    const normalizedQuery = memberQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return users;
    }
    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(normalizedQuery) ||
        (user.alumniNumber ?? '').toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [memberQuery, users]);

  const pagedUsers = useMemo(() => {
    const start = (memberPage - 1) * memberPageSize;
    return filteredUsers.slice(start, start + memberPageSize);
  }, [filteredUsers, memberPage, memberPageSize]);

  useEffect(() => {
    setMemberPage(1);
  }, [memberQuery]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / memberPageSize));
    if (memberPage > totalPages) {
      setMemberPage(totalPages);
    }
  }, [filteredUsers.length, memberPage, memberPageSize]);

  async function loadMemberLedger(memberId: string, force = false): Promise<void> {
    const existingState = memberLedgerStates[memberId];
    if (existingState?.loading) {
      return;
    }
    if (!force && existingState?.data) {
      return;
    }

    setMemberLedgerStates((prev) => ({
      ...prev,
      [memberId]: {
        data: prev[memberId]?.data ?? null,
        loading: true,
        error: null,
      },
    }));

    try {
      const ledger = await fetchJson<MemberLedgerDTO>(`/finance/ledger/members/${memberId}`, {
        token: authToken,
      });
      setMemberLedgerStates((prev) => ({
        ...prev,
        [memberId]: {
          data: ledger,
          loading: false,
          error: null,
        },
      }));
    } catch (error) {
      setMemberLedgerStates((prev) => ({
        ...prev,
        [memberId]: {
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load member ledger.',
        },
      }));
    }
  }

  function toggleMember(memberId: string): void {
    const isExpanded = expandedMemberIds.includes(memberId);
    if (isExpanded) {
      setExpandedMemberIds((prev) => prev.filter((id) => id !== memberId));
      return;
    }
    setExpandedMemberIds((prev) => [...prev, memberId]);
    void loadMemberLedger(memberId);
  }

  return (
    <div className="space-y-8">
      {showClassLedger && (
        <section className="surface-card p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn-pill text-sm ${
                activeTab === 'members'
                  ? 'border-red-300 bg-red-100 text-red-800'
                  : 'hover:border-red-200 hover:bg-red-50'
              }`}
              onClick={() => setActiveTab('members')}
            >
              Members
            </button>
            <button
              type="button"
              className={`btn-pill text-sm ${
                activeTab === 'class'
                  ? 'border-red-300 bg-red-100 text-red-800'
                  : 'hover:border-red-200 hover:bg-red-50'
              }`}
              onClick={() => setActiveTab('class')}
            >
              Class
            </button>
          </div>
        </section>
      )}

      {activeTab === 'members' && (
        <section className="surface-card p-6 shadow-sm">
          <header className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Member ledgers</h2>
            <p className="text-sm text-slate-500">
              Expand each member to drill into grouped financial activity.
            </p>
          </header>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-500">
              Search members
              <input
                className="field-input text-sm"
                placeholder="Search by alumni number, name, or email"
                value={memberQuery}
                onChange={(event) => setMemberQuery(event.target.value)}
              />
            </label>
            <p className="text-xs text-slate-500 md:pt-6">{filteredUsers.length} record(s)</p>
          </div>
          <MembersLedgerView
            users={pagedUsers}
            expandedMemberIds={expandedMemberIds}
            memberLedgerStates={memberLedgerStates}
            onToggleMember={toggleMember}
            onReloadMember={(memberId) => void loadMemberLedger(memberId, true)}
          />
          <PaginationControls
            page={memberPage}
            pageSize={memberPageSize}
            total={filteredUsers.length}
            onPageChange={setMemberPage}
            onPageSizeChange={(value) => {
              setMemberPageSize(value);
              setMemberPage(1);
            }}
          />
        </section>
      )}

      {showClassLedger && activeTab === 'class' && (
        <section className="surface-card p-6 shadow-sm">
          <header className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Class ledger</h2>
            <p className="text-sm text-slate-500">
              Review combined class billing and payment activity.
            </p>
          </header>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs uppercase text-slate-500">Class</label>
              <select
                className="field-input"
                value={selectedClassId}
                disabled={classScopeLocked}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedClassId(value);
                  if (!value) {
                    setClassLedgerState({ data: null, loading: false, error: null });
                  }
                }}
              >
                <option value="">
                  {classScopeLocked ? 'Class scope is locked' : 'Select class'}
                </option>
                {classOptions}
              </select>
            </div>
            <div className="w-40">
              <label className="text-xs uppercase text-slate-500">Year</label>
              <input
                type="number"
                min="2000"
                max="2100"
                placeholder="All"
                className="field-input"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
              />
            </div>
          </div>
          <ClassLedgerView state={classLedgerState} />
        </section>
      )}
    </div>
  );
}

type MembersLedgerViewProps = {
  users: UserDTO[];
  expandedMemberIds: string[];
  memberLedgerStates: Record<string, LoadState<MemberLedgerDTO>>;
  onToggleMember: (memberId: string) => void;
  onReloadMember: (memberId: string) => void;
};

function MembersLedgerView({
  users,
  expandedMemberIds,
  memberLedgerStates,
  onToggleMember,
  onReloadMember,
}: MembersLedgerViewProps) {
  if (users.length === 0) {
    return <p className="text-sm text-slate-500">No members available in this scope.</p>;
  }

  return (
    <div className="space-y-3">
      {users.map((member) => {
        const expanded = expandedMemberIds.includes(member.id);
        const state = memberLedgerStates[member.id] ?? {
          data: null,
          loading: false,
          error: null,
        };
        return (
          <article key={member.id} className="rounded-2xl border border-slate-100 bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              onClick={() => onToggleMember(member.id)}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                <p className="text-xs text-slate-500">
                  {member.alumniNumber ? `${member.alumniNumber} · ` : ''}{member.email}
                </p>
              </div>
              <div className="text-right">
                {state.data ? (
                  <p className="text-xs text-slate-600">
                    Outstanding: {state.data.totals.outstanding.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Click to load</p>
                )}
                <p className="text-xs text-slate-400">{expanded ? 'Collapse' : 'Expand'}</p>
              </div>
            </button>
            {expanded && (
              <div className="border-t border-slate-100 px-4 py-4">
                <MemberLedgerDrilldown state={state} onRetry={() => onReloadMember(member.id)} />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

type MemberLedgerDrilldownProps = {
  state: LoadState<MemberLedgerDTO>;
  onRetry: () => void;
};

function MemberLedgerDrilldown({ state, onRetry }: MemberLedgerDrilldownProps) {
  if (state.loading) {
    return <p className="text-sm text-slate-500">Loading member ledger...</p>;
  }
  if (state.error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-rose-600">{state.error}</p>
        <button type="button" className="btn-pill text-xs" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  if (!state.data) {
    return <p className="text-sm text-slate-500">No member ledger data yet.</p>;
  }

  const totals = state.data.totals;
  const { groups, unallocatedPayments, activityGroups } = buildSchemeGroups(state.data);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <LedgerStat label="Billed" value={totals.billed} />
        <LedgerStat label="Paid" value={totals.paid} positive />
        <LedgerStat label="Outstanding" value={totals.outstanding} negative />
      </div>
      {(totals.welfareContributed || totals.welfareReceived) && (
        <div className="grid gap-3 md:grid-cols-2">
          <LedgerStat label="Welfare contributed" value={totals.welfareContributed ?? 0} positive />
          <LedgerStat label="Welfare received" value={totals.welfareReceived ?? 0} />
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900">Transaction groups</h3>
        {groups.length === 0 && (
          <p className="text-sm text-slate-500">No grouped invoices found for this member.</p>
        )}
        {groups.map((group) => (
          <details key={group.key} className="rounded-xl border border-slate-100 p-3">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                <p className="text-xs text-slate-500">
                  Due {group.due.toLocaleString()} | Paid {group.paid.toLocaleString()} | Balance{' '}
                  {group.balance.toLocaleString()}
                </p>
              </div>
            </summary>
            <div className="mt-3 space-y-3">
              <LedgerTable
                headers={['Period', 'Amount', 'Paid', 'Balance', 'Status']}
                rows={group.invoices.map((invoice) => ({
                  key: invoice.key,
                  cells: [
                    invoice.period,
                    invoice.amount.toLocaleString(),
                    invoice.paidAmount.toLocaleString(),
                    invoice.balance.toLocaleString(),
                    invoice.status,
                  ],
                }))}
                emptyLabel="No invoices in this group."
              />

              <LedgerTable
                headers={['Payment date', 'Amount', 'Channel', 'Reference']}
                rows={group.payments.map((payment) => ({
                  key: payment.key,
                  cells: [
                    payment.date,
                    payment.amount.toLocaleString(),
                    payment.channel,
                    payment.reference,
                  ],
                }))}
                emptyLabel="No captured payment applications for this group."
              />
            </div>
          </details>
        ))}
      </div>

      {activityGroups.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">Welfare and event activity</h3>
          {activityGroups.map((group) => (
            <details key={group.key} className="rounded-xl border border-slate-100 p-3">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                  <p className="text-xs text-slate-500">
                    Debit {group.totalDebit.toLocaleString()} | Credit {group.totalCredit.toLocaleString()}
                  </p>
                </div>
              </summary>
              <div className="mt-3">
                <LedgerTable
                  headers={['Date', 'Description', 'Debit', 'Credit']}
                  rows={group.rows.map((row) => ({
                    key: row.key,
                    cells: [
                      row.date,
                      row.description,
                      row.debit.toLocaleString(),
                      row.credit.toLocaleString(),
                    ],
                  }))}
                  emptyLabel="No activity captured."
                />
              </div>
            </details>
          ))}
        </div>
      )}

      <details className="rounded-xl border border-slate-100 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          Unallocated or direct payments
        </summary>
        <div className="mt-3">
          <LedgerTable
            headers={['Payment date', 'Amount', 'Channel', 'Reference']}
            rows={unallocatedPayments.map((payment) => ({
              key: payment.key,
              cells: [
                payment.date,
                payment.amount.toLocaleString(),
                payment.channel,
                payment.reference,
              ],
            }))}
            emptyLabel="No unallocated or direct payments."
          />
        </div>
      </details>

      <details className="rounded-xl border border-slate-100 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          Full transaction timeline
        </summary>
        <div className="mt-3">
          <LedgerTable
            emptyLabel="No transactions found."
            rows={state.data.transactions.map((transaction) => ({
              key: transaction.id,
              cells: [
                transaction.date ? new Date(transaction.date).toLocaleString() : '-',
                transaction.type,
                transaction.description ?? '-',
                transaction.debit.toLocaleString(),
                transaction.credit.toLocaleString(),
                transaction.balance.toLocaleString(),
              ],
            }))}
            headers={['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance']}
          />
        </div>
      </details>
    </div>
  );
}

function buildSchemeGroups(ledger: MemberLedgerDTO): {
  groups: SchemeLedgerGroup[];
  unallocatedPayments: UnallocatedPaymentRow[];
  activityGroups: ActivityLedgerGroup[];
} {
  const groups = new Map<string, SchemeLedgerGroup>();
  const invoiceToGroup = new Map<string, string>();

  ledger.invoices.forEach((invoice) => {
    const title = invoice.scheme?.title?.trim() || 'Unspecified dues';
    const key = title.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title,
        due: 0,
        paid: 0,
        balance: 0,
        invoices: [],
        payments: [],
      });
    }
    const group = groups.get(key)!;
    const paidAmount = Number(invoice.paidAmount ?? 0);
    const balance = Number(invoice.balance ?? Math.max(invoice.amount - paidAmount, 0));
    group.due += Number(invoice.amount ?? 0);
    group.paid += paidAmount;
    group.balance += balance;
    group.invoices.push({
      key: invoice.id,
      period: invoice.periodStart ? new Date(invoice.periodStart).toLocaleDateString() : '-',
      amount: Number(invoice.amount ?? 0),
      paidAmount,
      balance,
      status: invoice.status,
    });
    invoiceToGroup.set(invoice.id, key);
  });

  const unallocatedPayments: UnallocatedPaymentRow[] = [];
  ledger.payments.forEach((payment) => {
    const paidAt = payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '-';
    if (!payment.applications || payment.applications.length === 0) {
      unallocatedPayments.push({
        key: `${payment.id}-direct`,
        date: paidAt,
        amount: Number(payment.amount ?? 0),
        channel: payment.channel,
        reference: payment.reference ?? '-',
      });
      return;
    }
    let applied = 0;
    payment.applications.forEach((application, index) => {
      const groupKey = invoiceToGroup.get(application.invoiceId);
      const amount = Number(application.amount ?? 0);
      applied += amount;
      if (!groupKey) {
        unallocatedPayments.push({
          key: `${payment.id}-unmapped-${index}`,
          date: paidAt,
          amount,
          channel: payment.channel,
          reference: payment.reference ?? '-',
        });
        return;
      }
      const group = groups.get(groupKey);
      if (!group) {
        return;
      }
      group.payments.push({
        key: `${payment.id}-${index}`,
        date: paidAt,
        amount,
        channel: payment.channel,
        reference: payment.reference ?? '-',
      });
    });
    const unapplied = Number(Math.max(Number(payment.amount ?? 0) - applied, 0).toFixed(2));
    if (unapplied > 0.01) {
      unallocatedPayments.push({
        key: `${payment.id}-credit`,
        date: paidAt,
        amount: unapplied,
        channel: payment.channel,
        reference: `${payment.reference ?? 'Payment'} (unapplied credit)`,
      });
    }
  });

  const groupedActivities = new Map<string, ActivityLedgerGroup>();
  ledger.transactions
    .filter((transaction) => transaction.type !== 'Invoice' && transaction.type !== 'Payment')
    .forEach((transaction) => {
      const key = transaction.type.toLowerCase();
      if (!groupedActivities.has(key)) {
        groupedActivities.set(key, {
          key,
          title: transaction.type,
          totalDebit: 0,
          totalCredit: 0,
          rows: [],
        });
      }
      const group = groupedActivities.get(key)!;
      const debit = Number(transaction.debit ?? 0);
      const credit = Number(transaction.credit ?? 0);
      group.totalDebit += debit;
      group.totalCredit += credit;
      group.rows.push({
        key: transaction.id,
        date: transaction.date ? new Date(transaction.date).toLocaleString() : '-',
        description: transaction.description ?? '-',
        debit,
        credit,
      });
    });

  return {
    groups: Array.from(groups.values())
      .map((group) => ({
        ...group,
        due: Number(group.due.toFixed(2)),
        paid: Number(group.paid.toFixed(2)),
        balance: Number(group.balance.toFixed(2)),
      }))
      .sort((a, b) => a.title.localeCompare(b.title)),
    unallocatedPayments,
    activityGroups: Array.from(groupedActivities.values())
      .map((group) => ({
        ...group,
        totalDebit: Number(group.totalDebit.toFixed(2)),
        totalCredit: Number(group.totalCredit.toFixed(2)),
      }))
      .sort((a, b) => a.title.localeCompare(b.title)),
  };
}

type ClassLedgerViewProps = {
  state: LoadState<ClassLedgerDTO>;
};

function ClassLedgerView({ state }: ClassLedgerViewProps) {
  if (!state.data) {
    if (state.loading) {
      return <p className="mt-6 text-sm text-slate-500">Loading class ledger...</p>;
    }
    if (state.error) {
      return <p className="mt-6 text-sm text-rose-600">{state.error}</p>;
    }
    return <p className="mt-6 text-sm text-slate-500">Select a class to view its ledger.</p>;
  }

  const totals = state.data.totals;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <LedgerStat label="Billed" value={totals.billed} />
        <LedgerStat label="Paid" value={totals.paid} positive />
        <LedgerStat label="Outstanding" value={totals.outstanding} negative />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Invoices</h3>
        <LedgerTable
          emptyLabel="No invoices recorded."
          rows={state.data.invoices.map((invoice) => ({
            key: invoice.id,
            cells: [
              formatMemberIdentity(invoice.userName, invoice.userAlumniNumber, invoice.userId),
              invoice.scheme?.title ?? 'Dues invoice',
              invoice.amount.toLocaleString(),
              (invoice.balance ?? 0).toLocaleString(),
            ],
          }))}
          headers={['Member', 'Scheme', 'Amount', 'Balance']}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Payments</h3>
        <LedgerTable
          emptyLabel="No payments captured."
          rows={state.data.payments.map((payment) => ({
            key: payment.id,
            cells: [
              formatMemberIdentity(payment.payerName, payment.payerAlumniNumber, payment.payerUserId),
              payment.amount.toLocaleString(),
              payment.channel,
              payment.reference ?? '-',
            ],
          }))}
          headers={['Member', 'Amount', 'Channel', 'Reference']}
        />
      </div>
    </div>
  );
}

function formatMemberIdentity(name?: string, alumniNumber?: string | null, fallbackId?: string) {
  if (alumniNumber && alumniNumber.trim()) {
    return alumniNumber.trim();
  }
  if (name && name.trim()) {
    return name.trim();
  }
  return fallbackId ?? 'Member';
}

type LedgerStatProps = {
  label: string;
  value: number | undefined;
  positive?: boolean;
  negative?: boolean;
};

function LedgerStat({ label, value, positive, negative }: LedgerStatProps) {
  const color = positive ? 'text-red-600' : negative ? 'text-rose-600' : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{(value ?? 0).toLocaleString()}</p>
    </div>
  );
}

type LedgerTableProps = {
  headers: string[];
  rows: { key: string; cells: (string | number)[] }[];
  emptyLabel: string;
};

function LedgerTable({ headers, rows, emptyLabel }: LedgerTableProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return rows;
    }
    return rows.filter((row) => row.cells.some((cell) => String(cell).toLowerCase().includes(needle)));
  }, [query, rows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, filteredRows, pageSize]);

  if (filteredRows.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs text-slate-500">
          Search rows
          <input
            className="field-input text-sm"
            placeholder="Filter by any column"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <p className="text-xs text-slate-500 md:pt-6">{filteredRows.length} record(s)</p>
      </div>
      <div className="table-wrap">
        <table className="table-base">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="py-2 pr-4">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.key} className="table-row">
                {row.cells.map((cell, index) => (
                  <td key={`${row.key}-${index}`} className="py-2 pr-4 text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationControls
        page={currentPage}
        pageSize={pageSize}
        total={filteredRows.length}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
      />
    </>
  );
}
