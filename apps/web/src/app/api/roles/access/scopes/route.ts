import { accessScopesForUser, hasBranchAccess, hasClassAccess } from '@/lib/server/authorization';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const scopes = await accessScopesForUser(authUser.sub);
    const [branchAccess, classAccess] = await Promise.all([
      hasBranchAccess(authUser.sub),
      hasClassAccess(authUser.sub),
    ]);

    return Response.json({
      hasGlobalAccess: scopes.hasGlobalAccess,
      hasBranchAccess: branchAccess,
      hasClassAccess: classAccess,
      branchIds: scopes.branchIds,
      classIds: scopes.classIds,
    });
  });

