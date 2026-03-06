import type {
  BranchDTO,
  BranchMembershipDTO,
  ClassMembershipDTO,
  ClassSetDTO,
  HouseDTO,
  ProfileDTO,
} from '@gcuoba/types';
import { fetchAppJson, fetchJson } from '@/lib/api';
import { authOptions } from '@/lib/auth-options';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { ProfileForm } from './profile-form';

async function loadProfileData(userId: string, token: string) {
  const [profile, classes, memberships, branches, classMembership, houses] = await Promise.all([
    fetchAppJson<ProfileDTO | null>(`/api/profiles/${userId}`, { token }),
    fetchJson<ClassSetDTO[]>(`/classes`, { token }),
    fetchAppJson<BranchMembershipDTO[]>(`/api/memberships/branches/${userId}`, { token }),
    fetchJson<BranchDTO[]>(`/branches`, { token }),
    fetchAppJson<ClassMembershipDTO | null>(`/api/memberships/class/${userId}`, { token }),
    fetchJson<HouseDTO[]>(`/houses`, { token }),
  ]);

  return { profile, classes, memberships, branches, classMembership, houses };
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; name?: string; status?: string; token?: string } | undefined;
  const userId = sessionUser?.id;
  const token = sessionUser?.token;
  const userName = sessionUser?.name ?? 'Member';

  if (!userId || !token) {
    redirect('/login');
  }

  const data = await loadProfileData(userId, token);

  return (
    <main className="member-page p-4 md:p-6">
      <header className="member-page-header">
        <p className="member-page-kicker">Member profile</p>
        <h1 className="member-page-title">Profile settings</h1>
        <p className="member-page-subtitle">Maintain biodata, branch memberships, and class preferences.</p>
      </header>

      <ProfileForm
        userId={userId}
        userName={userName}
        authToken={token}
        isActive={sessionUser?.status === 'active'}
        profile={data.profile}
        classes={data.classes}
        branches={data.branches}
        branchMemberships={data.memberships}
        classMembership={data.classMembership}
        houses={data.houses}
      />
    </main>
  );
}

