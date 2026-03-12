'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchAppJson } from '@/lib/api';

type ClaimMember = {
  userId: string;
  name: string;
  phone: string | null;
  emailMasked: string;
  emailIsPlaceholder: boolean;
};

type ClaimOptions = {
  classInfo: {
    classId: string;
    entryYear: number;
    label: string;
  };
  branches: Array<{ id: string; name: string }>;
  houses: Array<{ id: string; name: string }>;
};

type VerifyResponse = {
  token: string;
  member: ClaimMember;
  classInfo: ClaimOptions['classInfo'];
};

type CompleteResponse = {
  success: true;
  userId: string;
};

type Props = {
  classYear: number;
};

type FormState = {
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  branchId: string;
  houseId: string;
  note: string;
};

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: '', middleName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: '' };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1] };
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

function extractError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Request failed. Please try again.';
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

export function ClassClaimForm({ classYear }: Props) {
  const [options, setOptions] = useState<ClaimOptions | null>(null);
  const [members, setMembers] = useState<ClaimMember[]>([]);
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState<'all' | 'name' | 'email' | 'phone'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [defaultPassword, setDefaultPassword] = useState('');
  const [claimToken, setClaimToken] = useState<string>('');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [busy, setBusy] = useState<'verify' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  const [form, setForm] = useState<FormState>({
    title: 'mr',
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    branchId: '',
    houseId: '',
    note: '',
  });

  const selectedMember = useMemo(
    () => members.find((entry) => entry.userId === selectedUserId) ?? null,
    [members, selectedUserId],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadOptions() {
    setLoadingOptions(true);
    try {
      const data = await fetchAppJson<ClaimOptions>(`/api/claims/class/${classYear}/options`);
      setOptions(data);
      setForm((prev) => ({
        ...prev,
        branchId: prev.branchId || data.branches[0]?.id || '',
        houseId: prev.houseId || data.houses[0]?.id || '',
      }));
    } catch (loadError) {
      setError(extractError(loadError));
    } finally {
      setLoadingOptions(false);
    }
  }

  async function loadMembers(query?: string) {
    setLoadingMembers(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query?.trim()) {
        params.set('query', query.trim());
        params.set('searchBy', searchBy);
      }
      const queryString = params.toString();
      const data = await fetchAppJson<{ members: ClaimMember[] }>(
        `/api/claims/class/${classYear}/members${queryString ? `?${queryString}` : ''}`,
      );
      setMembers(data.members);
      if (data.members.length === 0) {
        setSelectedUserId('');
      } else if (!data.members.some((entry) => entry.userId === selectedUserId)) {
        setSelectedUserId(data.members[0].userId);
      }
    } catch (loadError) {
      setError(extractError(loadError));
    } finally {
      setLoadingMembers(false);
    }
  }

  useEffect(() => {
    void loadOptions();
    void loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classYear]);

  useEffect(() => {
    if (!selectedMember) {
      return;
    }
    const split = splitName(selectedMember.name);
    setForm((prev) => ({
      ...prev,
      firstName: prev.firstName || split.firstName,
      middleName: prev.middleName || split.middleName,
      lastName: prev.lastName || split.lastName,
      phone: prev.phone || selectedMember.phone || '',
    }));
  }, [selectedMember]);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadMembers(search);
  }

  async function verifyDefaultPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) {
      setError('Select your name first.');
      return;
    }
    setBusy('verify');
    setError(null);
    setNotice(null);
    try {
      const result = await fetchAppJson<VerifyResponse>(`/api/claims/class/${classYear}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedMember.userId, password: defaultPassword }),
      });
      setClaimToken(result.token);
      setNotice('Verification successful. Complete your profile details below.');
    } catch (verifyError) {
      setError(extractError(verifyError));
    } finally {
      setBusy(null);
    }
  }

  async function completeClaim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!claimToken) {
      setError('Verify your default password first.');
      return;
    }
    setBusy('save');
    setError(null);
    setNotice(null);
    try {
      await fetchAppJson<CompleteResponse>(`/api/claims/class/${classYear}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: claimToken,
          title: form.title,
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          dobDay: Number(form.dobDay),
          dobMonth: Number(form.dobMonth),
          dobYear: form.dobYear ? Number(form.dobYear) : null,
          branchId: form.branchId || null,
          houseId: form.houseId || null,
          note: form.note || null,
        }),
      });
      setComplete(true);
      setNotice('Account claimed successfully. You can now sign in with your updated email or phone.');
    } catch (saveError) {
      setError(extractError(saveError));
    } finally {
      setBusy(null);
    }
  }

  if (loadingOptions) {
    return <p className="text-sm text-slate-500">Loading claim options...</p>;
  }

  if (!options) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
        Unable to load claim setup.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface-card space-y-4 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-red-700">Class account claim</p>
        <h2 className="text-2xl font-semibold text-slate-900">
          Class {options.classInfo.entryYear} - {options.classInfo.label}
        </h2>
        <p className="text-sm text-slate-500">
          Find your name, verify with the class default password, then set your personal contact and login details.
        </p>

        {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        {notice ? <p className="rounded-lg border border-lime-200 bg-lime-50 p-2 text-sm text-lime-700">{notice}</p> : null}

        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <select
            className="field-input"
            value={searchBy}
            onChange={(event) => setSearchBy(event.target.value as 'all' | 'name' | 'email' | 'phone')}
          >
            <option value="all">All fields</option>
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </select>
          <input
            className="field-input max-w-md"
            placeholder="Search by selected field"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" className="btn-secondary" disabled={loadingMembers}>
            {loadingMembers ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSearch('');
              void loadMembers();
            }}
            disabled={loadingMembers}
          >
            Reset
          </button>
        </form>

        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
          <table className="table-base">
            <thead>
              <tr className="text-xs uppercase text-slate-500">
                <th className="py-2">Select</th>
                <th className="py-2">Name</th>
                <th className="py-2">Phone</th>
                <th className="py-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId}>
                  <td className="py-2">
                    <input
                      type="radio"
                      name="member-select"
                      checked={selectedUserId === member.userId}
                      onChange={() => {
                        setSelectedUserId(member.userId);
                        setClaimToken('');
                        setNotice(null);
                      }}
                    />
                  </td>
                  <td className="py-2 text-sm font-medium text-slate-900">{member.name}</td>
                  <td className="py-2 text-sm text-slate-600">{member.phone || '-'}</td>
                  <td className="py-2 text-sm text-slate-600">{member.emailMasked}</td>
                </tr>
              ))}
              {!loadingMembers && members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-sm text-slate-500">
                    No matching members found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <form onSubmit={verifyDefaultPassword} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="password"
            className="field-input"
            placeholder="Enter class default password"
            value={defaultPassword}
            onChange={(event) => setDefaultPassword(event.target.value)}
            required
          />
          <button type="submit" className="btn-primary" disabled={busy !== null || !selectedMember}>
            {busy === 'verify' ? 'Verifying...' : 'Verify default password'}
          </button>
        </form>
      </section>

      {claimToken && !complete ? (
        <section className="surface-card space-y-4 p-5">
          <h3 className="text-xl font-semibold text-slate-900">Complete your profile</h3>
          <form onSubmit={completeClaim} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                Title
                <select
                  className="field-input"
                  value={form.title}
                  onChange={(event) => update('title', event.target.value)}
                >
                  {['mr', 'mrs', 'ms', 'chief', 'dr', 'prof'].map((value) => (
                    <option key={value} value={value}>
                      {value.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Phone
                <input
                  required
                  className="field-input"
                  value={form.phone}
                  onChange={(event) => update('phone', event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-600">
                First name
                <input
                  required
                  className="field-input"
                  value={form.firstName}
                  onChange={(event) => update('firstName', event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-600">
                Last name
                <input
                  required
                  className="field-input"
                  value={form.lastName}
                  onChange={(event) => update('lastName', event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-600">
                Middle name (optional)
                <input
                  className="field-input"
                  value={form.middleName}
                  onChange={(event) => update('middleName', event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-600">
                Email
                <input
                  required
                  type="email"
                  className="field-input"
                  value={form.email}
                  onChange={(event) => update('email', event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-600">
                Birth day
                <input
                  required
                  type="number"
                  min="1"
                  max="31"
                  className="field-input"
                  value={form.dobDay}
                  onChange={(event) => update('dobDay', event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-600">
                Birth month
                <input
                  required
                  type="number"
                  min="1"
                  max="12"
                  className="field-input"
                  value={form.dobMonth}
                  onChange={(event) => update('dobMonth', event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-600">
                Birth year (optional)
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  className="field-input"
                  value={form.dobYear}
                  onChange={(event) => update('dobYear', event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-600">
                Branch
                <select
                  className="field-input"
                  value={form.branchId}
                  onChange={(event) => update('branchId', event.target.value)}
                >
                  <option value="">No branch request</option>
                  {options.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                House
                <select
                  className="field-input"
                  value={form.houseId}
                  onChange={(event) => update('houseId', event.target.value)}
                >
                  <option value="">No house selected</option>
                  {options.houses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                New password
                <input
                  required
                  type="password"
                  className="field-input"
                  value={form.password}
                  onChange={(event) => update('password', event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-600">
                Confirm password
                <input
                  required
                  type="password"
                  className="field-input"
                  value={form.confirmPassword}
                  onChange={(event) => update('confirmPassword', event.target.value)}
                />
              </label>
            </div>

            <label className="text-sm text-slate-600">
              Optional note for branch request
              <textarea
                rows={3}
                className="field-input"
                value={form.note}
                onChange={(event) => update('note', event.target.value)}
              />
            </label>

            <button type="submit" className="btn-primary" disabled={busy !== null}>
              {busy === 'save' ? 'Saving...' : 'Complete account claim'}
            </button>
          </form>
        </section>
      ) : null}

      {complete ? (
        <section className="surface-card space-y-3 p-5">
          <h3 className="text-xl font-semibold text-slate-900">Claim complete</h3>
          <p className="text-sm text-slate-600">
            Your profile has been updated. Sign in now using your new email or phone and password.
          </p>
          <div className="flex gap-2">
            <Link href="/login?portal=member" className="btn-primary">
              Member sign in
            </Link>
            <Link href="/login?portal=admin" className="btn-secondary">
              Executive sign in
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
