import type { BranchMembershipDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import {
  addAdminMemberBranchMembership,
  endAdminMemberBranchMembership,
  resolveAdminMemberAccessScope,
} from '@/lib/server/admin-members';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ userId: string }>;
};

type UpdateBranchBody = {
  branchId?: string;
  note?: string | null;
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

    const body = (await request.json()) as UpdateBranchBody;
    const branchId = body.branchId?.trim();
    if (!branchId) {
      throw new ApiError(400, 'branchId is required', 'BadRequest');
    }

    const updated: BranchMembershipDTO = await addAdminMemberBranchMembership(
      authUser.sub,
      userId,
      branchId,
      scope,
      body.note ?? null,
    );
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

    const body = (await request.json()) as UpdateBranchBody;
    const branchId = body.branchId?.trim();
    if (!branchId) {
      throw new ApiError(400, 'branchId is required', 'BadRequest');
    }

    const updated: BranchMembershipDTO = await endAdminMemberBranchMembership(
      userId,
      branchId,
      scope,
    );
    return Response.json(updated);
  });
