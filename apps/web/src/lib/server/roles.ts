import { Types } from 'mongoose';
import { ApiError } from './api-error';
import { hasGlobalAccess } from './authorization';
import { toRoleAssignmentDto } from './dto-mappers';
import {
  BranchMembershipModel,
  ClassMembershipModel,
  RoleAssignmentModel,
  RoleFeatureModel,
  RoleModel,
  type RoleAssignmentDoc,
} from './models';
import { normalizeRoleCode, ROLE_FEATURE_FALLBACK_PERMISSIONS } from './role-features';

function activeAssignmentFilter() {
  return {
    $or: [{ endDate: null }, { endDate: { $exists: false } }],
  };
}

async function alignUserClassAssignmentsToMembership(userId: string): Promise<void> {
  const classMembership = await ClassMembershipModel.findOne({ userId })
    .select('classId')
    .lean<{ classId?: string }>()
    .exec();

  const classId = classMembership?.classId?.trim();
  if (!classId) {
    return;
  }

  await RoleAssignmentModel.updateMany(
    {
      userId,
      scopeType: 'class',
      scopeId: { $ne: classId },
      ...activeAssignmentFilter(),
    },
    { $set: { scopeId: classId } },
  ).exec();
}

export async function hasClassMembership(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }
  const exists = await ClassMembershipModel.exists({ userId });
  return Boolean(exists);
}

export async function hasApprovedBranchMembership(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }
  const exists = await BranchMembershipModel.exists({
    userId,
    status: 'approved',
  });
  return Boolean(exists);
}

export async function activeAssignmentsForUser(userId: string) {
  await alignUserClassAssignmentsToMembership(userId);
  const docs = await RoleAssignmentModel.find({
    userId,
    ...activeAssignmentFilter(),
  })
    .lean<RoleAssignmentDoc[]>()
    .exec();
  return docs.map((doc) => toRoleAssignmentDto(doc));
}

export async function findActiveAssignmentById(assignmentId: string) {
  if (!Types.ObjectId.isValid(assignmentId)) {
    throw new ApiError(404, 'Role assignment not found', 'NotFound');
  }
  const doc = await RoleAssignmentModel.findOne({
    _id: assignmentId,
    ...activeAssignmentFilter(),
  }).exec();
  if (!doc) {
    throw new ApiError(404, 'Role assignment not found', 'NotFound');
  }
  return doc;
}

export async function endRoleAssignmentById(assignmentId: string) {
  const doc = await findActiveAssignmentById(assignmentId);
  doc.endDate = new Date();
  await doc.save();
  return toRoleAssignmentDto(doc);
}

export async function userHasFeature(
  userId: string,
  moduleKey: string,
  scopeType?: 'global' | 'branch' | 'class',
  scopeId?: string | null,
) {
  if (!userId || !moduleKey) {
    return false;
  }

  if (await hasGlobalAccess(userId)) {
    return true;
  }

  const eligible = await hasClassMembership(userId);
  if (!eligible) {
    return false;
  }

  const assignmentFilter: Record<string, unknown> = {
    userId,
    ...activeAssignmentFilter(),
  };
  if (scopeType) {
    assignmentFilter.$or = [
      { scopeType: 'global' },
      {
        scopeType,
        ...(scopeId ? { scopeId } : {}),
      },
    ];
  }

  const assignments = await RoleAssignmentModel.find(assignmentFilter)
    .select('roleId roleCode')
    .lean<RoleAssignmentDoc[]>()
    .exec();
  if (assignments.length === 0) {
    return false;
  }

  const roleIds = Array.from(
    new Set(assignments.map((assignment) => assignment.roleId?.toString()).filter(Boolean)),
  );

  if (roleIds.length > 0) {
    const explicitAllow = await RoleFeatureModel.exists({
      roleId: { $in: roleIds.map((id) => new Types.ObjectId(id)) },
      moduleKey,
      allowed: true,
    }).then(Boolean);
    if (explicitAllow) {
      return true;
    }
  }

  const allowedCodes = ROLE_FEATURE_FALLBACK_PERMISSIONS[moduleKey] ?? [];
  if (allowedCodes.length === 0) {
    return false;
  }

  return assignments.some((assignment) => {
    const normalized = normalizeRoleCode(assignment.roleCode);
    return normalized ? allowedCodes.includes(normalized) : false;
  });
}

export async function createRoleAssignment(payload: {
  userId: string;
  roleCode: string;
  scopeType: 'global' | 'branch' | 'class';
  scopeId?: string | null;
}) {
  const role = await RoleModel.findOne({
    code: payload.roleCode,
    scope: payload.scopeType,
  }).exec();
  if (!role) {
    throw new ApiError(404, 'Role not found for the requested scope', 'NotFound');
  }

  const scopeId = payload.scopeType === 'global' ? null : payload.scopeId?.trim() || null;
  if (payload.scopeType !== 'global' && !scopeId) {
    throw new ApiError(400, 'scopeId is required for branch/class assignments', 'BadRequest');
  }

  const existing = await RoleAssignmentModel.findOne({
    userId: payload.userId,
    roleCode: role.code,
    scopeType: payload.scopeType,
    scopeId,
    ...activeAssignmentFilter(),
  }).exec();
  if (existing) {
    throw new ApiError(400, 'This assignment already exists', 'BadRequest');
  }

  const created = await RoleAssignmentModel.create({
    userId: payload.userId,
    roleId: role._id,
    roleCode: role.code,
    scopeType: payload.scopeType,
    scopeId,
    startDate: new Date(),
    endDate: null,
  });
  return toRoleAssignmentDto(created);
}

export async function ensureTargetMemberInScope(payload: {
  userId: string;
  scopeType: 'global' | 'branch' | 'class';
  scopeId?: string | null;
}) {
  if (payload.scopeType === 'global') {
    return;
  }

  const scopeId = payload.scopeId?.trim();
  if (!scopeId) {
    throw new ApiError(400, 'scopeId is required for branch/class assignments', 'BadRequest');
  }

  if (payload.scopeType === 'branch') {
    const membership = await BranchMembershipModel.exists({
      userId: payload.userId,
      branchId: scopeId,
      status: 'approved',
    });
    if (!membership) {
      throw new ApiError(
        400,
        'Selected member is not approved for the target branch scope',
        'BadRequest',
      );
    }
    return;
  }

  const classMembership = await ClassMembershipModel.findOne({
    userId: payload.userId,
  })
    .select('classId')
    .lean<{ classId?: string }>()
    .exec();
  if (classMembership?.classId !== scopeId) {
    throw new ApiError(400, 'Selected member is not in the target class scope', 'BadRequest');
  }
}

export function isMongoId(value: string) {
  return Types.ObjectId.isValid(value);
}
