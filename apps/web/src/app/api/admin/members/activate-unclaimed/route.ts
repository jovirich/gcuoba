import { ApiError } from '@/lib/server/api-error';
import {
  activatePendingClassMembersAsUnclaimed,
  resolveAdminMemberAccessScope,
} from '@/lib/server/admin-members';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Body = {
  classId?: string;
};

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const scope = await resolveAdminMemberAccessScope(
      authUser,
      url.searchParams.get('scopeType'),
      url.searchParams.get('scopeId'),
    );

    const body = (await request.json().catch(() => ({}))) as Body;
    const classId = body.classId?.trim() || undefined;
    if ((scope.kind === 'global' || scope.kind === 'managed') && !classId) {
      throw new ApiError(400, 'classId is required in this scope.', 'BadRequest');
    }

    const result = await activatePendingClassMembersAsUnclaimed(scope, classId);
    return Response.json(result);
  });
