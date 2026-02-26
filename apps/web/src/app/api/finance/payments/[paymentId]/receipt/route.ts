import { connectMongo } from '@/lib/server/mongo';
import { getPaymentReceipt } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ paymentId: string }> };

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { paymentId } = await context.params;
    const dto = await getPaymentReceipt(authUser.sub, paymentId);
    return Response.json(dto);
  });
