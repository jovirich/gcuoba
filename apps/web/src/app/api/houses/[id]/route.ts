import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { toHouseDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { HouseModel } from '@/lib/server/models';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ id: string }>;
};

type UpdateHouseBody = {
  name?: string;
  motto?: string;
};

export const PATCH = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);
    const { id } = await context.params;

    const body = (await request.json()) as UpdateHouseBody;
    const payload: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        throw new ApiError(400, 'name cannot be empty', 'BadRequest');
      }
      if (name.length > 190) {
        throw new ApiError(400, 'name must be at most 190 characters', 'BadRequest');
      }
      payload.name = name;
    }

    if (body.motto !== undefined) {
      const motto = body.motto.trim();
      if (motto.length > 255) {
        throw new ApiError(400, 'motto must be at most 255 characters', 'BadRequest');
      }
      payload.motto = motto || null;
    }

    const doc = await HouseModel.findByIdAndUpdate(id, { $set: payload }, { new: true }).exec();
    if (!doc) {
      throw new ApiError(404, 'House not found', 'NotFound');
    }
    return Response.json(toHouseDto(doc));
  });

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);
    const { id } = await context.params;

    await HouseModel.findByIdAndDelete(id).exec();
    return Response.json({ success: true });
  });

