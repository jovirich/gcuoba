import type { NotificationEmailJobDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { connectMongo } from '@/lib/server/mongo';
import { listNotificationEmailJobs } from '@/lib/server/notifications';
import { withApiHandler } from '@/lib/server/route';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

function parseStatus(raw: string | null): 'pending' | 'sent' | 'failed' | undefined {
  if (!raw) {
    return undefined;
  }
  if (raw === 'pending' || raw === 'sent' || raw === 'failed') {
    return raw;
  }
  throw new ApiError(400, 'Invalid status', 'BadRequest');
}

export const GET = (request: Request) =>
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
    const status = parseStatus(url.searchParams.get('status'));

    const jobs: NotificationEmailJobDTO[] = await listNotificationEmailJobs(parsedLimit, status);
    return Response.json(jobs);
  });

