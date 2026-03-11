import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { listClassClaimMembers } from '@/lib/server/claims';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ classYear: string }>;
};

function parseClassYear(raw: string) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1900 || value > 2100) {
    throw new ApiError(400, 'Invalid class year', 'BadRequest');
  }
  return value;
}

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { classYear: rawClassYear } = await context.params;
    const classYear = parseClassYear(rawClassYear);
    const url = new URL(request.url);
    const query = url.searchParams.get('query') ?? url.searchParams.get('q') ?? undefined;
    const members = await listClassClaimMembers(classYear, query);
    return Response.json({ members });
  });

