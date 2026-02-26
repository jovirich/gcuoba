import type { ExpenseDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { deleteExpense, updateExpense } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ expenseId: string }> };

export const PATCH = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { expenseId } = await context.params;
    const body = (await request.json()) as Partial<ExpenseDTO>;
    const dto = await updateExpense(authUser.sub, expenseId, body);
    return Response.json(dto);
  });

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { expenseId } = await context.params;
    await deleteExpense(authUser.sub, expenseId);
    return Response.json({ success: true });
  });
