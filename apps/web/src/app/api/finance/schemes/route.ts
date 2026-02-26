import type { DuesSchemeDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { createScheme, listSchemes } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

function parseScopeType(raw: unknown): 'global' | 'branch' | 'class' | undefined {
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
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
    const status = url.searchParams.get('status');
    const activeOnly = status !== 'all';

    const dtos = await listSchemes(authUser.sub, activeOnly);
    return Response.json(dtos);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const body = (await request.json()) as Partial<DuesSchemeDTO>;
    const dto = await createScheme(authUser.sub, {
      ...body,
      scopeType: parseScopeType(body.scopeType),
    });
    return Response.json(dto, { status: 201 });
  });
