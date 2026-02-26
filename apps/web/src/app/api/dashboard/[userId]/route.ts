import type { DashboardSummaryDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { buildDashboardSummary } from '@/lib/server/dashboard';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ userId: string }>;
};

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { userId } = await context.params;

    if (authUser.sub !== userId) {
      throw new ApiError(403, 'Cannot access another member dashboard', 'Forbidden');
    }

    const summary: DashboardSummaryDTO = await buildDashboardSummary(userId);
    return Response.json(summary);
  });

