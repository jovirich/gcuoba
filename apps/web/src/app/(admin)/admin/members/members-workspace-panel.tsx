'use client';

import { useState } from 'react';
import type { AdminMemberDTO, BranchDTO, ClassSetDTO, HouseDTO, RoleDTO } from '@gcuoba/types';
import { BulkMemberImportPanel } from './bulk-member-import-panel';
import { MemberManagementPanel } from './member-management-panel';

type ScopeType = 'global' | 'branch' | 'class';

type Props = {
  members: AdminMemberDTO[];
  branches: BranchDTO[];
  classes: ClassSetDTO[];
  houses: HouseDTO[];
  roles: RoleDTO[];
  authToken: string;
  activeScopeType?: ScopeType;
  activeScopeId?: string | null;
};

type MembersWorkspaceTab = 'members' | 'add-members';

export function MembersWorkspacePanel({
  members,
  branches,
  classes,
  houses,
  roles,
  authToken,
  activeScopeType,
  activeScopeId,
}: Props) {
  const [activeTab, setActiveTab] = useState<MembersWorkspaceTab>('members');

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn-pill text-sm ${
            activeTab === 'members'
              ? 'border-red-300 bg-red-100 text-red-800'
              : 'border-slate-200 hover:border-slate-300'
          }`}
          onClick={() => setActiveTab('members')}
        >
          Members
        </button>
        <button
          type="button"
          className={`btn-pill text-sm ${
            activeTab === 'add-members'
              ? 'border-red-300 bg-red-100 text-red-800'
              : 'border-slate-200 hover:border-slate-300'
          }`}
          onClick={() => setActiveTab('add-members')}
        >
          Add members
        </button>
      </div>

      {activeTab === 'members' ? (
        <MemberManagementPanel
          members={members}
          branches={branches}
          classes={classes}
          houses={houses}
          roles={roles}
          authToken={authToken}
          activeScopeType={activeScopeType}
          activeScopeId={activeScopeId ?? null}
        />
      ) : (
        <BulkMemberImportPanel
          authToken={authToken}
          classes={classes}
          branches={branches}
          houses={houses}
          activeScopeType={activeScopeType}
          activeScopeId={activeScopeId ?? null}
        />
      )}
    </section>
  );
}

