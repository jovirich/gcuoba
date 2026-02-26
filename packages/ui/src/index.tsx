import type { BranchDTO } from '@gcuoba/types';

export function BranchCard({ branch }: { branch: BranchDTO }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">Branch</p>
      <p className="text-lg font-semibold text-slate-900">{branch.name}</p>
      {branch.country ? (
        <p className="text-xs text-slate-500">{branch.country}</p>
      ) : null}
    </div>
  );
}
