import type { UserDTO } from '@gcuoba/types';
import { listAdminMembers, resolveAdminMemberAccessScope } from '@/lib/server/admin-members';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
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
    const members = await listAdminMembers(scope);
    const result: UserDTO[] = members.map((member) => member.user);
    return Response.json(result);
  });

