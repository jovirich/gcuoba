import type { RoleAssignmentDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { activeAssignmentsForUser } from '@/lib/server/roles';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const assignments: RoleAssignmentDTO[] = await activeAssignmentsForUser(authUser.sub);
    return Response.json(assignments);
  });

