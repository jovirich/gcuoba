import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { getClassClaimRegistrationOptions } from '@/lib/server/claims';

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

export const GET = (_request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { classYear: rawClassYear } = await context.params;
    const classYear = parseClassYear(rawClassYear);
    const options = await getClassClaimRegistrationOptions(classYear);
    return Response.json(options);
  });

