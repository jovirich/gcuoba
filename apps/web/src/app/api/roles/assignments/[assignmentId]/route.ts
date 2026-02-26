import type { RoleAssignmentDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { hasGlobalAccess, managedBranchIds, managedClassIds } from '@/lib/server/authorization';
import { connectMongo } from '@/lib/server/mongo';
import { endRoleAssignmentById, findActiveAssignmentById } from '@/lib/server/roles';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ assignmentId: string }>;
};

async function ensureWritableScope(
  actorId: string,
  payload: {
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
  },
) {
  if (await hasGlobalAccess(actorId)) {
    return;
  }

  if (payload.scopeType === 'global') {
    throw new ApiError(403, 'Not authorized for global roles', 'Forbidden');
  }

  const scopeId = payload.scopeId?.trim();
  if (!scopeId) {
    throw new ApiError(400, 'scopeId is required for branch/class assignments', 'BadRequest');
  }

  if (payload.scopeType === 'branch') {
    const managed = await managedBranchIds(actorId);
    if (!managed.includes(scopeId)) {
      throw new ApiError(403, 'Not authorized for this branch scope', 'Forbidden');
    }
    return;
  }

  const managed = await managedClassIds(actorId);
  if (!managed.includes(scopeId)) {
    throw new ApiError(403, 'Not authorized for this class scope', 'Forbidden');
  }
}

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const { assignmentId } = await context.params;
    const existing = await findActiveAssignmentById(assignmentId);

    await ensureWritableScope(authUser.sub, {
      scopeType: existing.scopeType,
      scopeId: existing.scopeId ?? null,
    });

    const updated: RoleAssignmentDTO = await endRoleAssignmentById(assignmentId);
    return Response.json(updated);
  });
