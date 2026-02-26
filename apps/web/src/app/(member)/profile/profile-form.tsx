'use client';

import type {
  BranchDTO,
  BranchMembershipDTO,
  ClassMembershipDTO,
  ClassSetDTO,
  ProfileDTO,
} from '@gcuoba/types';
import { fetchAppJson } from '@/lib/api';
import { useMemo, useState } from 'react';

type PrivacySetting = 'public' | 'public_to_members' | 'private';
type ProfileFormState = {
  firstName: string;
  lastName: string;
  privacyLevel: PrivacySetting;
  classId: string;
};
type ProfileFormProps = {
  userId: string;
  userName: string;
  authToken: string;
  isActive: boolean;
  profile: ProfileDTO | null;
  classes: ClassSetDTO[];
  classMembership: ClassMembershipDTO | null;
  branches: BranchDTO[];
  branchMemberships: BranchMembershipDTO[];
};

export function ProfileForm({
  userId,
  userName,
  authToken,
  isActive,
  profile,
  classes,
  classMembership,
  branches,
  branchMemberships,
}: ProfileFormProps) {
  const [formState, setFormState] = useState<ProfileFormState>({
    firstName: profile?.firstName ?? userName.split(' ')[0] ?? '',
    lastName: profile?.lastName ?? userName.split(' ').slice(-1).join(' ') ?? '',
    privacyLevel: (profile?.privacyLevel as PrivacySetting) ?? 'public_to_members',
    classId: classMembership?.classId ?? '',
  });
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [branchForm, setBranchForm] = useState({ branchId: '', note: '' });
  const [branchMessage, setBranchMessage] = useState<string | null>(null);
  const [branchSaving, setBranchSaving] = useState(false);

  const availableBranches = useMemo(() => {
    const excluded = new Set(branchMemberships.map((membership) => membership.branchId));
    return branches.filter((branch) => !excluded.has(branch.id));
  }, [branches, branchMemberships]);

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await fetchAppJson(`/api/profiles/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formState.firstName,
          lastName: formState.lastName,
          privacyLevel: formState.privacyLevel,
        }),
        token: authToken,
      });

      if (formState.classId) {
        await fetchAppJson(`/api/memberships/class/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classId: formState.classId }),
          token: authToken,
        });
      }

      setProfileMessage('Profile saved successfully.');
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Failed to save profile.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleBranchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBranchSaving(true);
    setBranchMessage(null);

    try {
      await fetchAppJson(`/api/memberships/branches/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchForm),
        token: authToken,
      });
      setBranchMessage('Branch request submitted.');
      setBranchForm({ branchId: '', note: '' });
    } catch (error) {
      setBranchMessage(error instanceof Error ? error.message : 'Failed to submit request.');
    } finally {
      setBranchSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleProfileSubmit} className="space-y-4 surface-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Biodata</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            First name
            <input
              className="field-input"
              value={formState.firstName}
              onChange={(event) => setFormState((state) => ({ ...state, firstName: event.target.value }))}
              required
            />
          </label>
          <label className="text-sm text-slate-600">
            Last name
            <input
              className="field-input"
              value={formState.lastName}
              onChange={(event) => setFormState((state) => ({ ...state, lastName: event.target.value }))}
              required
            />
          </label>
        </div>

        <label className="text-sm text-slate-600">
          Privacy level
          <select
            className="field-input"
            value={formState.privacyLevel}
            onChange={(event) =>
              setFormState((state) => ({ ...state, privacyLevel: event.target.value as PrivacySetting }))
            }
          >
            <option value="public_to_members">Visible to logged-in members</option>
            <option value="public">Public</option>
            <option value="private">Only you</option>
          </select>
        </label>

        <label className="text-sm text-slate-600">
          Entry class
          <select
            className="field-input"
            value={formState.classId}
            onChange={(event) => setFormState((state) => ({ ...state, classId: event.target.value }))}
          >
            <option value="">Select a class</option>
            {classes.map((classSet) => (
              <option key={classSet.id} value={classSet.id}>
                {classSet.entryYear} - {classSet.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="btn-primary disabled:opacity-50"
          disabled={profileSaving}
        >
          {profileSaving ? 'Saving...' : 'Save profile'}
        </button>
        {profileMessage && <p className="text-sm text-slate-600">{profileMessage}</p>}
      </form>

      <form onSubmit={handleBranchSubmit} className="space-y-4 surface-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Branch membership</h2>
        <label className="text-sm text-slate-600">
          Branch
          <select
            className="field-input"
            value={branchForm.branchId}
            onChange={(event) => setBranchForm((state) => ({ ...state, branchId: event.target.value }))}
            required
          >
            <option value="">Select branch</option>
            {availableBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Note (optional)
          <textarea
            className="field-input"
            value={branchForm.note}
            onChange={(event) => setBranchForm((state) => ({ ...state, note: event.target.value }))}
            rows={3}
          />
        </label>
        <button
          type="submit"
          className="btn-secondary disabled:opacity-50"
          disabled={branchSaving || availableBranches.length === 0 || !isActive}
        >
          {branchSaving ? 'Submitting...' : 'Request branch membership'}
        </button>
        {availableBranches.length === 0 && (
          <p className="text-xs text-slate-500">You have membership requests for every available branch.</p>
        )}
        {!isActive && (
          <p className="text-xs text-amber-600">
            Branch requests are available after your account is activated.
          </p>
        )}
        {branchMessage && <p className="text-sm text-slate-600">{branchMessage}</p>}
      </form>
    </div>
  );
}



