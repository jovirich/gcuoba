import type { BranchDTO, ClassSetDTO, HouseDTO } from '@gcuoba/types';
import { fetchAppJson } from '@/lib/api';
import { RegisterForm } from './register-form';

type RegistrationOptions = {
  classes: ClassSetDTO[];
  branches: BranchDTO[];
  houses: HouseDTO[];
};

async function loadOptions(): Promise<RegistrationOptions> {
  return fetchAppJson<RegistrationOptions>('/api/auth/registration/options');
}

export default async function RegisterPage() {
  let options: RegistrationOptions | null = null;
  let error: string | null = null;
  try {
    options = await loadOptions();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unable to load registration options.';
  }

  return (
    <main className="app-shell min-h-screen py-12">
      <div className="mx-auto max-w-4xl space-y-6 px-4">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-wide text-red-700">Government College Ughelli</p>
          <h1 className="text-4xl font-bold text-slate-900">Become a verified member</h1>
          <p className="text-sm text-slate-500">
            Share your biodata, preferred class, and branch so our executives can activate your account.
          </p>
        </div>
        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-rose-700">{error}</p>
        ) : options ? (
          <RegisterForm classes={options.classes} branches={options.branches} houses={options.houses} />
        ) : (
          <p className="text-center text-sm text-slate-500">Loading registration form...</p>
        )}
      </div>
    </main>
  );
}


