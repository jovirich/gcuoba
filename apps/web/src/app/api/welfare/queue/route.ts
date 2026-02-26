import type { WelfareQueueItemDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { listWelfareQueue } from '@/lib/server/welfare';

export const runtime = 'nodejs';

function parseScopeType(raw: string | null): 'global' | 'branch' | 'class' | undefined {
  if (!raw) {
    return undefined;
  }
  if (raw === 'global' || raw === 'branch' || raw === 'class') {
    return raw;
  }
  throw new ApiError(400, 'Invalid scopeType', 'BadRequest');
}

function parseQueueStatus(raw: string | null): 'pending' | 'approved' | 'rejected' {
  if (!raw) {
    return 'pending';
  }
  if (raw === 'pending' || raw === 'approved' || raw === 'rejected') {
    return raw;
  }
  throw new ApiError(400, 'Invalid queue status', 'BadRequest');
}

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const items: WelfareQueueItemDTO[] = await listWelfareQueue(
      authUser.sub,
      parseScopeType(url.searchParams.get('scopeType')),
      url.searchParams.get('scopeId')?.trim() || undefined,
      parseQueueStatus(url.searchParams.get('status')),
    );
    return Response.json(items);
  });

