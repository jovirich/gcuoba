import { Types } from 'mongoose';
import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { toRoleFeatureDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { ROLE_FEATURE_MODULES } from '@/lib/server/role-features';
import { withApiHandler } from '@/lib/server/route';
import { RoleFeatureModel, RoleModel } from '@/lib/server/models';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ roleId: string; moduleKey: string }>;
};

type UpsertRoleFeatureBody = {
  allowed?: boolean;
};

export const PUT = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    await requireGlobalWriteAccess(authUser);
    const { roleId, moduleKey } = await context.params;

    if (!Types.ObjectId.isValid(roleId)) {
      throw new ApiError(404, 'Role not found', 'NotFound');
    }
    if (!ROLE_FEATURE_MODULES[moduleKey]) {
      throw new ApiError(400, 'Unknown module key', 'BadRequest');
    }

    const body = (await request.json()) as UpsertRoleFeatureBody;
    if (typeof body.allowed !== 'boolean') {
      throw new ApiError(400, 'allowed must be a boolean', 'BadRequest');
    }

    const roleExists = await RoleModel.exists({ _id: roleId });
    if (!roleExists) {
      throw new ApiError(404, 'Role not found', 'NotFound');
    }

    const doc = await RoleFeatureModel.findOneAndUpdate(
      {
        roleId: new Types.ObjectId(roleId),
        moduleKey,
      },
      {
        roleId: new Types.ObjectId(roleId),
        moduleKey,
        allowed: body.allowed,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();

    return Response.json(toRoleFeatureDto(doc));
  });

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    await requireGlobalWriteAccess(authUser);
    const { roleId, moduleKey } = await context.params;

    if (Types.ObjectId.isValid(roleId)) {
      await RoleFeatureModel.findOneAndDelete({
        roleId: new Types.ObjectId(roleId),
        moduleKey,
      }).exec();
    }
    return Response.json({ success: true });
  });

