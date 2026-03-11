import type {
  BranchDTO,
  BranchMembershipDTO,
  ClassMembershipDTO,
  ClassSetDTO,
  CountryDTO,
  HouseDTO,
  ProfileDTO,
} from '@gcuoba/types';
import { fetchAppJson, fetchJson } from '@/lib/api';
import { authOptions } from '@/lib/auth-options';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { ProfileForm } from './profile-form';

async function loadProfileData(userId: string, token: string) {
  const [profile, classes, memberships, branches, classMembership, houses, countries] = await Promise.all([
    fetchAppJson<ProfileDTO | null>(`/api/profiles/${userId}`, { token }),
    fetchJson<ClassSetDTO[]>(`/classes`, { token }),
    fetchAppJson<BranchMembershipDTO[]>(`/api/memberships/branches/${userId}`, { token }),
    fetchJson<BranchDTO[]>(`/branches`, { token }),
    fetchAppJson<ClassMembershipDTO | null>(`/api/memberships/class/${userId}`, { token }),
    fetchJson<HouseDTO[]>(`/houses`, { token }),
    fetchJson<CountryDTO[]>(`/countries`, { token }),
  ]);

  return { profile, classes, memberships, branches, classMembership, houses, countries };
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as {
    id?: string;
    name?: string;
    email?: string;
    phone?: string | null;
    alumniNumber?: string | null;
    status?: 'pending' | 'active' | 'suspended';
    token?: string;
  } | undefined;
  const userId = sessionUser?.id;
  const token = sessionUser?.token;
  const userName = sessionUser?.name ?? 'Member';
  const userEmail = sessionUser?.email ?? '';
  const userPhone = sessionUser?.phone ?? null;
  const userStatus = sessionUser?.status ?? 'pending';
  const userAlumniNumber = sessionUser?.alumniNumber ?? null;

  if (!userId || !token) {
    redirect('/login');
  }

  const data = await loadProfileData(userId, token);
  const isClassApprovedForSelfService = userStatus !== 'pending' && Boolean(data.classMembership?.classId);

  return (
    <main className="member-page p-4 md:p-6">
      <header className="member-page-header">
        <p className="member-page-kicker">Member profile</p>
        <h1 className="member-page-title">Profile settings</h1>
        <p className="member-page-subtitle">Maintain your full biodata, residence, privacy settings, and branch memberships.</p>
      </header>

      <ProfileForm
        userId={userId}
        userName={userName}
        userEmail={userEmail}
        userPhone={userPhone}
        userStatus={userStatus}
        userAlumniNumber={userAlumniNumber}
        authToken={token}
        isActive={sessionUser?.status === 'active'}
        isClassApprovedForSelfService={isClassApprovedForSelfService}
        profile={data.profile}
        classes={data.classes}
        branches={data.branches}
        branchMemberships={data.memberships}
        classMembership={data.classMembership}
        houses={data.houses}
        countries={data.countries}
      />
    </main>
  );
}

