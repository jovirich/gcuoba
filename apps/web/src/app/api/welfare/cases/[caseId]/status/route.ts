import type { WelfareCaseDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { updateWelfareCaseStatus } from '@/lib/server/welfare';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ caseId: string }>;
};

type Body = {
  status?: 'open' | 'closed';
};

export const PATCH = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { caseId } = await context.params;
    const body = (await request.json()) as Body;

    if (body.status !== 'open' && body.status !== 'closed') {
      throw new ApiError(400, 'Invalid status', 'BadRequest');
    }
    const updated: WelfareCaseDTO = await updateWelfareCaseStatus(authUser.sub, caseId, body.status);
    return Response.json(updated);
  });

