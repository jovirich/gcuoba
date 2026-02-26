import type { EventParticipationDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { toEventParticipationDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { EventModel, EventParticipationModel } from '@/lib/server/models';
import { withApiHandler } from '@/lib/server/route';
import { buildReadableScopeFilter } from '@/lib/server/scoped-content';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ id: string }>;
};

type UpdateParticipationBody = {
  status?: 'interested' | 'attending' | 'not_attending';
  contributionAmount?: number;
  contributionCurrency?: string;
  contributionNote?: string | null;
};

async function ensureReadableEvent(userId: string, eventId: string) {
  const readableFilter = await buildReadableScopeFilter(userId);
  const event = await EventModel.findOne({ _id: eventId, ...readableFilter }).exec();
  if (!event) {
    throw new ApiError(404, 'Event not found', 'NotFound');
  }
  return event;
}

async function summary(eventId: string) {
  const rows = await EventParticipationModel.find({ eventId })
    .lean<Array<{ status: 'interested' | 'attending' | 'not_attending'; contributionAmount?: number }>>()
    .exec();
  return {
    attendeeCount: rows.filter((entry) => entry.status === 'attending').length,
    contributionTotal: Number(
      rows.reduce((sum, entry) => sum + Number(entry.contributionAmount ?? 0), 0).toFixed(2),
    ),
  };
}

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const { id } = await context.params;
    await ensureReadableEvent(authUser.sub, id);

    const participation = await EventParticipationModel.findOne({
      eventId: id,
      userId: authUser.sub,
    }).exec();
    if (!participation) {
      return Response.json({
        participation: null,
        summary: await summary(id),
      });
    }

    const dto: EventParticipationDTO = toEventParticipationDto(participation);
    return Response.json({
      participation: dto,
      summary: await summary(id),
    });
  });

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const { id } = await context.params;
    await ensureReadableEvent(authUser.sub, id);

    const body = (await request.json()) as UpdateParticipationBody;
    const hasStatus = body.status !== undefined;
    const hasContributionUpdate =
      body.contributionAmount !== undefined ||
      body.contributionCurrency !== undefined ||
      body.contributionNote !== undefined;

    if (!hasStatus && !hasContributionUpdate) {
      throw new ApiError(
        400,
        'Provide status and/or contribution details to update participation',
        'BadRequest',
      );
    }

    if (
      hasStatus &&
      body.status !== 'interested' &&
      body.status !== 'attending' &&
      body.status !== 'not_attending'
    ) {
      throw new ApiError(400, 'Invalid participation status', 'BadRequest');
    }

    let participation = await EventParticipationModel.findOne({
      eventId: id,
      userId: authUser.sub,
    }).exec();

    if (!participation) {
      participation = await EventParticipationModel.create({
        eventId: id,
        userId: authUser.sub,
        status: body.status ?? 'interested',
        contributionAmount: 0,
        contributionCurrency: 'NGN',
        contributionNote: null,
        contributedAt: null,
      });
    }

    if (hasStatus && body.status) {
      participation.status = body.status;
    }

    if (body.contributionAmount !== undefined) {
      const amount = Number(body.contributionAmount ?? 0);
      if (!Number.isFinite(amount) || amount < 0) {
        throw new ApiError(400, 'contributionAmount must be zero or greater', 'BadRequest');
      }
      participation.contributionAmount = Number(amount.toFixed(2));
      participation.contributedAt = amount > 0 ? new Date() : null;
    }

    if (body.contributionCurrency !== undefined) {
      const currency = body.contributionCurrency?.trim().toUpperCase();
      if (!currency || currency.length < 3 || currency.length > 3) {
        throw new ApiError(400, 'contributionCurrency must be a 3-letter code', 'BadRequest');
      }
      participation.contributionCurrency = currency;
    }

    if (body.contributionNote !== undefined) {
      participation.contributionNote = body.contributionNote?.trim() || null;
    }

    await participation.save();
    const dto: EventParticipationDTO = toEventParticipationDto(participation);
    return Response.json(
      {
        participation: dto,
        summary: await summary(id),
      },
      { status: 200 },
    );
  });

