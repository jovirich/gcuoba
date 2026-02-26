import type { ClassSetDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { toClassDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { ClassModel } from '@/lib/server/models';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type CreateClassBody = {
  label?: string;
  entryYear?: number;
  status?: 'active' | 'inactive';
};

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    await requireAuthTokenUser(request);

    const docs = await ClassModel.find().sort({ entryYear: -1 }).exec();
    const result: ClassSetDTO[] = docs.map((doc) => toClassDto(doc));
    return Response.json(result);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);

    const body = (await request.json()) as CreateClassBody;
    const label = body.label?.trim();
    if (!label) {
      throw new ApiError(400, 'label is required', 'BadRequest');
    }

    const entryYear = Number(body.entryYear);
    if (!Number.isFinite(entryYear) || entryYear < 1900 || entryYear > 2100) {
      throw new ApiError(400, 'entryYear must be between 1900 and 2100', 'BadRequest');
    }

    const status = body.status;
    if (status !== 'active' && status !== 'inactive') {
      throw new ApiError(400, 'status must be active or inactive', 'BadRequest');
    }

    const doc = await ClassModel.create({
      label,
      entryYear,
      status,
    });

    return Response.json(toClassDto(doc), { status: 201 });
  });

