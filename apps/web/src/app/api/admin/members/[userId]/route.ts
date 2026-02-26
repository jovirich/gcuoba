import { connectMongo } from '@/lib/server/mongo';
import { findAdminMember, resolveAdminMemberAccessScope } from '@/lib/server/admin-members';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ userId: string }>;
};

export const GET = (request: Request, context: Context) =>
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

    const member = await findAdminMember(userId, scope);
    return Response.json(member);
  });

