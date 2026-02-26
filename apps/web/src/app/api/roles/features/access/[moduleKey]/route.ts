import { connectMongo } from '@/lib/server/mongo';
import { userHasFeature } from '@/lib/server/roles';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ moduleKey: string }>;
};

function parseScopeType(value: string | null): 'global' | 'branch' | 'class' | undefined {
  if (value === 'global' || value === 'branch' || value === 'class') {
    return value;
  }
  return undefined;
}

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const { moduleKey } = await context.params;
    const url = new URL(request.url);
    const scopeType = parseScopeType(url.searchParams.get('scopeType'));
    const scopeId = url.searchParams.get('scopeId');

    const allowed = await userHasFeature(authUser.sub, moduleKey, scopeType, scopeId);
    return Response.json({ allowed });
  });

