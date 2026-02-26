import type { NotificationDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { markNotificationRead } from '@/lib/server/notifications';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ notificationId: string }>;
};

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { notificationId } = await context.params;

    const updated: NotificationDTO = await markNotificationRead(authUser.sub, notificationId);
    return Response.json(updated);
  });

