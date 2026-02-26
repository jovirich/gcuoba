import type { DocumentRecordDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { listScopeDocuments } from '@/lib/server/documents';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

function parseScopeType(raw: string | null): 'global' | 'branch' | 'class' {
  if (!raw) {
    throw new ApiError(400, 'scopeType is required', 'BadRequest');
  }
  if (raw === 'global' || raw === 'branch' || raw === 'class') {
    return raw;
  }
  throw new ApiError(400, 'Invalid scopeType', 'BadRequest');
}

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const scopeType = parseScopeType(url.searchParams.get('scopeType'));
    const scopeId = url.searchParams.get('scopeId')?.trim() || undefined;

    const docs: DocumentRecordDTO[] = await listScopeDocuments(authUser.sub, scopeType, scopeId);
    return Response.json(docs);
  });

