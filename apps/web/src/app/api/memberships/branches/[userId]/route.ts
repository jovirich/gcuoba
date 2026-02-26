import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { toBranchMembershipDto } from '@/lib/server/dto-mappers';
import { BranchMembershipModel } from '@/lib/server/models';
import {
  ensureSelfAccess,
  requireActiveAccount,
  requireAuthTokenUser,
} from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ userId: string }>;
};

type RequestMembershipBody = {
  branchId?: string;
  note?: string;
};

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { userId } = await context.params;
    const authUser = await requireAuthTokenUser(request);
    ensureSelfAccess(authUser, userId, 'Cannot access memberships for another user');

    const memberships = await BranchMembershipModel.find({ userId }).sort({ requestedAt: -1 }).exec();
    return Response.json(memberships.map((entry) => toBranchMembershipDto(entry)));
  });

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { userId } = await context.params;
    const authUser = await requireAuthTokenUser(request);
    ensureSelfAccess(authUser, userId, 'Cannot access memberships for another user');
    requireActiveAccount(authUser);

    const body = (await request.json()) as RequestMembershipBody;
    const branchId = body.branchId?.trim();
    if (!branchId) {
      throw new ApiError(400, 'branchId is required', 'BadRequest');
    }

    const membership = await BranchMembershipModel.findOneAndUpdate(
      { userId, branchId },
      {
        userId,
        branchId,
        status: 'requested',
        requestedAt: new Date(),
        approvedAt: null,
        approvedBy: null,
        endedAt: null,
        note: body.note?.trim() || null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();

    if (!membership) {
      throw new ApiError(500, 'Unable to create branch membership request', 'InternalServerError');
    }

    return Response.json(toBranchMembershipDto(membership));
  });
