import type { DuesBroadsheetDTO, DuesBroadsheetStatus } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { getMemberClassDuesBroadsheet } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

function parseStatus(raw: string | null): DuesBroadsheetStatus | undefined {
  if (!raw) {
    return undefined;
  }
  if (raw === 'clear' || raw === 'owing_current' || raw === 'outstanding_prior') {
    return raw;
  }
  throw new ApiError(400, 'Invalid dues status filter', 'BadRequest');
}

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const yearRaw = url.searchParams.get('year');
    const year = yearRaw ? Number(yearRaw) : undefined;
    const currency = url.searchParams.get('currency')?.trim() || undefined;
    const query = url.searchParams.get('query')?.trim() || undefined;
    const status = parseStatus(url.searchParams.get('status'));

    const dto: DuesBroadsheetDTO = await getMemberClassDuesBroadsheet(authUser.sub, {
      year: Number.isFinite(year) ? year : undefined,
      currency,
      query,
      status,
    });

    return Response.json(dto);
  });
