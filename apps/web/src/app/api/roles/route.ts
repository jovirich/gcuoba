import type { RoleDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireAuthTokenUser } from '@/lib/server/request-auth';
import { RoleModel } from '@/lib/server/models';
import { toRoleDto } from '@/lib/server/dto-mappers';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    await requireAuthTokenUser(request);

    const docs = await RoleModel.find().lean().exec();
    const result: RoleDTO[] = docs.map((doc) => toRoleDto(doc));
    return Response.json(result);
  });

