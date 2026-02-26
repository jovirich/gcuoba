import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { toCountryDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { CountryModel } from '@/lib/server/models';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ id: string }>;
};

type UpdateCountryBody = {
  name?: string;
  isoCode?: string | null;
};

export const PATCH = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);
    const { id } = await context.params;

    const body = (await request.json()) as UpdateCountryBody;
    const payload: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        throw new ApiError(400, 'name cannot be empty', 'BadRequest');
      }
      if (name.length > 120) {
        throw new ApiError(400, 'name must be at most 120 characters', 'BadRequest');
      }
      payload.name = name;
    }

    if (body.isoCode !== undefined) {
      const value = body.isoCode === null ? '' : String(body.isoCode);
      const normalized = value.trim();
      if (normalized && (normalized.length < 2 || normalized.length > 3)) {
        throw new ApiError(400, 'isoCode must be 2 to 3 characters', 'BadRequest');
      }
      payload.isoCode = normalized ? normalized.toUpperCase() : null;
    }

    const doc = await CountryModel.findByIdAndUpdate(id, { $set: payload }, { new: true }).exec();
    if (!doc) {
      throw new ApiError(404, 'Country not found', 'NotFound');
    }
    return Response.json(toCountryDto(doc));
  });

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);
    const { id } = await context.params;

    await CountryModel.findByIdAndDelete(id).exec();
    return Response.json({ success: true });
  });

