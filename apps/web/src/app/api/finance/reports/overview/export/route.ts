import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { exportOverviewReportCsv } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { hasGlobalAccess } from '@/lib/server/authorization';

export const runtime = 'nodejs';

function parseScopeType(raw: string | null): 'global' | 'branch' | 'class' | undefined {
  if (!raw) return undefined;
  if (raw === 'global' || raw === 'branch' || raw === 'class') return raw;
  throw new ApiError(400, 'Invalid scopeType', 'BadRequest');
}

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    if (!(await hasGlobalAccess(authUser.sub))) {
      throw new ApiError(403, 'Not authorized', 'Forbidden');
    }
    const url = new URL(request.url);
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    const file = await exportOverviewReportCsv({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      scopeType: parseScopeType(url.searchParams.get('scopeType')),
      scopeId: url.searchParams.get('scopeId') ?? undefined,
    });
    return new Response(file.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
      },
    });
  });
