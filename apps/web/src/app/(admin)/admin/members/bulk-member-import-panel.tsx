'use client';

import type { BranchDTO, ClassSetDTO } from '@gcuoba/types';
import { API_BASE_URL, fetchJson } from '@/lib/api';
import { useMemo, useState } from 'react';

type ScopeType = 'global' | 'branch' | 'class';

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

type Props = {
  authToken: string;
  classes: ClassSetDTO[];
  branches: BranchDTO[];
  activeScopeType?: ScopeType;
  activeScopeId?: string | null;
};

export function BulkMemberImportPanel({
  authToken,
  classes,
  branches,
  activeScopeType,
  activeScopeId,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [defaultPassword, setDefaultPassword] = useState('Gcuoba2026');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [targetClassId, setTargetClassId] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [busy, setBusy] = useState<'template' | 'preview' | 'commit' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

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
    if (mode === 'commit') {
      const proceed = window.confirm('Import valid rows now? Existing members may be updated.');
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
      const response = await fetchJson<ImportResult>(`/admin/members/import${scopeQuery}`, {
        method: 'POST',
        body: form,
        token: authToken,
      });
      setResult(response);
      if (mode === 'preview') {
        setMessage(`Preview ready. ${response.summary.validRows} valid row(s), ${response.summary.failedRows} row(s) with issues.`);
      } else {
        setMessage(`Import complete. Created: ${response.summary.created}, Updated: ${response.summary.updated}, Failed: ${response.summary.failedRows}.`);
      }
    } catch (importError) {
      setError(extractError(importError));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="surface-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-red-700">Bulk import</p>
          <h2 className="text-lg font-semibold text-slate-900">Import members from Excel CSV</h2>
          <p className="text-sm text-slate-500">
            Start with the template, fill data in Excel, then save as <span className="font-semibold">CSV UTF-8</span> and upload.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void downloadTemplate()}
          disabled={busy !== null}
        >
          {busy === 'template' ? 'Preparing...' : 'Download template'}
        </button>
      </div>

      {isBranchScope && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Bulk member import is currently available only in global or class scope.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
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
        <label className="text-sm text-slate-600">
          Default password for new members
          <input
            className="field-input"
            value={defaultPassword}
            onChange={(event) => setDefaultPassword(event.target.value)}
            disabled={isBranchScope || busy !== null}
          />
        </label>
      </div>

      {isGlobalScope && (
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
          disabled={isBranchScope || busy !== null}
        />
        Send welcome notification emails after commit
      </label>

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
          disabled={isBranchScope || busy !== null || !result || result.summary.validRows === 0}
        >
          {busy === 'commit' ? 'Importing...' : 'Import valid rows'}
        </button>
      </div>

      {message && <p className="text-sm text-lime-700">{message}</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-6">
            <Stat label="Rows" value={String(result.summary.totalRows)} />
            <Stat label="Valid" value={String(result.summary.validRows)} />
            <Stat label="Failed" value={String(result.summary.failedRows)} />
            <Stat label="Create" value={String(result.summary.created)} />
            <Stat label="Update" value={String(result.summary.updated)} />
            <Stat label="Skipped" value={String(result.summary.skipped)} />
          </div>

          <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200">
            <table className="table-base">
              <thead>
                <tr className="text-xs uppercase text-slate-500">
                  <th className="py-2">Row</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Member</th>
                  <th className="py-2">Class</th>
                  <th className="py-2">Branch</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={`${row.rowNumber}-${row.email}-${row.memberName}`} className={row.status === 'error' ? 'bg-rose-50/40' : ''}>
                    <td className="py-2 text-xs text-slate-600">{row.rowNumber}</td>
                    <td className="py-2 text-xs">
                      <span className={`btn-pill border ${row.status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-lime-200 bg-lime-50 text-lime-700'}`}>
                        {row.status === 'error' ? 'error' : row.action}
                      </span>
                    </td>
                    <td className="py-2 text-sm">
                      <p className="font-semibold text-slate-900">{row.memberName}</p>
                      <p className="text-xs text-slate-500">{row.email}</p>
                    </td>
                    <td className="py-2 text-sm text-slate-700">{row.classLabel}</td>
                    <td className="py-2 text-sm text-slate-700">{row.branchLabel ?? 'N/A'}</td>
                    <td className="py-2 text-xs text-slate-600">
                      {row.errors.length > 0 && <p className="text-rose-700">{row.errors.join(' | ')}</p>}
                      {row.warnings.length > 0 && <p className="text-amber-700">{row.warnings.join(' | ')}</p>}
                      {row.errors.length === 0 && row.warnings.length === 0 && <span className="text-slate-500">OK</span>}
                    </td>
                  </tr>
                ))}
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
