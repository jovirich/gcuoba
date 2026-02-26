import { connectMongo } from '@/lib/server/mongo';
import { getMemberLedger } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ memberId: string }> };

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { memberId } = await context.params;
    const dto = await getMemberLedger(authUser.sub, memberId);
    return Response.json(dto);
  });
