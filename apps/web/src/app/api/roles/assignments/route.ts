import type { RoleAssignmentDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { hasGlobalAccess, managedBranchIds, managedClassIds } from '@/lib/server/authorization';
import { connectMongo } from '@/lib/server/mongo';
import { activeAssignmentsForUser, createRoleAssignment, ensureTargetMemberInScope, isMongoId } from '@/lib/server/roles';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type CreateRoleAssignmentBody = {
  userId?: string;
  roleCode?: string;
  scopeType?: 'global' | 'branch' | 'class';
  scopeId?: string | null;
};

function isScopeType(value: string | undefined): value is 'global' | 'branch' | 'class' {
  return value === 'global' || value === 'branch' || value === 'class';
}

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

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId')?.trim();

    if (targetUserId && targetUserId !== authUser.sub) {
      const global = await hasGlobalAccess(authUser.sub);
      if (!global) {
        throw new ApiError(403, 'Not authorized', 'Forbidden');
      }
    }

    const assignments: RoleAssignmentDTO[] = await activeAssignmentsForUser(targetUserId || authUser.sub);
    return Response.json(assignments);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const body = (await request.json()) as CreateRoleAssignmentBody;
    const userId = body.userId?.trim();
    const roleCode = body.roleCode?.trim();
    const scopeType = body.scopeType;
    const scopeId = body.scopeId?.trim() || null;

    if (!userId || !isMongoId(userId)) {
      throw new ApiError(400, 'userId must be a valid member id', 'BadRequest');
    }
    if (!roleCode) {
      throw new ApiError(400, 'roleCode is required', 'BadRequest');
    }
    if (!isScopeType(scopeType)) {
      throw new ApiError(400, 'scopeType must be global, branch, or class', 'BadRequest');
    }

    await ensureWritableScope(authUser.sub, { scopeType, scopeId });
    await ensureTargetMemberInScope({ userId, scopeType, scopeId });

    const created = await createRoleAssignment({
      userId,
      roleCode,
      scopeType,
      scopeId,
    });
    return Response.json(created, { status: 201 });
  });

