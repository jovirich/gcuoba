import type { DuesInvoiceDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { createInvoice } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type CreateInvoiceBody = {
  schemeId?: string;
  userId?: string;
  amount?: number;
  currency?: string;
};

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const body = (await request.json()) as CreateInvoiceBody;
    const dto: DuesInvoiceDTO = await createInvoice(authUser.sub, body);
    return Response.json(dto, { status: 201 });
  });
