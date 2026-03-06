import type { AuditLogDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { type AuditScopeType, listAuditLogsForActor } from '@/lib/server/audit-logs';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

function parseScopeType(raw: string | null): AuditScopeType | undefined {
  if (!raw) {
    return undefined;
  }
  if (raw === 'global' || raw === 'branch' || raw === 'class' || raw === 'private') {
    return raw;
  }
  throw new ApiError(400, 'Invalid scopeType', 'BadRequest');
}

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    await requireGlobalWriteAccess(authUser);

    const url = new URL(request.url);
    const rawLimit = url.searchParams.get('limit');
    const parsedLimit = rawLimit ? Number(rawLimit) : undefined;
    if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
      throw new ApiError(400, 'Invalid limit', 'BadRequest');
    }

    const logs: AuditLogDTO[] = await listAuditLogsForActor(authUser.sub, {
      actorUserId: url.searchParams.get('actorUserId')?.trim() || undefined,
      action: url.searchParams.get('action')?.trim() || undefined,
      scopeType: parseScopeType(url.searchParams.get('scopeType')),
      scopeId: url.searchParams.get('scopeId')?.trim() || undefined,
      limit: parsedLimit,
    });

    return Response.json(logs);
  });

