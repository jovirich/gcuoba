import type { RoleFeatureDTO } from '@gcuoba/types';
import { Types } from 'mongoose';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { RoleFeatureModel } from '@/lib/server/models';
import { toRoleFeatureDto } from '@/lib/server/dto-mappers';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ roleId: string }>;
};

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    await requireGlobalWriteAccess(authUser);
    const { roleId } = await context.params;

    if (!Types.ObjectId.isValid(roleId)) {
      return Response.json([] satisfies RoleFeatureDTO[]);
    }

    const docs = await RoleFeatureModel.find({
      roleId: new Types.ObjectId(roleId),
    })
      .sort({ moduleKey: 1 })
      .lean()
      .exec();

    const result: RoleFeatureDTO[] = docs.map((doc) => toRoleFeatureDto(doc));
    return Response.json(result);
  });

