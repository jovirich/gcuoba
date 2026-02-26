import { ApiError } from '@/lib/server/api-error';
import { requireGlobalWriteAccess } from '@/lib/server/authorization';
import { toClassDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { ClassModel } from '@/lib/server/models';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ id: string }>;
};

type UpdateClassBody = {
  label?: string;
  entryYear?: number;
  status?: 'active' | 'inactive';
};

export const PATCH = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);
    const { id } = await context.params;

    const body = (await request.json()) as UpdateClassBody;
    const payload: Record<string, unknown> = {};

    if (body.label !== undefined) {
      const label = body.label.trim();
      if (!label) {
        throw new ApiError(400, 'label cannot be empty', 'BadRequest');
      }
      payload.label = label;
    }

    if (body.entryYear !== undefined) {
      const entryYear = Number(body.entryYear);
      if (!Number.isFinite(entryYear) || entryYear < 1900 || entryYear > 2100) {
        throw new ApiError(400, 'entryYear must be between 1900 and 2100', 'BadRequest');
      }
      payload.entryYear = entryYear;
    }

    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'inactive') {
        throw new ApiError(400, 'status must be active or inactive', 'BadRequest');
      }
      payload.status = body.status;
    }

    const doc = await ClassModel.findByIdAndUpdate(id, { $set: payload }, { new: true }).exec();
    if (!doc) {
      throw new ApiError(404, 'Class not found', 'NotFound');
    }
    return Response.json(toClassDto(doc));
  });

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);
    const { id } = await context.params;

    await ClassModel.findByIdAndDelete(id).exec();
    return Response.json({ success: true });
  });

