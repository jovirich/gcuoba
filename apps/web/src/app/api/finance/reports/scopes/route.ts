import { connectMongo } from '@/lib/server/mongo';
import { getReportScopeAccess } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const dto = await getReportScopeAccess(authUser.sub);
    return Response.json(dto);
  });
