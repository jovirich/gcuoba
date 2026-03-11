'use client';

import type {
  BranchDTO,
  BranchMembershipDTO,
  ClassMembershipDTO,
  ClassSetDTO,
  CountryDTO,
  HouseDTO,
  ProfileDTO,
} from '@gcuoba/types';
import { fetchAppJson } from '@/lib/api';
import { NIGERIA_LGAS_BY_STATE, NIGERIA_STATES, PROFILE_TITLE_OPTIONS } from '@/lib/constants/profile-options';
import { useEffect, useMemo, useRef, useState } from 'react';

type PrivacySetting = 'public' | 'public_to_members' | 'private';

type ProfileFormState = {
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  sex: string;
  stateOfOrigin: string;
  lgaOfOrigin: string;
  resHouseNo: string;
  resStreet: string;
  resArea: string;
  resCity: string;
  resCountry: string;
  occupation: string;
  photoUrl: string;
  houseId: string;
  privacyLevel: PrivacySetting;
  classId: string;
};

type ProfileFormProps = {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  userStatus: 'pending' | 'active' | 'suspended';
  userAlumniNumber: string | null;
  authToken: string;
  isActive: boolean;
  isClassApprovedForSelfService: boolean;
  profile: ProfileDTO | null;
  classes: ClassSetDTO[];
  classMembership: ClassMembershipDTO | null;
  branches: BranchDTO[];
  branchMemberships: BranchMembershipDTO[];
  houses: HouseDTO[];
  countries: CountryDTO[];
};

function normalizeTitle(value: string | undefined | null): string {
  const normalized = (value ?? '').trim().toLowerCase();
  if (PROFILE_TITLE_OPTIONS.some((option) => option.value === normalized)) {
    return normalized;
  }
  return 'mr';
}


