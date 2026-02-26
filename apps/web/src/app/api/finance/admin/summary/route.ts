import type { FinanceAdminSummaryDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { getAdminSummary } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const dto: FinanceAdminSummaryDTO = await getAdminSummary(authUser.sub);
    return Response.json(dto);
  });
