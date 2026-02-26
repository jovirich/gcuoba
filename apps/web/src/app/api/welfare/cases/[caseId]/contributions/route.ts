import type { WelfareContributionDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { recordWelfareContribution } from '@/lib/server/welfare';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ caseId: string }>;
};

type Body = {
  contributorUserId?: string;
  contributorName?: string;
  contributorEmail?: string;
  amount?: number;
  currency?: string;
  notes?: string;
};

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { caseId } = await context.params;
    const body = (await request.json()) as Body;

    const created: WelfareContributionDTO = await recordWelfareContribution(authUser.sub, caseId, body);
    return Response.json(created, { status: 201 });
  });

