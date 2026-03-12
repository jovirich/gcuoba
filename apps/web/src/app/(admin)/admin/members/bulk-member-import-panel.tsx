'use client';

import type { BranchDTO, ClassSetDTO, HouseDTO, AdminMemberDTO } from '@gcuoba/types';
import { API_BASE_URL, fetchJson } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type ScopeType = 'global' | 'branch' | 'class';
type AddMemberTab = 'individual' | 'bulk';

type RowResult = {
  rowNumber: number;
  action: 'create' | 'update' | 'skip';
  status: 'valid' | 'error';
  memberName: string;
  email: string;
  phone: string | null;
  classLabel: string;
  branchLabel: string | null;
  warnings: string[];
  errors: string[];
  userId?: string;
};

type ImportResult = {
  mode: 'preview' | 'commit';
  summary: {
    totalRows: number;
    validRows: number;
    failedRows: number;
    created: number;
    updated: number;
    skipped: number;
  };
  rows: RowResult[];
};

type ActivationResult = {
  classId: string;
  classLabel: string;
  classYear: number;
  totalClassMembers: number;
  pendingFound: number;
  activated: number;
};

type Props = {
  authToken: string;
  classes: ClassSetDTO[];
  branches: BranchDTO[];
  houses: HouseDTO[];
  activeScopeType?: ScopeType;
  activeScopeId?: string | null;
};

