import { connectMongo } from '@/lib/server/mongo';
import { ROLE_FEATURE_MODULES } from '@/lib/server/role-features';
import { withApiHandler } from '@/lib/server/route';
import { requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    await requireAuthTokenUser(request);

    const modules = Object.entries(ROLE_FEATURE_MODULES).map(([key, label]) => ({
      key,
      label,
    }));
    return Response.json(modules);
  });

