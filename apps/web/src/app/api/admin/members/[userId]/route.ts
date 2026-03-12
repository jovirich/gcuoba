import { connectMongo } from '@/lib/server/mongo';
import {
  deleteAdminMember,
  findAdminMember,
  resolveAdminMemberAccessScope,
  updateAdminMemberProfile,
} from '@/lib/server/admin-members';
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

    const member = await findAdminMember(userId, scope, { excludeSystemAccounts: true });
    return Response.json(member);
  });

type UpdateBody = {
  title?: string | null;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  email?: string;
  phone?: string | null;
  claimStatus?: 'unclaimed' | 'claimed' | null;
  dobDay?: number | string | null;
  dobMonth?: number | string | null;
  dobYear?: number | string | null;
  sex?: string | null;
  stateOfOrigin?: string | null;
  lgaOfOrigin?: string | null;
  occupation?: string | null;
  houseId?: string | null;
  privacyLevel?: 'public' | 'public_to_members' | 'private' | null;
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

    const body = (await request.json().catch(() => ({}))) as UpdateBody;
    const member = await updateAdminMemberProfile(userId, scope, body, {
      excludeSystemAccounts: true,
    });
    return Response.json(member);
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

    const result = await deleteAdminMember(userId, scope, {
      excludeSystemAccounts: true,
    });
    return Response.json(result);
  });