export function BulkMemberImportPanel({
  authToken,
  classes,
  branches,
  houses,
  activeScopeType,
  activeScopeId,
}: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [defaultPassword, setDefaultPassword] = useState('Gcuoba2026');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [targetClassId, setTargetClassId] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [busy, setBusy] = useState<'template' | 'preview' | 'commit' | 'activate' | null>(null);
  const [singleCreateBusy, setSingleCreateBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [removedRows, setRemovedRows] = useState<number[]>([]);
  const [singleMember, setSingleMember] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    title: 'mr',
    phone: '',
    email: '',
    classId: '',
    branchId: '',
    houseId: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    note: '',
  });
  const [addMemberTab, setAddMemberTab] = useState<AddMemberTab>('individual');

  const isGlobalScope = !activeScopeType || activeScopeType === 'global';
  const isBranchScope = activeScopeType === 'branch';

  const scopeQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (activeScopeType) {
      params.set('scopeType', activeScopeType);
    }
    if (activeScopeId) {
      params.set('scopeId', activeScopeId);
    }
    const query = params.toString();
    return query ? `?${query}` : '';
  }, [activeScopeId, activeScopeType]);
  const removedRowsSet = useMemo(() => new Set(removedRows), [removedRows]);
  const visibleRows = useMemo(
    () => (result ? result.rows.filter((row) => !removedRowsSet.has(row.rowNumber)) : []),
    [removedRowsSet, result],
  );
  const visibleSummary = useMemo(() => summarizeRows(visibleRows), [visibleRows]);
  const removedCount = result ? Math.max(0, result.rows.length - visibleRows.length) : 0;

  function removeMatchingRows(predicate: (row: RowResult) => boolean) {
    if (!result) {
      return;
    }
    const next = new Set(removedRows);
    result.rows.forEach((row) => {
      if (predicate(row)) {
        next.add(row.rowNumber);
      }
    });
    setRemovedRows(Array.from(next));
  }

  function removeSingleRow(rowNumber: number) {
    if (removedRowsSet.has(rowNumber)) {
      return;
    }
    setRemovedRows((prev) => [...prev, rowNumber]);
  }

  async function downloadTemplate() {
    setBusy('template');
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/members/import${scopeQuery}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store',
      });
      const body = await response.text();
      if (!response.ok) {
        throw new Error(body || response.statusText);
      }
      const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'member-bulk-import-template.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(extractError(downloadError));
    } finally {
      setBusy(null);
    }
  }

  async function runImport(mode: 'preview' | 'commit') {
    if (!file) {
      setError('Select a CSV file first.');
      return;
    }
    const selectedRowNumbers =
      mode === 'commit' && result
        ? result.rows
            .filter((row) => !removedRowsSet.has(row.rowNumber))
            .map((row) => row.rowNumber)
        : [];
    if (mode === 'commit' && selectedRowNumbers.length === 0) {
      setError('No preview rows selected for import. Restore rows or run a new preview.');
      return;
    }
    if (mode === 'commit') {
      const proceed = window.confirm('Import selected preview rows now? Existing members may be updated.');
      if (!proceed) {
        return;
      }
    }
    setBusy(mode);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('mode', mode);
      form.append('defaultPassword', defaultPassword);
      form.append('sendWelcomeEmail', sendWelcomeEmail ? '1' : '0');
      if (isGlobalScope && targetClassId) {
        form.append('targetClassId', targetClassId);
      }
      if (isGlobalScope && targetBranchId) {
        form.append('targetBranchId', targetBranchId);
      }
      if (mode === 'commit') {
        form.append('rowNumbers', selectedRowNumbers.join(','));
      }
      const response = await fetchJson<ImportResult>(`/admin/members/import${scopeQuery}`, {
        method: 'POST',
        body: form,
        token: authToken,
      });
      if (mode === 'preview') {
        setResult(response);
        setRemovedRows([]);
        setMessage(`Preview ready. ${response.summary.validRows} valid row(s), ${response.summary.failedRows} row(s) with issues.`);
      } else {
        setResult(null);
        setRemovedRows([]);
        setMessage(`Import complete. Created: ${response.summary.created}, Updated: ${response.summary.updated}, Failed: ${response.summary.failedRows}.`);
        router.refresh();
      }
    } catch (importError) {
      setError(extractError(importError));
    } finally {
      setBusy(null);
    }
  }

  async function createSingleMember() {
    if (isBranchScope) {
      setError('Single member onboarding is not available in branch scope.');
      return;
    }
    if (!singleMember.firstName.trim() || !singleMember.lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    if (!singleMember.email.trim() && !singleMember.phone.trim()) {
      setError('Provide at least email or phone.');
      return;
    }
    if (isGlobalScope && !singleMember.classId) {
      setError('Select class for this member.');
      return;
    }
    const proceed = window.confirm('Create member as Active + Unclaimed?');
    if (!proceed) {
      return;
    }

    setSingleCreateBusy(true);
    setError(null);
    setMessage(null);
    try {
      const created = await fetchJson<AdminMemberDTO>(`/admin/members${scopeQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...singleMember,
          defaultPassword,
          sendWelcomeEmail,
          classId: isGlobalScope ? singleMember.classId : undefined,
          branchId: isGlobalScope ? singleMember.branchId || null : null,
          houseId: singleMember.houseId || null,
          dobDay: singleMember.dobDay || null,
          dobMonth: singleMember.dobMonth || null,
          dobYear: singleMember.dobYear || null,
        }),
        token: authToken,
      });
      setSingleMember({
        firstName: '',
        lastName: '',
        middleName: '',
        title: 'mr',
        phone: '',
        email: '',
        classId: '',
        branchId: '',
        houseId: '',
        dobDay: '',
        dobMonth: '',
        dobYear: '',
        note: '',
      });
      setResult(null);
      setRemovedRows([]);
      setMessage(`Member created: ${created.user.name} (${created.user.claimStatus ?? 'unclaimed'}).`);
      router.refresh();
    } catch (createError) {
      setError(extractError(createError));
    } finally {
      setSingleCreateBusy(false);
    }
  }

  async function activatePendingAsUnclaimed() {
    if (isBranchScope) {
      setError('This action is not available in branch scope.');
      return;
    }
    if (isGlobalScope && !targetClassId) {
      setError('Select a target class first.');
      return;
    }
    const proceed = window.confirm(
      'Activate pending members in this class as unclaimed? This enables dues posting while members still complete claim onboarding.',
    );
    if (!proceed) {
      return;
    }
    setBusy('activate');
    setError(null);
    setMessage(null);
    try {
      const response = await fetchJson<ActivationResult>(`/admin/members/activate-unclaimed${scopeQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: isGlobalScope ? targetClassId : undefined,
        }),
        token: authToken,
      });
      setResult(null);
      setRemovedRows([]);
      setMessage(
        `Activation complete for ${response.classYear} - ${response.classLabel}. Pending found: ${response.pendingFound}, activated: ${response.activated}, class members: ${response.totalClassMembers}.`,
      );
      router.refresh();
    } catch (activationError) {
      setError(extractError(activationError));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="surface-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-red-700">Add members</p>
          <h2 className="text-lg font-semibold text-slate-900">Onboard members</h2>
          <p className="text-sm text-slate-500">
            Add members one-by-one or in bulk CSV, with unclaimed onboarding support.
          </p>
        </div>
        {addMemberTab === 'bulk' && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void downloadTemplate()}
            disabled={busy !== null}
          >
            {busy === 'template' ? 'Preparing...' : 'Download template'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn-pill text-sm ${
            addMemberTab === 'individual'
              ? 'border-red-300 bg-red-100 text-red-800'
              : 'border-slate-200 hover:border-slate-300'
          }`}
          onClick={() => setAddMemberTab('individual')}
        >
          Individual
        </button>
        <button
          type="button"
          className={`btn-pill text-sm ${
            addMemberTab === 'bulk'
              ? 'border-red-300 bg-red-100 text-red-800'
              : 'border-slate-200 hover:border-slate-300'
          }`}
          onClick={() => setAddMemberTab('bulk')}
        >
          Bulk
        </button>
      </div>

      {isBranchScope && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Member onboarding is available only in global or class scope.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {addMemberTab === 'bulk' && (
          <label className="text-sm text-slate-600">
            CSV file
            <input
              type="file"
              className="field-input"
              accept=".csv,text/csv,.txt"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={isBranchScope || busy !== null}
            />
          </label>
        )}
        <label className="text-sm text-slate-600">
          Default password for new members
          <input
            className="field-input"
            value={defaultPassword}
            onChange={(event) => setDefaultPassword(event.target.value)}
            disabled={isBranchScope || busy !== null || singleCreateBusy}
          />
        </label>
      </div>

      {addMemberTab === 'individual' && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-red-700">Single member onboarding</p>
          <p className="text-sm text-slate-600">
            Add one member directly as <span className="font-semibold">Active + Unclaimed</span> so dues/welfare postings can start immediately.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            First name
            <input
              className="field-input"
              value={singleMember.firstName}
              onChange={(event) => setSingleMember((prev) => ({ ...prev, firstName: event.target.value }))}
              disabled={isBranchScope || singleCreateBusy || busy !== null}
            />
          </label>
          <label className="text-sm text-slate-600">
            Last name
            <input
              className="field-input"
              value={singleMember.lastName}
              onChange={(event) => setSingleMember((prev) => ({ ...prev, lastName: event.target.value }))}
              disabled={isBranchScope || singleCreateBusy || busy !== null}
            />
          </label>
          <label className="text-sm text-slate-600">
            Middle name (optional)
            <input
              className="field-input"
              value={singleMember.middleName}
              onChange={(event) => setSingleMember((prev) => ({ ...prev, middleName: event.target.value }))}
              disabled={isBranchScope || singleCreateBusy || busy !== null}
            />
          </label>
          <label className="text-sm text-slate-600">
            Title
            <select
              className="field-input"
              value={singleMember.title}
              onChange={(event) => setSingleMember((prev) => ({ ...prev, title: event.target.value }))}
              disabled={isBranchScope || singleCreateBusy || busy !== null}
            >
              <option value="mr">Mr</option>
              <option value="mrs">Mrs</option>
              <option value="ms">Ms</option>
              <option value="chief">Chief</option>
              <option value="dr">Dr</option>
              <option value="prof">Prof</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Phone
            <input
              className="field-input"
              value={singleMember.phone}
              onChange={(event) => setSingleMember((prev) => ({ ...prev, phone: event.target.value }))}
              disabled={isBranchScope || singleCreateBusy || busy !== null}
            />
          </label>
          <label className="text-sm text-slate-600">
            Email
            <input
              className="field-input"
              value={singleMember.email}
              onChange={(event) => setSingleMember((prev) => ({ ...prev, email: event.target.value }))}
              disabled={isBranchScope || singleCreateBusy || busy !== null}
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {isGlobalScope ? (
            <label className="text-sm text-slate-600">
              Class
              <select
                className="field-input"
                value={singleMember.classId}
                onChange={(event) => setSingleMember((prev) => ({ ...prev, classId: event.target.value }))}
                disabled={isBranchScope || singleCreateBusy || busy !== null}
              >
                <option value="">Select class</option>
                {classes.map((classSet) => (
                  <option key={classSet.id} value={classSet.id}>
                    {classSet.entryYear} - {classSet.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-slate-600">
              Class scope: member will be created in the active class.
            </p>
          )}
          {isGlobalScope && (
            <label className="text-sm text-slate-600">
              Branch (optional)
              <select
                className="field-input"
                value={singleMember.branchId}
                onChange={(event) => setSingleMember((prev) => ({ ...prev, branchId: event.target.value }))}
                disabled={isBranchScope || singleCreateBusy || busy !== null}
              >
                <option value="">No branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm text-slate-600">
            House (optional)
            <select
              className="field-input"
              value={singleMember.houseId}
              onChange={(event) => setSingleMember((prev) => ({ ...prev, houseId: event.target.value }))}
              disabled={isBranchScope || singleCreateBusy || busy !== null}
            >
              <option value="">No house</option>
              {houses.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm text-slate-600">
            DOB day
            <input
              className="field-input"
              type="number"
              min={1}
              max={31}
              value={singleMember.dobDay}
              onChange={(event) => setSingleMember((prev) => ({ ...prev, dobDay: event.target.value }))}
              disabled={isBranchScope || singleCreateBusy || busy !== null}
            />
          </label>
          <label className="text-sm text-slate-600">
            DOB month
            <input
              className="field-input"
              type="number"
              min={1}
              max={12}
              value={singleMember.dobMonth}
              onChange={(event) => setSingleMember((prev) => ({ ...prev, dobMonth: event.target.value }))}
              disabled={isBranchScope || singleCreateBusy || busy !== null}
            />
          </label>
          <label className="text-sm text-slate-600">
            DOB year
            <input
              className="field-input"
              type="number"
              min={1900}
              max={2100}
              value={singleMember.dobYear}
              onChange={(event) => setSingleMember((prev) => ({ ...prev, dobYear: event.target.value }))}
              disabled={isBranchScope || singleCreateBusy || busy !== null}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-1">
            Note (optional)
            <input
              className="field-input"
              value={singleMember.note}
              onChange={(event) => setSingleMember((prev) => ({ ...prev, note: event.target.value }))}
              disabled={isBranchScope || singleCreateBusy || busy !== null}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => void createSingleMember()}
            disabled={isBranchScope || singleCreateBusy || busy !== null}
          >
            {singleCreateBusy ? 'Creating...' : 'Add single member'}
          </button>
        </div>
      </div>
      )}

      {addMemberTab === 'bulk' && isGlobalScope && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            Target class (optional)
            <select
              className="field-input"
              value={targetClassId}
              onChange={(event) => setTargetClassId(event.target.value)}
              disabled={isBranchScope || busy !== null}
            >
              <option value="">Use class from CSV rows</option>
              {classes.map((classSet) => (
                <option key={classSet.id} value={classSet.id}>
                  {classSet.entryYear} - {classSet.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Target branch (optional)
            <select
              className="field-input"
              value={targetBranchId}
              onChange={(event) => setTargetBranchId(event.target.value)}
              disabled={isBranchScope || busy !== null}
            >
              <option value="">Use branch from CSV rows</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={sendWelcomeEmail}
          onChange={(event) => setSendWelcomeEmail(event.target.checked)}
          disabled={isBranchScope || busy !== null || singleCreateBusy}
        />
        {addMemberTab === 'bulk'
          ? 'Send welcome notification emails after bulk commit'
          : 'Send welcome notification email after creating member'}
      </label>

      {addMemberTab === 'bulk' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => void runImport('preview')}
            disabled={isBranchScope || busy !== null}
          >
            {busy === 'preview' ? 'Previewing...' : 'Preview rows'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void runImport('commit')}
            disabled={isBranchScope || busy !== null || !result || visibleSummary.validRows === 0}
          >
            {busy === 'commit' ? 'Importing...' : 'Import valid rows'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void activatePendingAsUnclaimed()}
            disabled={isBranchScope || busy !== null}
          >
            {busy === 'activate' ? 'Activating...' : 'Activate pending as unclaimed'}
          </button>
        </div>
      )}

      {message && <p className="text-sm text-lime-700">{message}</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {addMemberTab === 'bulk' && result && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => removeMatchingRows((row) => row.action === 'update' && row.status === 'valid')}
            >
              Remove already registered
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => removeMatchingRows((row) => row.status === 'error')}
            >
              Remove rows with errors
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setRemovedRows([])}
              disabled={removedCount === 0}
            >
              Restore removed rows
            </button>
            <p className="text-xs text-slate-500">
              {removedCount > 0 ? `${removedCount} row(s) removed from this preview.` : 'All preview rows included.'}
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-6">
            <Stat label="Rows" value={String(visibleSummary.totalRows)} />
            <Stat label="Valid" value={String(visibleSummary.validRows)} />
            <Stat label="Failed" value={String(visibleSummary.failedRows)} />
            <Stat label="Create" value={String(visibleSummary.created)} />
            <Stat label="Update" value={String(visibleSummary.updated)} />
            <Stat label="Skipped" value={String(visibleSummary.skipped)} />
          </div>

          <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200">
            <table className="table-base">
              <thead>
                <tr className="text-xs uppercase text-slate-500">
                  <th className="py-2">Row</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Class</th>
                  <th className="py-2">Branch</th>
                  <th className="py-2">Manage</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={`${row.rowNumber}-${row.email}-${row.memberName}`} className={row.status === 'error' ? 'bg-rose-50/40' : ''}>
                    <td className="py-2 text-xs text-slate-600">{row.rowNumber}</td>
                    <td className="py-2 text-xs">
                      <span className={`btn-pill border ${row.status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-lime-200 bg-lime-50 text-lime-700'}`}>
                        {row.status === 'error' ? 'error' : row.action}
                      </span>
                    </td>
                    <td className="py-2 text-sm font-semibold text-slate-900">{row.memberName}</td>
                    <td className="py-2 text-sm text-slate-700">{row.email || 'N/A'}</td>
                    <td className="py-2 text-sm text-slate-700">{row.phone || 'N/A'}</td>
                    <td className="py-2 text-sm text-slate-700">{row.classLabel}</td>
                    <td className="py-2 text-sm text-slate-700">{row.branchLabel ?? 'N/A'}</td>
                    <td className="py-2 text-xs text-slate-600">
                      <button
                        type="button"
                        className="btn-pill border-rose-200 bg-rose-50 text-rose-700"
                        onClick={() => removeSingleRow(row.rowNumber)}
                      >
                        Remove
                      </button>
                    </td>
                    <td className="py-2 text-xs text-slate-600">
                      {row.errors.length > 0 && <p className="text-rose-700">{row.errors.join(' | ')}</p>}
                      {row.warnings.length > 0 && <p className="text-amber-700">{row.warnings.join(' | ')}</p>}
                      {row.errors.length === 0 && row.warnings.length === 0 && <span className="text-slate-500">OK</span>}
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr>
                    <td className="py-3 text-sm text-slate-500" colSpan={9}>
                      No rows currently selected in preview.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function extractError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Unable to process import request.';
  }
  const match = error.message.match(/^API\s+\d+:\s*(.*)$/i);
  if (!match) {
    return error.message;
  }
  const payload = match[1]?.trim();
  if (!payload) {
    return error.message;
  }
  try {
    const parsed = JSON.parse(payload) as { message?: string };
    if (parsed?.message) {
      return parsed.message;
    }
  } catch {
    return payload;
  }
  return error.message;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
      <p className="text-[11px] uppercase text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function summarizeRows(rows: RowResult[]) {
  let validRows = 0;
  let failedRows = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  rows.forEach((row) => {
    if (row.status === 'valid') {
      validRows += 1;
      if (row.action === 'create') {
        created += 1;
      } else if (row.action === 'update') {
        updated += 1;
      } else {
        skipped += 1;
      }
      return;
    }
    failedRows += 1;
    skipped += 1;
  });

  return {
    totalRows: rows.length,
    validRows,
    failedRows,
    created,
    updated,
    skipped,
  };
}
