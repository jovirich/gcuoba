'use client';

import type { BranchDTO, ClassSetDTO, HouseDTO } from '@gcuoba/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fetchAppJson } from '@/lib/api';

type Props = {
  classes: ClassSetDTO[];
  branches: BranchDTO[];
  houses: HouseDTO[];
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
  classId: string;
  branchId: string;
  houseId: string;
  note: string;
  photoUrl: string;
};

export function RegisterForm({ classes, branches, houses }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    title: 'mr',
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    classId: classes[0]?.id ?? '',
    branchId: branches[0]?.id ?? '',
    houseId: houses[0]?.id ?? '',
    note: '',
    photoUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await fetchAppJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          firstName: form.firstName.trim(),
          middleName: form.middleName.trim() || undefined,
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          classId: form.classId,
          branchId: form.branchId,
          houseId: form.houseId,
          note: form.note.trim() || undefined,
          photoUrl: form.photoUrl.trim() || undefined,
        }),
      });
      setStatus('Registration submitted. Redirecting...');
      router.push('/register/pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit registration.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card space-y-6 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Join the Association</h2>
      <p className="text-sm text-slate-500">
        Complete the form below to request membership. Your preferred branch executives will review the
        request and notify you by email once approved.
      </p>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-600">{error}</p>
      )}
      {status && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{status}</p>
      )}

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
          Phone number
          <input
            required
            className="field-input"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            placeholder="+234..."
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
          Email address
          <input
            required
            type="email"
            className="field-input"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          Password
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

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm text-slate-600">
          Entry class
          <select
            className="field-input"
            value={form.classId}
            onChange={(event) => update('classId', event.target.value)}
            required
          >
            {classes.map((classSet) => (
              <option key={classSet.id} value={classSet.id}>
                {classSet.entryYear} - {classSet.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Preferred branch
          <select
            className="field-input"
            value={form.branchId}
            onChange={(event) => update('branchId', event.target.value)}
            required
          >
            {branches.map((branch) => (
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
            required
          >
            {houses.map((house) => (
              <option key={house.id} value={house.id}>
                {house.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="text-sm text-slate-600">
        Branch note (optional)
        <textarea
          className="field-input"
          rows={3}
          value={form.note}
          onChange={(event) => update('note', event.target.value)}
          placeholder="Let the branch know why you're joining."
        />
      </label>

      <label className="text-sm text-slate-600">
        Profile photo URL (optional)
        <input
          className="field-input"
          value={form.photoUrl}
          onChange={(event) => update('photoUrl', event.target.value)}
          placeholder="https://..."
        />
      </label>

      <button
        type="submit"
        className="btn-primary w-full disabled:opacity-50"
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Submit registration'}
      </button>
      <p className="text-center text-sm text-slate-500">
        Already registered?{' '}
        <Link className="text-red-700 underline" href="/login">
          Return to login
        </Link>
      </p>
    </form>
  );
}



