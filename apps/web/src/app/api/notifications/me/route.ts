import type { NotificationDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { listNotificationsForUser } from '@/lib/server/notifications';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const rawLimit = url.searchParams.get('limit');
    const parsedLimit = rawLimit ? Number(rawLimit) : undefined;
    if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
      throw new ApiError(400, 'Invalid limit', 'BadRequest');
    }

    const notifications: NotificationDTO[] = await listNotificationsForUser(
      authUser.sub,
      unreadOnly,
      parsedLimit,
    );
    return Response.json(notifications);
  });

