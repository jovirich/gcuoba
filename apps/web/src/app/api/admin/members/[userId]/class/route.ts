import type { ClassMembershipDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { changeAdminMemberClass, rejectAdminMemberClass, resolveAdminMemberAccessScope } from '@/lib/server/admin-members';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ userId: string }>;
};

type UpdateClassBody = {
  classId?: string;
};

export const PUT = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { userId } = await context.params;

    const url = new URL(request.url);
    const scope = await resolveAdminMemberAccessScope(
      authUser,
      url.searchParams.get('scopeType'),
      url.searchParams.get('scopeId'),
    );

    const body = (await request.json()) as UpdateClassBody;
    const classId = body.classId?.trim();
    if (!classId) {
      throw new ApiError(400, 'classId is required', 'BadRequest');
    }

    const updated: ClassMembershipDTO = await changeAdminMemberClass(userId, classId, scope);
    return Response.json(updated);
  });

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { userId } = await context.params;

    const url = new URL(request.url);
    const scope = await resolveAdminMemberAccessScope(
      authUser,
      url.searchParams.get('scopeType'),
      url.searchParams.get('scopeId'),
    );

    const result = await rejectAdminMemberClass(userId, scope);
    return Response.json(result);
  });

