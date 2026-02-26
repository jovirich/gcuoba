import type { MemberStatus, UserDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import {
  resolveAdminMemberAccessScope,
  updateAdminMemberStatus,
} from '@/lib/server/admin-members';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ userId: string }>;
};

type UpdateStatusBody = {
  status?: MemberStatus;
};

function isMemberStatus(value: string | undefined): value is MemberStatus {
  return value === 'pending' || value === 'active' || value === 'suspended';
}

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

    const body = (await request.json()) as UpdateStatusBody;
    if (!isMemberStatus(body.status)) {
      throw new ApiError(400, 'status must be pending, active, or suspended', 'BadRequest');
    }

    const updated: UserDTO = await updateAdminMemberStatus(userId, body.status, scope);
    return Response.json(updated);
  });

