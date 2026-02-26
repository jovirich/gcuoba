import { connectMongo } from '@/lib/server/mongo';
import { markAllNotificationsRead } from '@/lib/server/notifications';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const result = await markAllNotificationsRead(authUser.sub);
    return Response.json(result);
  });

