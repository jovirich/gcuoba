import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { verifyClassClaim } from '@/lib/server/claims';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ classYear: string }>;
};

type Body = {
  userId?: string;
  password?: string;
};

function parseClassYear(raw: string) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1900 || value > 2100) {
    throw new ApiError(400, 'Invalid class year', 'BadRequest');
  }
  return value;
}

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { classYear: rawClassYear } = await context.params;
    const classYear = parseClassYear(rawClassYear);
    const body = (await request.json()) as Body;
    const userId = body.userId?.trim();
    const password = body.password ?? '';
    if (!userId || !password) {
      throw new ApiError(400, 'userId and password are required', 'BadRequest');
    }

    const result = await verifyClassClaim(classYear, userId, password);
    return Response.json(result);
  });

