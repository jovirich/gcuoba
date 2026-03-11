import { notFound } from 'next/navigation';
import { ClassClaimForm } from '../../c92/claim-form';

type Props = {
  params: Promise<{ classYear: string }>;
};

function parseClassYear(raw: string) {
  const year = Number(raw);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return null;
  }
  return year;
}

export default async function ClassClaimPage({ params }: Props) {
  const { classYear: rawClassYear } = await params;
  const classYear = parseClassYear(rawClassYear);
  if (!classYear) {
    notFound();
  }

  return (
    <main className="app-shell min-h-screen py-12">
      <div className="mx-auto max-w-5xl space-y-6 px-4">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-wide text-red-700">Government College Ughelli Old Boys Association</p>
          <h1 className="text-4xl font-bold text-slate-900">Class {classYear} Account Claim</h1>
          <p className="text-sm text-slate-500">
            Use this onboarding link to claim your existing member account and update your real contact details.
          </p>
        </div>
        <ClassClaimForm classYear={classYear} />
      </div>
    </main>
  );
}

