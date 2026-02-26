import { connectMongo } from '@/lib/server/mongo';
import { getClassLedger } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ classId: string }> };

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { classId } = await context.params;
    const year = new URL(request.url).searchParams.get('year');
    const dto = await getClassLedger(authUser.sub, classId, year ? Number(year) : undefined);
    return Response.json(dto);
  });
