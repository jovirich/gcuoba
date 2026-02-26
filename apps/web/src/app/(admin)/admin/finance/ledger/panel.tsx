/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import type {
  ClassLedgerDTO,
  ClassSetDTO,
  MemberLedgerDTO,
  UserDTO,
} from '@gcuoba/types';
import { fetchJson } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';

type LedgerPanelProps = {
  users: UserDTO[];
  classes: ClassSetDTO[];
  authToken: string;
  activeScopeType?: 'global' | 'branch' | 'class';
  activeScopeId?: string | null;
};

type LoadState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function LedgerPanel({
  users,
  classes,
  authToken,
  activeScopeType,
  activeScopeId,
}: LedgerPanelProps) {
  const defaultMemberId = users[0]?.id ?? '';
  const defaultClassId =
    activeScopeType === 'class' && activeScopeId
      ? activeScopeId
      : classes[0]?.id ?? '';
  const [selectedMemberId, setSelectedMemberId] = useState(defaultMemberId);
  const [memberLedgerState, setMemberLedgerState] = useState<LoadState<MemberLedgerDTO>>({
    data: null,
    loading: false,
    error: null,
  });
  const [selectedClassId, setSelectedClassId] = useState(defaultClassId);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [classLedgerState, setClassLedgerState] = useState<LoadState<ClassLedgerDTO>>({
    data: null,
    loading: false,
    error: null,
  });
  const classScopeLocked = activeScopeType === 'class' && Boolean(activeScopeId);

  useEffect(() => {
    if (!users.length) {
      setSelectedMemberId('');
      return;
    }
    if (!users.some((user) => user.id === selectedMemberId)) {
      setSelectedMemberId(users[0]?.id ?? '');
    }
  }, [users, selectedMemberId]);

  useEffect(() => {
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
  }, [activeScopeId, classScopeLocked, classes, selectedClassId]);

  useEffect(() => {
    if (!selectedMemberId) {
      return;
    }
    setMemberLedgerState((prev) => ({ ...prev, loading: true, error: null }));
    fetchJson<MemberLedgerDTO>(`/finance/ledger/members/${selectedMemberId}`, {
      token: authToken,
    })
      .then((ledger) => {
        setMemberLedgerState({ data: ledger, loading: false, error: null });
      })
      .catch((error) => {
        setMemberLedgerState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load member ledger.',
        });
      });
  }, [selectedMemberId, authToken]);

  useEffect(() => {
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
  }, [selectedClassId, selectedYear, authToken]);

  const memberOptions = useMemo(
    () =>
      users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name} ({user.email})
        </option>
      )),
    [users],
  );

  const classOptions = useMemo(
    () =>
      classes.map((classSet) => (
        <option key={classSet.id} value={classSet.id}>
          {classSet.entryYear} - {classSet.label}
        </option>
      )),
    [classes],
  );

  return (
    <div className="space-y-8">
      <section className="surface-card p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs uppercase text-slate-500">Member</label>
            <select
              className="field-input"
              value={selectedMemberId}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedMemberId(value);
                if (!value) {
                  setMemberLedgerState({ data: null, loading: false, error: null });
                }
              }}
            >
              <option value="">Select member</option>
              {memberOptions}
            </select>
          </div>
        </div>
        <MemberLedgerView state={memberLedgerState} />
      </section>

      <section className="surface-card p-6 shadow-sm">
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
              <option value="">{classScopeLocked ? 'Class scope is locked' : 'Select class'}</option>
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
    </div>
  );
}

type MemberLedgerViewProps = {
  state: LoadState<MemberLedgerDTO>;
};

function MemberLedgerView({ state }: MemberLedgerViewProps) {
  if (!state.data) {
    if (state.loading) {
      return <p className="mt-6 text-sm text-slate-500">Loading member ledger...</p>;
    }
    if (state.error) {
      return <p className="mt-6 text-sm text-rose-600">{state.error}</p>;
    }
    return <p className="mt-6 text-sm text-slate-500">Select a member to view their ledger.</p>;
  }

  const totals = state.data.totals;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <LedgerStat label="Billed" value={totals.billed} />
        <LedgerStat label="Paid" value={totals.paid} positive />
        <LedgerStat label="Outstanding" value={totals.outstanding} negative />
      </div>

      {(totals.welfareContributed || totals.welfareReceived) && (
        <div className="grid gap-4 md:grid-cols-2">
          <LedgerStat label="Welfare contributed" value={totals.welfareContributed ?? 0} positive />
          <LedgerStat label="Welfare received" value={totals.welfareReceived ?? 0} />
        </div>
      )}

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Transactions</h3>
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

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Recent invoices</h3>
        <LedgerTable
          emptyLabel="No invoices recorded."
          rows={state.data.invoices.map((invoice) => ({
            key: invoice.id,
            cells: [
              invoice.scheme?.title ?? 'Dues invoice',
              invoice.periodStart ? new Date(invoice.periodStart).toLocaleDateString() : '-',
              invoice.amount.toLocaleString(),
              (invoice.paidAmount ?? 0).toLocaleString(),
              (invoice.balance ?? 0).toLocaleString(),
            ],
          }))}
          headers={['Scheme', 'Period', 'Amount', 'Paid', 'Balance']}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Recent payments</h3>
        <LedgerTable
          emptyLabel="No payments captured."
          rows={state.data.payments.map((payment) => ({
            key: payment.id,
            cells: [
              payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '-',
              payment.amount.toLocaleString(),
              payment.channel,
              payment.reference ?? '-',
            ],
          }))}
          headers={['Date', 'Amount', 'Channel', 'Reference']}
        />
      </div>
    </div>
  );
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
              invoice.userName ?? invoice.userId,
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
              payment.payerUserId,
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
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
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
          {rows.map((row) => (
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
  );
}



