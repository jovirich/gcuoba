import { ApiError } from '@/lib/server/api-error';
import { toEventDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { EventModel, EventParticipationModel } from '@/lib/server/models';
import { withApiHandler } from '@/lib/server/route';
import { buildReadableScopeFilter, ensureWritableScope } from '@/lib/server/scoped-content';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ id: string }>;
};

type UpdateEventBody = {
  title?: string;
  description?: string;
  scopeType?: 'global' | 'branch' | 'class';
  scopeId?: string | null;
  location?: string;
  startAt?: string;
  endAt?: string;
  status?: 'draft' | 'published' | 'cancelled';
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
    const readableFilter = await buildReadableScopeFilter(authUser.sub);
    const doc = await EventModel.findOne({ _id: id, ...readableFilter }).exec();
    if (!doc) {
      throw new ApiError(404, 'Event not found', 'NotFound');
    }

    const participations = await EventParticipationModel.find({ eventId: id })
      .lean<
        Array<{
          userId: string;
          status: 'interested' | 'attending' | 'not_attending';
          contributionAmount?: number;
        }>
      >()
      .exec();
    const attendeeCount = participations.filter((entry) => entry.status === 'attending').length;
    const contributionTotal = participations.reduce((sum, entry) => sum + Number(entry.contributionAmount ?? 0), 0);
    const mine = participations.find((entry) => entry.userId === authUser.sub);

    return Response.json(
      toEventDto(doc, {
        attendeeCount,
        contributionTotal: Number(contributionTotal.toFixed(2)),
        myRsvp: mine?.status ?? 'none',
        myContributionAmount: Number((mine?.contributionAmount ?? 0).toFixed(2)),
      }),
    );
  });

export const PATCH = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { id } = await context.params;

    const doc = await EventModel.findById(id).exec();
    if (!doc) {
      throw new ApiError(404, 'Event not found', 'NotFound');
    }
    await ensureWritableScope(authUser.sub, doc.scopeType, doc.scopeId ?? null);

    const body = (await request.json()) as UpdateEventBody;

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
    if (body.description !== undefined) {
      doc.description = body.description?.trim() || null;
    }
    if (body.location !== undefined) {
      doc.location = body.location?.trim() || null;
    }
    if (body.startAt !== undefined) {
      doc.startAt = parseDate(body.startAt, 'startAt');
    }
    if (body.endAt !== undefined) {
      doc.endAt = body.endAt ? parseDate(body.endAt, 'endAt') : null;
    }
    if (body.status !== undefined) {
      if (body.status !== 'draft' && body.status !== 'published' && body.status !== 'cancelled') {
        throw new ApiError(400, 'status must be draft, published, or cancelled', 'BadRequest');
      }
      doc.status = body.status;
    }

    await doc.save();
    return Response.json(toEventDto(doc));
  });

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { id } = await context.params;

    const existing = await EventModel.findById(id).exec();
    if (!existing) {
      throw new ApiError(404, 'Event not found', 'NotFound');
    }
    await ensureWritableScope(authUser.sub, existing.scopeType, existing.scopeId ?? null);
    await EventModel.findByIdAndDelete(id).exec();
    return Response.json({ success: true });
  });
