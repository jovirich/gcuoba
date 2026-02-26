import type { HouseDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { toHouseDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { HouseModel } from '@/lib/server/models';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type CreateHouseBody = {
  name?: string;
  motto?: string;
};

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    await requireAuthTokenUser(request);

    const docs = await HouseModel.find().sort({ name: 1 }).exec();
    const result: HouseDTO[] = docs.map((doc) => toHouseDto(doc));
    return Response.json(result);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);

    const body = (await request.json()) as CreateHouseBody;
    const name = body.name?.trim();
    if (!name) {
      throw new ApiError(400, 'name is required', 'BadRequest');
    }
    if (name.length > 190) {
      throw new ApiError(400, 'name must be at most 190 characters', 'BadRequest');
    }

    const motto = body.motto?.trim();
    if (motto && motto.length > 255) {
      throw new ApiError(400, 'motto must be at most 255 characters', 'BadRequest');
    }

    const doc = await HouseModel.create({
      name,
      motto: motto || null,
    });

    return Response.json(toHouseDto(doc), { status: 201 });
  });

