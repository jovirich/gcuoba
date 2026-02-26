import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { toBranchDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { BranchModel } from '@/lib/server/models';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ id: string }>;
};

type UpdateBranchBody = {
  name?: string;
  country?: string;
};

export const PATCH = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);
    const { id } = await context.params;

    const body = (await request.json()) as UpdateBranchBody;
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

    if (body.country !== undefined) {
      const country = body.country.trim();
      if (country.length > 190) {
        throw new ApiError(400, 'country must be at most 190 characters', 'BadRequest');
      }
      payload.country = country || null;
    }

    const doc = await BranchModel.findByIdAndUpdate(id, { $set: payload }, { new: true }).exec();
    if (!doc) {
      throw new ApiError(404, 'Branch not found', 'NotFound');
    }
    return Response.json(toBranchDto(doc));
  });

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);
    const { id } = await context.params;

    await BranchModel.findByIdAndDelete(id).exec();
    return Response.json({ success: true });
  });

