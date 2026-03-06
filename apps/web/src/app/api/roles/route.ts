import type { RoleDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { hasGlobalAccess, managedBranchIds, managedClassIds } from '@/lib/server/authorization';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { RoleModel } from '@/lib/server/models';
import { toRoleDto } from '@/lib/server/dto-mappers';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const global = await hasGlobalAccess(authUser.sub);
    let docs;
    if (global) {
      docs = await RoleModel.find().lean().exec();
    } else {
      const [branchIds, classIds] = await Promise.all([
        managedBranchIds(authUser.sub),
        managedClassIds(authUser.sub),
      ]);
      const scopes: Array<'branch' | 'class'> = [];
      if (branchIds.length > 0) {
        scopes.push('branch');
      }
      if (classIds.length > 0) {
        scopes.push('class');
      }
      if (scopes.length === 0) {
        throw new ApiError(403, 'Not authorized', 'Forbidden');
      }
      docs = await RoleModel.find({ scope: { $in: scopes } }).lean().exec();
    }
    const result: RoleDTO[] = docs.map((doc) => toRoleDto(doc));
    return Response.json(result);
  });

