import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { toProfileDto } from '@/lib/server/dto-mappers';
import { ProfileModel } from '@/lib/server/models';
import { ensureSelfAccess, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ userId: string }>;
};

type ProfileUpdateBody = {
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dobDay?: number;
  dobMonth?: number;
  dobYear?: number;
  sex?: string;
  stateOfOrigin?: string;
  lgaOfOrigin?: string;
  resHouseNo?: string;
  resStreet?: string;
  resArea?: string;
  resCity?: string;
  resCountry?: string;
  occupation?: string;
  photoUrl?: string;
  houseId?: string;
  privacyLevel?: 'public' | 'public_to_members' | 'private';
};

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { userId } = await context.params;
    const authUser = await requireAuthTokenUser(request);
    ensureSelfAccess(authUser, userId, 'Cannot access another profile');

    const profile = await ProfileModel.findOne({ userId }).exec();
    return Response.json(profile ? toProfileDto(profile) : null);
  });

export const PUT = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { userId } = await context.params;
    const authUser = await requireAuthTokenUser(request);
    ensureSelfAccess(authUser, userId, 'Cannot access another profile');

    const body = (await request.json()) as ProfileUpdateBody;
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    if (!firstName || !lastName) {
      throw new ApiError(400, 'First and last name are required', 'BadRequest');
    }

    const profile = await ProfileModel.findOneAndUpdate(
      { userId },
      {
        userId,
        title: body.title?.trim() || null,
        firstName,
        middleName: body.middleName?.trim() || null,
        lastName,
        dobDay: body.dobDay ?? null,
        dobMonth: body.dobMonth ?? null,
        dobYear: body.dobYear ?? null,
        sex: body.sex?.trim() || null,
        stateOfOrigin: body.stateOfOrigin?.trim() || null,
        lgaOfOrigin: body.lgaOfOrigin?.trim() || null,
        resHouseNo: body.resHouseNo?.trim() || null,
        resStreet: body.resStreet?.trim() || null,
        resArea: body.resArea?.trim() || null,
        resCity: body.resCity?.trim() || null,
        resCountry: body.resCountry?.trim() || null,
        occupation: body.occupation?.trim() || null,
        photoUrl: body.photoUrl?.trim() || null,
        houseId: body.houseId?.trim() || null,
        privacyLevel: body.privacyLevel ?? 'public_to_members',
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();

    if (!profile) {
      throw new ApiError(500, 'Unable to persist profile', 'InternalServerError');
    }

    return Response.json(toProfileDto(profile));
  });
