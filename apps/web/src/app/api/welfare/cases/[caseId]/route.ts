import type { WelfareCaseDetailDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { getWelfareCaseDetail, updateWelfareCase } from '@/lib/server/welfare';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ caseId: string }>;
};

type UpdateWelfareCaseBody = {
  title?: string;
  description?: string;
  categoryId?: string;
  targetAmount?: number;
  currency?: string;
  beneficiaryType?: 'member' | 'external';
  beneficiaryName?: string;
  beneficiaryExternalDetails?: string;
  beneficiaryUserId?: string;
  attendanceRequired?: boolean;
  attendanceEventTitle?: string;
  attendanceEventDescription?: string;
  attendanceEventStartAt?: string;
  attendanceEventEndAt?: string;
  attendanceEventLocation?: string;
};

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { caseId } = await context.params;

    const detail: WelfareCaseDetailDTO = await getWelfareCaseDetail(authUser.sub, caseId);
    return Response.json(detail);
  });

export const PATCH = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { caseId } = await context.params;
    const body = (await request.json()) as UpdateWelfareCaseBody;

    const updated = await updateWelfareCase(authUser.sub, caseId, body);
    return Response.json(updated);
  });

