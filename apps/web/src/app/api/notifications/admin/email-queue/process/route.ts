import type { NotificationEmailQueueProcessResultDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { connectMongo } from '@/lib/server/mongo';
import { processNotificationEmailQueue } from '@/lib/server/notifications';
import { withApiHandler } from '@/lib/server/route';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);

    const url = new URL(request.url);
    const rawLimit = url.searchParams.get('limit');
    const parsedLimit = rawLimit ? Number(rawLimit) : undefined;
    if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
      throw new ApiError(400, 'Invalid limit', 'BadRequest');
    }

    const result: NotificationEmailQueueProcessResultDTO = await processNotificationEmailQueue(parsedLimit);
    return Response.json(result);
  });

