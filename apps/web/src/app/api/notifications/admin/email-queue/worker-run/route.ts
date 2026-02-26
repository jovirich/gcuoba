import type { NotificationEmailQueueProcessResultDTO } from '@gcuoba/types';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { connectMongo } from '@/lib/server/mongo';
import { runNotificationEmailWorkerOnce } from '@/lib/server/notifications';
import { withApiHandler } from '@/lib/server/route';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);

    const result: NotificationEmailQueueProcessResultDTO = await runNotificationEmailWorkerOnce();
    return Response.json(result);
  });

