import { recordBranchExecutiveHandover } from '@/lib/server/branch-executive';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ userId: string }>;
};

type RecordHandoverBody = {
  branchId?: string;
  roleId?: string;
  userId?: string;
  startDate?: string;
};

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { userId } = await context.params;
    const body = (await request.json()) as RecordHandoverBody;

    await recordBranchExecutiveHandover(authUser.sub, userId, body);
    return Response.json({ success: true });
  });

