import type { WelfareCaseDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { createWelfareCase, listWelfareCases } from '@/lib/server/welfare';

export const runtime = 'nodejs';

function parseScopeType(raw: string | null): 'global' | 'branch' | 'class' | undefined {
  if (!raw) {
    return undefined;
  }
  if (raw === 'global' || raw === 'branch' || raw === 'class') {
    return raw;
  }
  throw new ApiError(400, 'Invalid scopeType', 'BadRequest');
}

type CreateWelfareCaseBody = {
  title?: string;
  description?: string;
  categoryId?: string;
  scopeType?: 'global' | 'branch' | 'class';
  scopeId?: string;
  targetAmount?: number;
  currency?: string;
  beneficiaryName?: string;
  beneficiaryUserId?: string;
};

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const result: WelfareCaseDTO[] = await listWelfareCases(
      authUser.sub,
      parseScopeType(url.searchParams.get('scopeType')),
      url.searchParams.get('scopeId')?.trim() || undefined,
      url.searchParams.get('includeClosed') === 'true',
    );
    return Response.json(result);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const body = (await request.json()) as CreateWelfareCaseBody;
    const created: WelfareCaseDTO = await createWelfareCase(authUser.sub, body);
    return Response.json(created, { status: 201 });
  });

