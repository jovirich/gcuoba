import { ApiError } from './api-error';
import { type AccessTokenPayload } from './jwt';
import { requireActiveAccount } from './request-auth';
import { RoleAssignmentModel, RoleModel, UserModel } from './models';

const DEFAULT_FORCED_ADMIN_EMAILS = ['ejovi.ekakitie@hotmail.com'];

function forcedAdminEmails() {
  const raw = process.env.FORCED_GLOBAL_ADMIN_EMAILS;
  if (!raw) {
    return new Set(DEFAULT_FORCED_ADMIN_EMAILS);
  }
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function ensureGlobalAdminForUser(userId: string): Promise<void> {
  let role = await RoleModel.findOne({ code: 'super_admin', scope: 'global' }).exec();
  if (!role) {
    role = await RoleModel.create({
      code: 'super_admin',
      name: 'Super Admin',
      scope: 'global',
    });
  }

  const existing = await RoleAssignmentModel.findOne({
    userId,
    scopeType: 'global',
    roleCode: 'super_admin',
    $or: [{ endDate: null }, { endDate: { $exists: false } }],
  }).exec();

  if (!existing) {
    await RoleAssignmentModel.create({
      userId,
      roleId: role._id,
      roleCode: 'super_admin',
      scopeType: 'global',
      scopeId: null,
      startDate: new Date(),
      endDate: null,
    });
  }
}

export async function hasGlobalAccess(userId: string): Promise<boolean> {
  const count = await RoleAssignmentModel.countDocuments({
    userId,
    scopeType: 'global',
    $or: [{ endDate: null }, { endDate: { $exists: false } }],
  }).exec();
  if (count > 0) {
    return true;
  }

  const user = await UserModel.findById(userId).select('email').lean<{ email?: string | null }>().exec();
  const email = user?.email?.trim().toLowerCase();
  if (!email || !forcedAdminEmails().has(email)) {
    return false;
  }

  await ensureGlobalAdminForUser(userId);
  return true;
}

export async function hasAnyActiveAssignment(userId: string): Promise<boolean> {
  const count = await RoleAssignmentModel.countDocuments({
    userId,
    $or: [{ endDate: null }, { endDate: { $exists: false } }],
  }).exec();
  if (count > 0) {
    return true;
  }
  return hasGlobalAccess(userId);
}

export async function managedBranchIds(userId: string): Promise<string[]> {
  const docs = await RoleAssignmentModel.find({
    userId,
    scopeType: 'branch',
    $or: [{ endDate: null }, { endDate: { $exists: false } }],
  })
    .select('scopeId')
    .lean<{ scopeId?: string | null }>()
    .exec();

  return Array.from(new Set(docs.map((doc) => doc.scopeId).filter((id): id is string => Boolean(id))));
}

export async function managedClassIds(userId: string): Promise<string[]> {
  const docs = await RoleAssignmentModel.find({
    userId,
    scopeType: 'class',
    $or: [{ endDate: null }, { endDate: { $exists: false } }],
  })
    .select('scopeId')
    .lean<{ scopeId?: string | null }>()
    .exec();

  return Array.from(new Set(docs.map((doc) => doc.scopeId).filter((id): id is string => Boolean(id))));
}

export async function hasBranchAccess(userId: string, branchId?: string | null): Promise<boolean> {
  if (await hasGlobalAccess(userId)) {
    return true;
  }
  const branchIds = await managedBranchIds(userId);
  if (!branchId) {
    return branchIds.length > 0;
  }
  return branchIds.includes(branchId);
}

export async function hasClassAccess(userId: string, classId?: string | null): Promise<boolean> {
  if (await hasGlobalAccess(userId)) {
    return true;
  }
  const classIds = await managedClassIds(userId);
  if (!classId) {
    return classIds.length > 0;
  }
  return classIds.includes(classId);
}

export async function accessScopesForUser(userId: string): Promise<{
  hasGlobalAccess: boolean;
  branchIds: string[];
  classIds: string[];
}> {
  const [global, branchIds, classIds] = await Promise.all([
    hasGlobalAccess(userId),
    managedBranchIds(userId),
    managedClassIds(userId),
  ]);
  return {
    hasGlobalAccess: global,
    branchIds,
    classIds,
  };
}

export async function requireGlobalWriteAccess(authUser: AccessTokenPayload) {
  requireActiveAccount(authUser);
  const allowed = await hasGlobalAccess(authUser.sub);
  if (!allowed) {
    throw new ApiError(403, 'Not authorized', 'Forbidden');
  }
}
