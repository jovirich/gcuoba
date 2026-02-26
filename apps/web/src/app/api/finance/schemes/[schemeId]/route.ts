import type { DuesSchemeDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { deleteScheme, updateScheme } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ schemeId: string }> };

function parseScopeType(raw: unknown): 'global' | 'branch' | 'class' | undefined {
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  if (raw === 'global' || raw === 'branch' || raw === 'class') {
    return raw;
  }
  throw new ApiError(400, 'Invalid scopeType', 'BadRequest');
}

export const PATCH = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { schemeId } = await context.params;
    const body = (await request.json()) as Partial<DuesSchemeDTO>;
    const dto = await updateScheme(authUser.sub, schemeId, {
      ...body,
      scopeType: parseScopeType(body.scopeType),
    });
    return Response.json(dto);
  });

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { schemeId } = await context.params;
    await deleteScheme(authUser.sub, schemeId);
    return Response.json({ success: true });
  });
