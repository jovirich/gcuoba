import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { completeClassClaimProfile } from '@/lib/server/claims';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ classYear: string }>;
};

type Body = {
  token?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  title?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  dobDay?: number | string;
  dobMonth?: number | string;
  dobYear?: number | string | null;
  branchId?: string | null;
  houseId?: string | null;
  note?: string | null;
};

function parseClassYear(raw: string) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1900 || value > 2100) {
    throw new ApiError(400, 'Invalid class year', 'BadRequest');
  }
  return value;
}

function toNumber(value: number | string | null | undefined, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ApiError(400, `${fieldName} must be a number`, 'BadRequest');
  }
  return parsed;
}

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { classYear: rawClassYear } = await context.params;
    const classYear = parseClassYear(rawClassYear);
    const body = (await request.json()) as Body;

    const token = body.token?.trim();
    const firstName = body.firstName?.trim() ?? '';
    const lastName = body.lastName?.trim() ?? '';
    const middleName = body.middleName?.trim() ?? '';
    const title = body.title?.trim() ?? 'mr';
    const phone = body.phone?.trim() ?? '';
    const email = body.email?.trim().toLowerCase() ?? '';
    const password = body.password ?? '';
    const confirmPassword = body.confirmPassword ?? '';
    if (!token) {
      throw new ApiError(400, 'Claim token is required', 'BadRequest');
    }

    const dobDay = toNumber(body.dobDay, 'dobDay');
    const dobMonth = toNumber(body.dobMonth, 'dobMonth');
    const hasDobYear =
      body.dobYear !== null &&
      body.dobYear !== undefined &&
      `${body.dobYear}`.trim().length > 0;
    const dobYear = hasDobYear ? toNumber(body.dobYear, 'dobYear') : null;

    const result = await completeClassClaimProfile({
      token,
      classYear,
      firstName,
      lastName,
      middleName,
      title,
      phone,
      email,
      password,
      confirmPassword,
      dobDay,
      dobMonth,
      dobYear,
      branchId: body.branchId?.trim() || null,
      houseId: body.houseId?.trim() || null,
      note: body.note?.trim() || null,
    });

    return Response.json(result);
  });

