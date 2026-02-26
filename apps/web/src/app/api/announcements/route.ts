import type { AnnouncementDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { toAnnouncementDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { AnnouncementModel } from '@/lib/server/models';
import { withApiHandler } from '@/lib/server/route';
import { buildReadableScopeFilter, ensureWritableScope, parseScopeType } from '@/lib/server/scoped-content';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type CreateAnnouncementBody = {
  title?: string;
  body?: string;
  scopeType?: 'global' | 'branch' | 'class';
  scopeId?: string;
  status?: 'draft' | 'published';
  publishedAt?: string;
};

function parseDate(value: string, field: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${field} must be a valid date`, 'BadRequest');
  }
  return date;
}

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const scopeType = parseScopeType(url.searchParams.get('scopeType'));
    const scopeId = url.searchParams.get('scopeId')?.trim() || undefined;
    const statusRaw = url.searchParams.get('status');
    const status = statusRaw === 'draft' || statusRaw === 'published' ? statusRaw : undefined;

    const filter = await buildReadableScopeFilter(authUser.sub, scopeType, scopeId);
    if (status) {
      filter.status = status;
    }

    const docs = await AnnouncementModel.find(filter).sort({ publishedAt: -1, createdAt: -1 }).exec();
    const result: AnnouncementDTO[] = docs.map((doc) => toAnnouncementDto(doc));
    return Response.json(result);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const body = (await request.json()) as CreateAnnouncementBody;
    const title = body.title?.trim();
    const messageBody = body.body?.trim();
    if (!title || !messageBody) {
      throw new ApiError(400, 'title and body are required', 'BadRequest');
    }

    const scopeType = body.scopeType;
    if (scopeType !== 'global' && scopeType !== 'branch' && scopeType !== 'class') {
      throw new ApiError(400, 'scopeType must be global, branch, or class', 'BadRequest');
    }
    const scopeId = scopeType === 'global' ? null : body.scopeId?.trim() || null;
    await ensureWritableScope(authUser.sub, scopeType, scopeId);

    const status = body.status === 'draft' || body.status === 'published' ? body.status : 'draft';
    let publishedAt: Date | undefined;
    if (status === 'published') {
      publishedAt = body.publishedAt ? parseDate(body.publishedAt, 'publishedAt') : new Date();
    } else if (body.publishedAt !== undefined) {
      publishedAt = body.publishedAt ? parseDate(body.publishedAt, 'publishedAt') : undefined;
    }

    const doc = await AnnouncementModel.create({
      title,
      body: messageBody,
      scopeType,
      scopeId,
      status,
      ...(publishedAt !== undefined ? { publishedAt } : {}),
    });

    return Response.json(toAnnouncementDto(doc), { status: 201 });
  });

