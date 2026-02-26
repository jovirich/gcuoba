import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { listReportSnapshots } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

function parseScopeType(raw: string | null): 'global' | 'branch' | 'class' | undefined {
  if (!raw) return undefined;
  if (raw === 'global' || raw === 'branch' || raw === 'class') return raw;
  throw new ApiError(400, 'Invalid scopeType', 'BadRequest');
}

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    const dtos = await listReportSnapshots(authUser.sub, {
      scopeType: parseScopeType(url.searchParams.get('scopeType')),
      scopeId: url.searchParams.get('scopeId') ?? undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return Response.json(dtos);
  });
