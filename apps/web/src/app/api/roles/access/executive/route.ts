import { hasAnyActiveAssignment, hasBranchAccess, hasClassAccess, hasGlobalAccess } from '@/lib/server/authorization';
import { connectMongo } from '@/lib/server/mongo';
import { hasApprovedBranchMembership, hasClassMembership } from '@/lib/server/roles';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const [globalAccess, anyAssignment, classMembership, branchMembership, classAccess, branchAccess] = await Promise.all([
      hasGlobalAccess(authUser.sub),
      hasAnyActiveAssignment(authUser.sub),
      hasClassMembership(authUser.sub),
      hasApprovedBranchMembership(authUser.sub),
      hasClassAccess(authUser.sub),
      hasBranchAccess(authUser.sub),
    ]);

    const hasMemberFoundation = classMembership;
    return Response.json({
      allowed: (globalAccess || anyAssignment) && hasMemberFoundation,
      hasMemberFoundation,
      hasClassMembership: classMembership,
      hasApprovedBranchMembership: branchMembership,
      hasClassAccess: classAccess,
      hasBranchAccess: branchAccess,
    });
  });
