import type { DuesInvoiceDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { listOutstandingInvoices } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ userId: string }> };

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { userId } = await context.params;
    if (authUser.sub !== userId) {
      return Response.json({ statusCode: 403, error: 'Forbidden', message: 'Cannot view invoices for another member' }, { status: 403 });
    }
    const dtos: DuesInvoiceDTO[] = await listOutstandingInvoices(userId);
    return Response.json(dtos);
  });
