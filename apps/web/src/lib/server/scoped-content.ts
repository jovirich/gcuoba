import { ApiError } from './api-error';
import { hasGlobalAccess, managedBranchIds, managedClassIds } from './authorization';
import { BranchMembershipModel, ClassMembershipModel } from './models';

export type ScopeType = 'global' | 'branch' | 'class';

export function parseScopeType(value: string | null | undefined): ScopeType | undefined {
  if (value === 'global' || value === 'branch' || value === 'class') {
    return value;
  }
  return undefined;
}

export async function buildReadableScopeFilter(
  actorId: string,
  scopeType?: ScopeType,
  scopeId?: string,
): Promise<Record<string, unknown>> {
  const global = await hasGlobalAccess(actorId);
  if (global) {
    if (!scopeType) {
      return {};
    }
    return scopeType === 'global' ? { scopeType: 'global' } : { scopeType, ...(scopeId ? { scopeId } : {}) };
  }

  const [managedBranches, managedClasses, branchMemberships, classMembership] = await Promise.all([
    managedBranchIds(actorId),
    managedClassIds(actorId),
    BranchMembershipModel.find({ userId: actorId }).lean().exec(),
    ClassMembershipModel.findOne({ userId: actorId }).lean().exec(),
  ]);

  const readableBranches = new Set(managedBranches);
  branchMemberships
    .filter((membership) => membership.status === 'approved')
    .forEach((membership) => readableBranches.add(membership.branchId));

  const readableClasses = new Set(managedClasses);
  if (classMembership?.classId) {
    readableClasses.add(classMembership.classId);
  }

  if (scopeType === 'global') {
    return { scopeType: 'global' };
  }

  if (scopeType === 'branch') {
    if (!scopeId) {
      throw new ApiError(400, 'scopeId is required for branch scope', 'BadRequest');
    }
    if (!readableBranches.has(scopeId)) {
      throw new ApiError(403, 'Not authorized for this branch scope', 'Forbidden');
    }
    return { scopeType: 'branch', scopeId };
  }

  if (scopeType === 'class') {
    if (!scopeId) {
      throw new ApiError(400, 'scopeId is required for class scope', 'BadRequest');
    }
    if (!readableClasses.has(scopeId)) {
      throw new ApiError(403, 'Not authorized for this class scope', 'Forbidden');
    }
    return { scopeType: 'class', scopeId };
  }

  const filterScopes: Array<Record<string, unknown>> = [{ scopeType: 'global' }];
  if (readableBranches.size > 0) {
    filterScopes.push({
      scopeType: 'branch',
      scopeId: { $in: Array.from(readableBranches) },
    });
  }
  if (readableClasses.size > 0) {
    filterScopes.push({
      scopeType: 'class',
      scopeId: { $in: Array.from(readableClasses) },
    });
  }
  return { $or: filterScopes };
}

export async function ensureWritableScope(
  actorId: string,
  scopeType: ScopeType,
  scopeId: string | null,
) {
  const global = await hasGlobalAccess(actorId);
  if (global) {
    return;
  }

  if (scopeType === 'global') {
    throw new ApiError(403, 'Not authorized for global scope', 'Forbidden');
  }
  if (!scopeId) {
    throw new ApiError(400, 'scopeId is required', 'BadRequest');
  }

  if (scopeType === 'branch') {
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

