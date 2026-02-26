import type { EventDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { toEventDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { EventModel, EventParticipationModel } from '@/lib/server/models';
import { withApiHandler } from '@/lib/server/route';
import { buildReadableScopeFilter, ensureWritableScope, parseScopeType } from '@/lib/server/scoped-content';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type CreateEventBody = {
  title?: string;
  description?: string;
  scopeType?: 'global' | 'branch' | 'class';
  scopeId?: string;
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

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const scopeType = parseScopeType(url.searchParams.get('scopeType'));
    const scopeId = url.searchParams.get('scopeId')?.trim() || undefined;
    const statusRaw = url.searchParams.get('status');
    const status =
      statusRaw === 'draft' || statusRaw === 'published' || statusRaw === 'cancelled'
        ? statusRaw
        : undefined;

    const filter = await buildReadableScopeFilter(authUser.sub, scopeType, scopeId);
    if (status) {
      filter.status = status;
    }

    const docs = await EventModel.find(filter).sort({ startAt: 1, createdAt: -1 }).exec();
    const eventIds = docs.map((doc) => doc._id.toString());

    const participations =
      eventIds.length > 0
        ? await EventParticipationModel.find({ eventId: { $in: eventIds } })
            .lean<
              Array<{
                eventId: string;
                userId: string;
                status: 'interested' | 'attending' | 'not_attending';
                contributionAmount?: number;
              }>
            >()
            .exec()
        : [];

    const aggregate = new Map<string, { attendeeCount: number; contributionTotal: number }>();
    const mine = new Map<
      string,
      { status: 'interested' | 'attending' | 'not_attending'; contributionAmount: number }
    >();

    participations.forEach((entry) => {
      const current = aggregate.get(entry.eventId) ?? { attendeeCount: 0, contributionTotal: 0 };
      if (entry.status === 'attending') {
        current.attendeeCount += 1;
      }
      current.contributionTotal += Number(entry.contributionAmount ?? 0);
      aggregate.set(entry.eventId, current);

      if (entry.userId === authUser.sub) {
        mine.set(entry.eventId, {
          status: entry.status,
          contributionAmount: Number(entry.contributionAmount ?? 0),
        });
      }
    });

    const result: EventDTO[] = docs.map((doc) => {
      const eventId = doc._id.toString();
      const stats = aggregate.get(eventId) ?? { attendeeCount: 0, contributionTotal: 0 };
      const my = mine.get(eventId);
      return toEventDto(doc, {
        attendeeCount: stats.attendeeCount,
        contributionTotal: Number(stats.contributionTotal.toFixed(2)),
        myRsvp: my?.status ?? 'none',
        myContributionAmount: Number((my?.contributionAmount ?? 0).toFixed(2)),
      });
    });
    return Response.json(result);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const body = (await request.json()) as CreateEventBody;
    const title = body.title?.trim();
    if (!title) {
      throw new ApiError(400, 'title is required', 'BadRequest');
    }

    const scopeType = body.scopeType;
    if (scopeType !== 'global' && scopeType !== 'branch' && scopeType !== 'class') {
      throw new ApiError(400, 'scopeType must be global, branch, or class', 'BadRequest');
    }
    const scopeId = scopeType === 'global' ? null : body.scopeId?.trim() || null;
    await ensureWritableScope(authUser.sub, scopeType, scopeId);

    if (!body.startAt) {
      throw new ApiError(400, 'startAt is required', 'BadRequest');
    }
    const startAt = parseDate(body.startAt, 'startAt');
    const endAt = body.endAt ? parseDate(body.endAt, 'endAt') : null;

    const status =
      body.status === 'draft' || body.status === 'published' || body.status === 'cancelled'
        ? body.status
        : 'draft';

    const doc = await EventModel.create({
      title,
      description: body.description?.trim() || null,
      scopeType,
      scopeId,
      location: body.location?.trim() || null,
      startAt,
      endAt,
      status,
    });

    return Response.json(toEventDto(doc), { status: 201 });
  });
