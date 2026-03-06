import type { WelfarePayoutDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { recordWelfarePayout } from '@/lib/server/welfare';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ caseId: string }>;
};

type Body = {
  amount?: number;
  currency?: string;
  channel?: string;
  reference?: string;
  notes?: string;
  retainerMode?: 'none' | 'percentage' | 'fixed';
  retainerPercentage?: number;
  retainerAmount?: number;
  deductions?: Array<{
    type?: 'standard_percentage' | 'dues_invoice' | 'liability' | 'custom';
    label?: string;
    amount?: number;
    percentage?: number;
    invoiceId?: string;
  }>;
};

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { caseId } = await context.params;
    const body = (await request.json()) as Body;

    const created: WelfarePayoutDTO = await recordWelfarePayout(authUser.sub, caseId, body);
    return Response.json(created, { status: 201 });
  });

