import { ApiError } from '@/lib/server/api-error';
import { toAnnouncementDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { AnnouncementModel } from '@/lib/server/models';
import { withApiHandler } from '@/lib/server/route';
import { ensureWritableScope } from '@/lib/server/scoped-content';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ id: string }>;
};

type UpdateAnnouncementBody = {
  title?: string;
  body?: string;
  scopeType?: 'global' | 'branch' | 'class';
  scopeId?: string | null;
  status?: 'draft' | 'published';
  publishedAt?: string | null;
};

function parseDate(value: string, field: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${field} must be a valid date`, 'BadRequest');
  }
  return date;
}

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { id } = await context.params;

    const doc = await AnnouncementModel.findById(id).exec();
    if (!doc) {
      throw new ApiError(404, 'Announcement not found', 'NotFound');
    }
    return Response.json(toAnnouncementDto(doc));
  });

export const PATCH = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { id } = await context.params;

    const doc = await AnnouncementModel.findById(id).exec();
    if (!doc) {
      throw new ApiError(404, 'Announcement not found', 'NotFound');
    }
    await ensureWritableScope(authUser.sub, doc.scopeType, doc.scopeId ?? null);

    const body = (await request.json()) as UpdateAnnouncementBody;

    if (body.scopeType !== undefined || body.scopeId !== undefined) {
      const nextScopeType = body.scopeType ?? doc.scopeType;
      if (nextScopeType !== 'global' && nextScopeType !== 'branch' && nextScopeType !== 'class') {
        throw new ApiError(400, 'scopeType must be global, branch, or class', 'BadRequest');
      }
      const nextScopeId =
        nextScopeType === 'global'
          ? null
          : body.scopeId !== undefined
            ? body.scopeId?.trim() || null
            : doc.scopeId ?? null;
      await ensureWritableScope(authUser.sub, nextScopeType, nextScopeId);
      doc.scopeType = nextScopeType;
      doc.scopeId = nextScopeId;
    }

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) {
        throw new ApiError(400, 'title cannot be empty', 'BadRequest');
      }
      doc.title = title;
    }
    if (body.body !== undefined) {
      const text = body.body.trim();
      if (!text) {
        throw new ApiError(400, 'body cannot be empty', 'BadRequest');
      }
      doc.body = text;
    }
    if (body.status !== undefined) {
      if (body.status !== 'draft' && body.status !== 'published') {
        throw new ApiError(400, 'status must be draft or published', 'BadRequest');
      }
      doc.status = body.status;
      if (body.status === 'published') {
        doc.publishedAt = body.publishedAt ? parseDate(body.publishedAt, 'publishedAt') : new Date();
      } else if (body.publishedAt !== undefined) {
        doc.publishedAt = body.publishedAt ? parseDate(body.publishedAt, 'publishedAt') : undefined;
      }
    } else if (body.publishedAt !== undefined) {
      doc.publishedAt = body.publishedAt ? parseDate(body.publishedAt, 'publishedAt') : undefined;
    }

    await doc.save();
    return Response.json(toAnnouncementDto(doc));
  });

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { id } = await context.params;

    const existing = await AnnouncementModel.findById(id).exec();
    if (!existing) {
      throw new ApiError(404, 'Announcement not found', 'NotFound');
    }
    await ensureWritableScope(authUser.sub, existing.scopeType, existing.scopeId ?? null);
    await AnnouncementModel.findByIdAndDelete(id).exec();
    return Response.json({ success: true });
  });

