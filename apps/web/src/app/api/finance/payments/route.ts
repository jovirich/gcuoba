import type { PaymentDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { listPayments, recordPayment } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type RecordPaymentBody = {
  invoiceId?: string;
  amount?: number;
  channel?: string;
  reference?: string;
  notes?: string;
};

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const dtos: PaymentDTO[] = await listPayments(authUser.sub);
    return Response.json(dtos);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const body = (await request.json()) as RecordPaymentBody;
    const dto = await recordPayment(authUser.sub, body);
    return Response.json(dto, { status: 201 });
  });
