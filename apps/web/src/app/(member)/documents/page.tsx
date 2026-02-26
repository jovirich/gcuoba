import type {
  BranchDTO,
  BranchMembershipDTO,
  ClassMembershipDTO,
  ClassSetDTO,
  DocumentRecordDTO,
} from '@gcuoba/types';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { fetchAppJson, fetchJson } from '@/lib/api';
import { DocumentsPanel } from './panel';

export default async function MemberDocumentsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; token?: string; status?: string } | undefined;
  if (!user?.id || !user.token) {
    redirect('/login');
  }
  if (user.status !== 'active') {
    redirect('/profile?pending=1');
  }

  const [documents, memberships, classMembership, branches, classes] = await Promise.all([
    fetchJson<DocumentRecordDTO[]>('/documents/mine', { token: user.token }),
    fetchAppJson<BranchMembershipDTO[]>(`/api/memberships/branches/${user.id}`, { token: user.token }),
    fetchAppJson<ClassMembershipDTO | null>(`/api/memberships/class/${user.id}`, { token: user.token }),
    fetchJson<BranchDTO[]>('/branches', { token: user.token }),
    fetchJson<ClassSetDTO[]>('/classes', { token: user.token }),
  ]);

  return (
    <main className="member-page p-4 md:p-6">
      <header className="member-page-header">
        <p className="member-page-kicker">Documents</p>
        <h1 className="member-page-title">File vault</h1>
        <p className="member-page-subtitle">Upload private or scope documents and manage shared files.</p>
      </header>
      <DocumentsPanel
        authToken={user.token}
        initialDocuments={documents}
        branchMemberships={memberships}
        classMembership={classMembership}
        branches={branches}
        classes={classes}
      />
    </main>
  );
}

