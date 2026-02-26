import { connectMongo } from '@/lib/server/mongo';
import { captureMonthlySnapshots } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Body = { year?: number; month?: number };

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const body = (await request.json()) as Body;
    const dto = await captureMonthlySnapshots(authUser.sub, body.year, body.month);
    return Response.json(dto);
  });
