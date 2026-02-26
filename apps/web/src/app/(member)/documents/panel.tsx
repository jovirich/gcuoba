'use client';

import type {
  BranchDTO,
  BranchMembershipDTO,
  ClassMembershipDTO,
  ClassSetDTO,
  DocumentRecordDTO,
} from '@gcuoba/types';
import { API_BASE_URL, fetchJson } from '@/lib/api';
import { useMemo, useState } from 'react';

type DocumentsPanelProps = {
  authToken: string;
  initialDocuments: DocumentRecordDTO[];
  branchMemberships: BranchMembershipDTO[];
  classMembership: ClassMembershipDTO | null;
  branches: BranchDTO[];
  classes: ClassSetDTO[];
};

type ScopeType = 'private' | 'global' | 'branch' | 'class';
type Visibility = 'private' | 'scope' | 'public';

export function DocumentsPanel({
  authToken,
  initialDocuments,
  branchMemberships,
  classMembership,
  branches,
  classes,
}: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<DocumentRecordDTO[]>(initialDocuments);
  const [scopeDocuments, setScopeDocuments] = useState<DocumentRecordDTO[]>([]);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scopeType, setScopeType] = useState<ScopeType>('private');
  const [scopeId, setScopeId] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approvedBranchIds = useMemo(
    () =>
      branchMemberships
        .filter((membership) => membership.status === 'approved')
        .map((membership) => membership.branchId),
    [branchMemberships],
  );

  const branchOptions = useMemo(
    () => branches.filter((branch) => approvedBranchIds.includes(branch.id)),
    [approvedBranchIds, branches],
  );

  const classOption = useMemo(() => {
    if (!classMembership?.classId) {
      return null;
    }
    return classes.find((classSet) => classSet.id === classMembership.classId) ?? null;
  }, [classMembership, classes]);

  async function refreshMyDocuments() {
    const latest = await fetchJson<DocumentRecordDTO[]>('/documents/mine', {
      token: authToken,
    });
    setDocuments(latest);
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }
    if (scopeType !== 'private' && scopeType !== 'global' && !scopeId) {
      setError('Please select a scope before uploading.');
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      params.set('scopeType', scopeType);
      if (scopeType === 'branch' || scopeType === 'class') {
        params.set('scopeId', scopeId);
      }
      params.set('visibility', visibility);

      const formData = new FormData();
      formData.append('file', file);

      await fetchJson<DocumentRecordDTO>(`/documents/upload?${params.toString()}`, {
        method: 'POST',
        body: formData,
        token: authToken,
      });

      await refreshMyDocuments();
      setFile(null);
      setMessage('Document uploaded successfully.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId: string) {
    setDeletingId(documentId);
    setError(null);
    setMessage(null);
    try {
      await fetchJson(`/documents/${documentId}`, {
        method: 'DELETE',
        token: authToken,
      });
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      setScopeDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      setMessage('Document deleted.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(documentId: string, suggestedName: string) {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`API ${response.status}: ${await response.text()}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = suggestedName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Failed to download document.');
    }
  }

  async function loadScopeDocuments() {
    if (scopeType === 'private') {
      setScopeDocuments([]);
      return;
    }
    if (scopeType !== 'global' && !scopeId) {
      setError('Select a scope before loading documents.');
      return;
    }

    setScopeLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('scopeType', scopeType);
      if (scopeType === 'branch' || scopeType === 'class') {
        params.set('scopeId', scopeId);
      }
      const docs = await fetchJson<DocumentRecordDTO[]>(`/documents/scope?${params.toString()}`, {
        token: authToken,
      });
      setScopeDocuments(docs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load scope documents.');
    } finally {
      setScopeLoading(false);
    }
  }

  const scopeVisibilityDisabled = scopeType === 'private';

  return (
    <section className="space-y-6">
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
        <h2 className="text-lg font-semibold text-slate-900">Upload document</h2>
        <form onSubmit={handleUpload} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-600 md:col-span-2">
            File
            <input
              required
              type="file"
              className="field-input"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="text-sm text-slate-600">
            Scope
            <select
              className="field-input"
              value={scopeType}
              onChange={(event) => {
                const nextScope = event.target.value as ScopeType;
                setScopeType(nextScope);
                setScopeId('');
                setVisibility(nextScope === 'private' ? 'private' : 'scope');
              }}
            >
              <option value="private">Private (me only)</option>
              <option value="global">Global (admins only)</option>
              <option value="branch">Branch</option>
              <option value="class">Class</option>
            </select>
          </label>
          {scopeType === 'branch' && (
            <label className="text-sm text-slate-600">
              Branch
              <select
                required
                className="field-input"
                value={scopeId}
                onChange={(event) => setScopeId(event.target.value)}
              >
                <option value="">Select branch</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {scopeType === 'class' && (
            <label className="text-sm text-slate-600">
              Class
              <select
                required
                className="field-input"
                value={scopeId}
                onChange={(event) => setScopeId(event.target.value)}
              >
                <option value="">Select class</option>
                {classOption && (
                  <option value={classOption.id}>
                    {classOption.entryYear} - {classOption.label}
                  </option>
                )}
              </select>
            </label>
          )}
          <label className="text-sm text-slate-600">
            Visibility
            <select
              className="field-input"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as Visibility)}
              disabled={scopeVisibilityDisabled}
            >
              <option value="private">Private</option>
              <option value="scope">Scope members</option>
              <option value="public">Public</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="btn-primary disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload document'}
            </button>
          </div>
        </form>
      </section>

      <section className="surface-card p-4">
        <h2 className="text-lg font-semibold text-slate-900">My documents</h2>
        <DocumentTable
          rows={documents}
          onDownload={(doc) => void handleDownload(doc.id, doc.originalName)}
          onDelete={(doc) => void handleDelete(doc.id)}
          deletingId={deletingId}
        />
      </section>

      <section className="surface-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Scope documents</h2>
          <button
            type="button"
            className="btn-pill disabled:opacity-50"
            onClick={() => void loadScopeDocuments()}
            disabled={scopeLoading || scopeType === 'private'}
          >
            {scopeLoading ? 'Loading...' : 'Load scope docs'}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Use the current upload scope selector above, then click &quot;Load scope docs&quot;.
        </p>
        <DocumentTable rows={scopeDocuments} onDownload={(doc) => void handleDownload(doc.id, doc.originalName)} />
      </section>
    </section>
  );
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentTable({
  rows,
  onDownload,
  onDelete,
  deletingId,
}: {
  rows: DocumentRecordDTO[];
  onDownload: (doc: DocumentRecordDTO) => void;
  onDelete?: (doc: DocumentRecordDTO) => void;
  deletingId?: string | null;
}) {
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">No documents found.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table-base">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2">Name</th>
            <th className="py-2">Scope</th>
            <th className="py-2">Visibility</th>
            <th className="py-2">Size</th>
            <th className="py-2">Uploaded</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((doc) => (
            <tr key={doc.id} className="table-row">
              <td className="py-2">{doc.originalName}</td>
              <td className="py-2">
                {doc.scopeType}
                {doc.scopeId ? `:${doc.scopeId}` : ''}
              </td>
              <td className="py-2">{doc.visibility}</td>
              <td className="py-2">{formatBytes(doc.sizeBytes)}</td>
              <td className="py-2 text-xs text-slate-500">{new Date(doc.uploadedAt).toLocaleString()}</td>
              <td className="py-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-pill"
                    onClick={() => onDownload(doc)}
                  >
                    Download
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                      onClick={() => onDelete(doc)}
                      disabled={deletingId === doc.id}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}




