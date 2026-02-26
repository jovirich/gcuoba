import type { WelfareCaseDetailDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { getWelfareCaseDetail } from '@/lib/server/welfare';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ caseId: string }>;
};

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { caseId } = await context.params;

    const detail: WelfareCaseDetailDTO = await getWelfareCaseDetail(authUser.sub, caseId);
    return Response.json(detail);
  });

