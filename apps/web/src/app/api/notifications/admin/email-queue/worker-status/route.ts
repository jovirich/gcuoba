import type { NotificationEmailWorkerStatusDTO } from '@gcuoba/types';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { connectMongo } from '@/lib/server/mongo';
import { getNotificationEmailWorkerStatus } from '@/lib/server/notifications';
import { withApiHandler } from '@/lib/server/route';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);

    const status: NotificationEmailWorkerStatusDTO = getNotificationEmailWorkerStatus();
    return Response.json(status);
  });