export function ProfileForm({
  userId,
  userName,
  userEmail,
  userPhone,
  userStatus,
  userAlumniNumber,
  authToken,
  isActive,
  isClassApprovedForSelfService,
  profile,
  classes,
  classMembership,
  branches,
  branchMemberships,
  houses,
  countries,
}: ProfileFormProps) {
  const [formState, setFormState] = useState<ProfileFormState>({
    title: normalizeTitle(profile?.title),
    firstName: profile?.firstName ?? userName.split(' ')[0] ?? '',
    middleName: profile?.middleName ?? '',
    lastName: profile?.lastName ?? userName.split(' ').slice(-1).join(' ') ?? '',
    dobDay: profile?.dobDay ? String(profile.dobDay) : '',
    dobMonth: profile?.dobMonth ? String(profile.dobMonth) : '',
    dobYear: profile?.dobYear ? String(profile.dobYear) : '',
    sex: profile?.sex ?? '',
    stateOfOrigin: profile?.stateOfOrigin ?? '',
    lgaOfOrigin: profile?.lgaOfOrigin ?? '',
    resHouseNo: profile?.residence?.houseNo ?? '',
    resStreet: profile?.residence?.street ?? '',
    resArea: profile?.residence?.area ?? '',
    resCity: profile?.residence?.city ?? '',
    resCountry: profile?.residence?.country ?? '',
    occupation: profile?.occupation ?? '',
    photoUrl: profile?.photoUrl ?? '',
    houseId: profile?.houseId ?? '',
    privacyLevel: (profile?.privacyLevel as PrivacySetting) ?? 'public_to_members',
    classId: classMembership?.classId ?? '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(profile?.photoUrl ?? null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [branchForm, setBranchForm] = useState({ branchId: '', note: '' });
  const [branchMessage, setBranchMessage] = useState<string | null>(null);
  const [branchSaving, setBranchSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const availableBranches = useMemo(() => {
    const excluded = new Set(branchMemberships.map((membership) => membership.branchId));
    return branches.filter((branch) => !excluded.has(branch.id));
  }, [branches, branchMemberships]);

  const houseNameMap = useMemo(() => {
    return new Map(houses.map((house) => [house.id, house.name]));
  }, [houses]);

  const branchNameMap = useMemo(() => {
    return new Map(branches.map((branch) => [branch.id, branch.name]));
  }, [branches]);

  const countryOptions = useMemo(() => {
    const values = new Set(countries.map((country) => country.name.trim()).filter(Boolean));
    if (formState.resCountry.trim()) {
      values.add(formState.resCountry.trim());
    }
    return Array.from(values).sort((left, right) => left.localeCompare(right));
  }, [countries, formState.resCountry]);

  const stateOptions = useMemo(() => {
    const values = new Set(NIGERIA_STATES);
    if (formState.stateOfOrigin.trim()) {
      values.add(formState.stateOfOrigin.trim());
    }
    return Array.from(values).sort((left, right) => left.localeCompare(right));
  }, [formState.stateOfOrigin]);

  const lgaOptions = useMemo(() => {
    const base = NIGERIA_LGAS_BY_STATE.get(formState.stateOfOrigin) ?? [];
    const values = new Set(base);
    if (formState.lgaOfOrigin.trim()) {
      values.add(formState.lgaOfOrigin.trim());
    }
    return Array.from(values).sort((left, right) => left.localeCompare(right));
  }, [formState.stateOfOrigin, formState.lgaOfOrigin]);
  useEffect(() => {
    return () => {
      if (photoPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  function parseOptionalNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return parsed;
  }

  function buildProfilePayload(selectedPhotoFile: File | null) {
    const payload = new FormData();
    payload.append('title', formState.title);
    payload.append('firstName', formState.firstName.trim());
    payload.append('middleName', formState.middleName.trim());
    payload.append('lastName', formState.lastName.trim());
    payload.append('sex', formState.sex.trim());
    payload.append('stateOfOrigin', formState.stateOfOrigin.trim());
    payload.append('lgaOfOrigin', formState.lgaOfOrigin.trim());
    payload.append('resHouseNo', formState.resHouseNo.trim());
    payload.append('resStreet', formState.resStreet.trim());
    payload.append('resArea', formState.resArea.trim());
    payload.append('resCity', formState.resCity.trim());
    payload.append('resCountry', formState.resCountry.trim());
    payload.append('occupation', formState.occupation.trim());
    payload.append('photoUrl', formState.photoUrl.trim());
    payload.append('houseId', formState.houseId);
    payload.append('privacyLevel', formState.privacyLevel);
    const dobDay = parseOptionalNumber(formState.dobDay);
    const dobMonth = parseOptionalNumber(formState.dobMonth);
    const dobYear = parseOptionalNumber(formState.dobYear);
    if (dobDay) {
      payload.append('dobDay', String(dobDay));
    }
    if (dobMonth) {
      payload.append('dobMonth', String(dobMonth));
    }
    if (dobYear) {
      payload.append('dobYear', String(dobYear));
    }
    if (selectedPhotoFile) {
      payload.append('photo', selectedPhotoFile);
    }
    return payload;
  }

  async function persistProfile(selectedPhotoFile: File | null) {
    const updatedProfile = await fetchAppJson<ProfileDTO>(`/api/profiles/${userId}`, {
      method: 'PUT',
      body: buildProfilePayload(selectedPhotoFile),
      token: authToken,
    });

    if (!isClassApprovedForSelfService && formState.classId) {
      await fetchAppJson(`/api/memberships/class/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: formState.classId }),
        token: authToken,
      });
    }

    setFormState((state) => ({
      ...state,
      photoUrl: updatedProfile.photoUrl ?? '',
      dobDay: updatedProfile.dobDay ? String(updatedProfile.dobDay) : '',
      dobMonth: updatedProfile.dobMonth ? String(updatedProfile.dobMonth) : '',
      dobYear: updatedProfile.dobYear ? String(updatedProfile.dobYear) : '',
    }));
    setPhotoPreviewUrl(updatedProfile.photoUrl ?? null);
    setPhotoFile(null);
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    setPhotoMessage(null);
    try {
      await persistProfile(photoFile);
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

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setPhotoFile(selected);
    if (!selected) {
      setPhotoPreviewUrl(formState.photoUrl || null);
      return;
    }
    if (photoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    const objectUrl = URL.createObjectURL(selected);
    setPhotoPreviewUrl(objectUrl);
    setProfileSaving(true);
    setProfileMessage(null);
    setPhotoMessage(null);
    try {
      await persistProfile(selected);
      setPhotoMessage('Profile photo uploaded successfully.');
      if (objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      setPhotoMessage(error instanceof Error ? error.message : 'Failed to upload profile photo.');
      setPhotoPreviewUrl(formState.photoUrl || null);
    } finally {
      setProfileSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <div className="space-y-6">
      <section className="surface-card space-y-3 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Account details</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <p className="text-sm text-slate-600">
            Full name
            <span className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
              {userName || 'N/A'}
            </span>
          </p>
          <p className="text-sm text-slate-600">
            Account status
            <span className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 capitalize">
              {userStatus}
            </span>
          </p>
          <p className="text-sm text-slate-600">
            Email
            <span className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
              {userEmail || 'N/A'}
            </span>
          </p>
          <p className="text-sm text-slate-600">
            Phone
            <span className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
              {userPhone || 'N/A'}
            </span>
          </p>
          <p className="text-sm text-slate-600">
            Alumni number
            <span className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
              {userAlumniNumber || 'Not assigned yet'}
            </span>
          </p>
          <p className="text-sm text-slate-600">
            Current house
            <span className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
              {formState.houseId ? houseNameMap.get(formState.houseId) ?? `House ${formState.houseId}` : 'N/A'}
            </span>
          </p>
        </div>
      </section>

      <form onSubmit={handleProfileSubmit} className="space-y-4 surface-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Biodata</h2>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <button
            type="button"
            className="h-16 w-16 overflow-hidden rounded-full border border-slate-300 bg-white"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreviewUrl} alt="Profile thumbnail" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-slate-500">No photo</span>
            )}
          </button>
          <div>
            <p className="text-sm font-medium text-slate-800">Profile photo</p>
            <p className="text-xs text-slate-500">Click the thumbnail to upload a new picture.</p>
            {photoMessage && <p className="mt-1 text-xs text-slate-700">{photoMessage}</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            Title
            <select
              className="field-input"
              value={formState.title}
              onChange={(event) => setFormState((state) => ({ ...state, title: event.target.value }))}
            >
              {PROFILE_TITLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            First name
            <input
              className="field-input"
              value={formState.firstName}
              onChange={(event) => setFormState((state) => ({ ...state, firstName: event.target.value }))}
              required
              disabled={isClassApprovedForSelfService}
            />
          </label>

          <label className="text-sm text-slate-600">
            Last name
            <input
              className="field-input"
              value={formState.lastName}
              onChange={(event) => setFormState((state) => ({ ...state, lastName: event.target.value }))}
              required
              disabled={isClassApprovedForSelfService}
            />
          </label>

          <label className="text-sm text-slate-600">
            Middle name (optional)
            <input
              className="field-input"
              value={formState.middleName}
              onChange={(event) => setFormState((state) => ({ ...state, middleName: event.target.value }))}
              disabled={isClassApprovedForSelfService}
            />
          </label>

          <label className="text-sm text-slate-600">
            Sex
            <input
              className="field-input"
              value={formState.sex}
              onChange={(event) => setFormState((state) => ({ ...state, sex: event.target.value }))}
              placeholder="Male, Female..."
            />
          </label>

          <label className="text-sm text-slate-600">
            State of origin
            <select
              className="field-input"
              value={formState.stateOfOrigin}
              onChange={(event) =>
                setFormState((state) => {
                  const stateOfOrigin = event.target.value;
                  const lgaList = NIGERIA_LGAS_BY_STATE.get(stateOfOrigin) ?? [];
                  const lgaStillValid = !state.lgaOfOrigin || lgaList.includes(state.lgaOfOrigin);
                  return {
                    ...state,
                    stateOfOrigin,
                    lgaOfOrigin: lgaStillValid ? state.lgaOfOrigin : '',
                  };
                })
              }
            >
              <option value="">Select state</option>
              {stateOptions.map((stateName) => (
                <option key={stateName} value={stateName}>
                  {stateName}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Occupation
            <input
              className="field-input"
              value={formState.occupation}
              onChange={(event) => setFormState((state) => ({ ...state, occupation: event.target.value }))}
            />
          </label>

          <label className="text-sm text-slate-600">
            LGA of origin
            <select
              className="field-input"
              value={formState.lgaOfOrigin}
              onChange={(event) => setFormState((state) => ({ ...state, lgaOfOrigin: event.target.value }))}
              disabled={!formState.stateOfOrigin}
            >
              <option value="">{formState.stateOfOrigin ? 'Select LGA' : 'Select state first'}</option>
              {lgaOptions.map((lga) => (
                <option key={lga} value={lga}>
                  {lga}
                </option>
              ))}
            </select>
          </label>

          <div className="text-sm text-slate-600">
            <span className="block">Date of birth</span>
            <div className="mt-1 grid gap-2 grid-cols-3">
              <label className="text-xs text-slate-600">
                Day
                <input
                  className="field-input md:max-w-[96px]"
                  type="number"
                  min={1}
                  max={31}
                  value={formState.dobDay}
                  onChange={(event) => setFormState((state) => ({ ...state, dobDay: event.target.value }))}
                  placeholder="DD"
                />
              </label>
              <label className="text-xs text-slate-600">
                Month
                <input
                  className="field-input md:max-w-[96px]"
                  type="number"
                  min={1}
                  max={12}
                  value={formState.dobMonth}
                  onChange={(event) => setFormState((state) => ({ ...state, dobMonth: event.target.value }))}
                  placeholder="MM"
                />
              </label>
              <label className="text-xs text-slate-600">
                Year
                <input
                  className="field-input md:max-w-[124px]"
                  type="number"
                  min={1900}
                  max={2100}
                  value={formState.dobYear}
                  onChange={(event) => setFormState((state) => ({ ...state, dobYear: event.target.value }))}
                  placeholder="optional"
                />
              </label>
            </div>
          </div>

        </div>

        <h3 className="text-base font-semibold text-slate-900">Residence</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            House number
            <input
              className="field-input"
              value={formState.resHouseNo}
              onChange={(event) => setFormState((state) => ({ ...state, resHouseNo: event.target.value }))}
            />
          </label>

          <label className="text-sm text-slate-600">
            Street
            <input
              className="field-input"
              value={formState.resStreet}
              onChange={(event) => setFormState((state) => ({ ...state, resStreet: event.target.value }))}
            />
          </label>

          <label className="text-sm text-slate-600">
            Area
            <input
              className="field-input"
              value={formState.resArea}
              onChange={(event) => setFormState((state) => ({ ...state, resArea: event.target.value }))}
            />
          </label>

          <label className="text-sm text-slate-600">
            City
            <input
              className="field-input"
              value={formState.resCity}
              onChange={(event) => setFormState((state) => ({ ...state, resCity: event.target.value }))}
            />
          </label>

          <label className="text-sm text-slate-600 md:col-span-2">
            Country
            <select
              className="field-input"
              value={formState.resCountry}
              onChange={(event) => setFormState((state) => ({ ...state, resCountry: event.target.value }))}
            >
              <option value="">Select country</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h3 className="text-base font-semibold text-slate-900">Privacy and membership</h3>
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
            disabled={isClassApprovedForSelfService}
          >
            <option value="">Select a class</option>
            {classes.map((classSet) => (
              <option key={classSet.id} value={classSet.id}>
                {classSet.entryYear} - {classSet.label}
              </option>
            ))}
          </select>
        </label>

        {isClassApprovedForSelfService && (
          <p className="text-xs text-amber-700">
            Your class and legal name are locked after class approval. Contact an administrator if updates are needed.
          </p>
        )}

        <label className="text-sm text-slate-600">
          House
          <select
            className="field-input"
            value={formState.houseId}
            onChange={(event) => setFormState((state) => ({ ...state, houseId: event.target.value }))}
          >
            <option value="">Select house</option>
            {houses.map((house) => (
              <option key={house.id} value={house.id}>
                {house.name}
              </option>
            ))}
          </select>
        </label>

        <div className="pt-3">
          <button type="submit" className="btn-primary disabled:opacity-50" disabled={profileSaving}>
            {profileSaving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
        {profileMessage && <p className="text-sm text-slate-600">{profileMessage}</p>}
      </form>

      <form onSubmit={handleBranchSubmit} className="space-y-4 surface-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Branch membership</h2>
        <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs uppercase text-slate-500">Current branch memberships</p>
          {branchMemberships.length === 0 ? (
            <p className="text-sm text-slate-500">No branch memberships yet.</p>
          ) : (
            <ul className="space-y-2">
              {branchMemberships.map((membership) => (
                <li key={membership.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-800">
                    {branchNameMap.get(membership.branchId) ?? `Branch ${membership.branchId}`}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 capitalize">
                    {membership.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

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
