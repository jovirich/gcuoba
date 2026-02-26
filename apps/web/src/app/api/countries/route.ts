import type { CountryDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { toCountryDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { CountryModel } from '@/lib/server/models';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type CreateCountryBody = {
  name?: string;
  isoCode?: string;
};

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    await requireAuthTokenUser(request);

    const docs = await CountryModel.find().sort({ name: 1 }).exec();
    const result: CountryDTO[] = docs.map((doc) => toCountryDto(doc));
    return Response.json(result);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);

    const body = (await request.json()) as CreateCountryBody;
    const name = body.name?.trim();
    if (!name) {
      throw new ApiError(400, 'name is required', 'BadRequest');
    }
    if (name.length > 120) {
      throw new ApiError(400, 'name must be at most 120 characters', 'BadRequest');
    }

    const isoCode = body.isoCode?.trim();
    if (isoCode && (isoCode.length < 2 || isoCode.length > 3)) {
      throw new ApiError(400, 'isoCode must be 2 to 3 characters', 'BadRequest');
    }

    const doc = await CountryModel.create({
      name,
      isoCode: isoCode ? isoCode.toUpperCase() : null,
    });

    return Response.json(toCountryDto(doc), { status: 201 });
  });

