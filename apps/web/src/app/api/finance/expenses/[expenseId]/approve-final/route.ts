import { connectMongo } from '@/lib/server/mongo';
import { approveExpenseFinal } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ expenseId: string }> };

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { expenseId } = await context.params;
    const dto = await approveExpenseFinal(authUser.sub, expenseId);
    return Response.json(dto);
  });
