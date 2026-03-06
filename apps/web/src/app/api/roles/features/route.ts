import type { RoleFeatureDTO } from '@gcuoba/types';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { RoleFeatureModel } from '@/lib/server/models';
import { toRoleFeatureDto } from '@/lib/server/dto-mappers';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    await requireGlobalWriteAccess(authUser);

    const docs = await RoleFeatureModel.find().lean().exec();
    const result: RoleFeatureDTO[] = docs.map((doc) => toRoleFeatureDto(doc));
    return Response.json(result);
  });

