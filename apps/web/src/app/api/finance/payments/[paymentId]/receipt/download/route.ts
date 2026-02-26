import { connectMongo } from '@/lib/server/mongo';
import { getPaymentReceiptFile } from '@/lib/server/finance';
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
    const file = await getPaymentReceiptFile(authUser.sub, paymentId);
    return new Response(file.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
      },
    });
  });
