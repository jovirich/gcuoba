import type { NotificationEmailQueueStatsDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { connectMongo } from '@/lib/server/mongo';
import { getNotificationEmailQueueStats } from '@/lib/server/notifications';
import { withApiHandler } from '@/lib/server/route';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    if (!authUser) {
      throw new ApiError(403, 'Not authorized', 'Forbidden');
    }
    await requireGlobalWriteAccess(authUser);

    const stats: NotificationEmailQueueStatsDTO = await getNotificationEmailQueueStats();
    return Response.json(stats);
  });

