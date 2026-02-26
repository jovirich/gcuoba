import type { BranchDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { toBranchDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { BranchModel } from '@/lib/server/models';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type CreateBranchBody = {
  name?: string;
  country?: string;
};

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    await requireAuthTokenUser(request);

    const docs = await BranchModel.find().exec();
    const result: BranchDTO[] = docs.map((doc) => toBranchDto(doc));
    return Response.json(result);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);

    const body = (await request.json()) as CreateBranchBody;
    const name = body.name?.trim();
    if (!name) {
      throw new ApiError(400, 'name is required', 'BadRequest');
    }
    if (name.length > 190) {
      throw new ApiError(400, 'name must be at most 190 characters', 'BadRequest');
    }

    const country = body.country?.trim();
    if (country && country.length > 190) {
      throw new ApiError(400, 'country must be at most 190 characters', 'BadRequest');
    }

    const doc = await BranchModel.create({
      name,
      country: country || null,
    });

    return Response.json(toBranchDto(doc), { status: 201 });
  });

