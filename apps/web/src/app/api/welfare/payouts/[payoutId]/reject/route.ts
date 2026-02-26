import type { WelfarePayoutDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { rejectWelfarePayout } from '@/lib/server/welfare';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ payoutId: string }>;
};

type Body = {
  note?: string;
};

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { payoutId } = await context.params;
    const body = (await request.json()) as Body;

    const updated: WelfarePayoutDTO = await rejectWelfarePayout(authUser.sub, payoutId, body.note);
    return Response.json(updated);
  });

