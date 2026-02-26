import type { RoleFeatureDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireAuthTokenUser } from '@/lib/server/request-auth';
import { RoleFeatureModel } from '@/lib/server/models';
import { toRoleFeatureDto } from '@/lib/server/dto-mappers';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    await requireAuthTokenUser(request);

    const docs = await RoleFeatureModel.find().lean().exec();
    const result: RoleFeatureDTO[] = docs.map((doc) => toRoleFeatureDto(doc));
    return Response.json(result);
  });

