import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { toClassMembershipDto } from '@/lib/server/dto-mappers';
import { ClassMembershipModel } from '@/lib/server/models';
import { ensureSelfAccess, requireAuthTokenUser } from '@/lib/server/request-auth';
import { assignAlumniNumberForClassMembership } from '@/lib/server/alumni-number';
import { ensureCurrentYearDuesInvoices } from '@/lib/server/finance';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ userId: string }>;
};

type UpdateClassMembershipBody = {
  classId?: string;
};

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { userId } = await context.params;
    const authUser = await requireAuthTokenUser(request);
    ensureSelfAccess(authUser, userId, 'Cannot access memberships for another user');

    const membership = await ClassMembershipModel.findOne({ userId }).exec();
    return Response.json(membership ? toClassMembershipDto(membership) : null);
  });

export const PUT = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { userId } = await context.params;
    const authUser = await requireAuthTokenUser(request);
    ensureSelfAccess(authUser, userId, 'Cannot access memberships for another user');

    const body = (await request.json()) as UpdateClassMembershipBody;
    const classId = body.classId?.trim();
    if (!classId) {
      throw new ApiError(400, 'classId is required', 'BadRequest');
    }

    const membership = await ClassMembershipModel.findOneAndUpdate(
      { userId },
      { userId, classId, joinedAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();

    if (!membership) {
      throw new ApiError(500, 'Unable to update class membership', 'InternalServerError');
    }

    await assignAlumniNumberForClassMembership(userId, classId);
    await ensureCurrentYearDuesInvoices({ userId, scopeType: 'class', scopeId: classId });

    return Response.json(toClassMembershipDto(membership));
  });
