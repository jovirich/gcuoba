import type {
  BranchExecutiveBranchDTO,
  BranchExecutiveMemberOptionDTO,
  BranchExecutiveRoleOptionDTO,
  BranchExecutiveSummaryDTO,
  BranchMembershipDTO,
} from '@gcuoba/types';
import { Types } from 'mongoose';
import { ApiError } from './api-error';
import { hasGlobalAccess, managedBranchIds } from './authorization';
import { recordAuditLog } from './audit-logs';
import { toBranchMembershipDto } from './dto-mappers';
import {
  BranchMembershipModel,
  BranchModel,
  RoleAssignmentModel,
  RoleModel,
  UserModel,
} from './models';
import { createNotificationForUser } from './notifications';
import { hasClassMembership } from './roles';
import { ensureCurrentYearDuesInvoices } from './finance';

function activeAssignmentFilter() {
  return {
    $or: [{ endDate: null }, { endDate: { $exists: false } }],
  };
}

async function ensureBranchAccess(actorId: string, branchId: string): Promise<void> {
  if (await hasGlobalAccess(actorId)) {
    return;
  }

  const managed = await managedBranchIds(actorId);
  if (!managed.includes(branchId)) {
    throw new ApiError(403, 'Not authorized for this branch', 'Forbidden');
  }
}

function ensureBranchExecutiveActor(actorId: string, userId: string) {
  if (actorId !== userId) {
    throw new ApiError(403, 'Not authorized for this branch executive action', 'Forbidden');
  }
}

async function findUsersByIds(userIds: string[]) {
  const validIds = userIds.filter((id) => Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    return [];
  }
  return UserModel.find({ _id: { $in: validIds } }).select('name email').lean<{ _id: Types.ObjectId; name: string; email: string }[]>().exec();
}

function toPendingRequestDto(
  membership: {
    _id: Types.ObjectId;
    userId: string;
    branchId: string;
    status: 'requested' | 'approved' | 'rejected' | 'ended';
    requestedAt?: Date | null;
    approvedBy?: string | null;
    approvedAt?: Date | null;
    endedAt?: Date | null;
    note?: string | null;
  },
  member?: { name?: string; email?: string },
): BranchMembershipDTO {
  return {
    id: membership._id.toString(),
    userId: membership.userId,
    branchId: membership.branchId,
    status: membership.status,
    requestedAt: membership.requestedAt?.toISOString(),
    approvedBy: membership.approvedBy ?? null,
    approvedAt: membership.approvedAt?.toISOString() ?? null,
    endedAt: membership.endedAt?.toISOString() ?? null,
    note: membership.note ?? null,
    memberName: member?.name,
    memberEmail: member?.email,
  };
}

export async function getBranchExecutiveSummaryForUser(userId: string): Promise<BranchExecutiveSummaryDTO> {
  const global = await hasGlobalAccess(userId);
  const managedIds = global
    ? (
        await BranchModel.find().select('_id').lean<Array<{ _id: Types.ObjectId }>>().exec()
      ).map((branch) => branch._id.toString())
    : await managedBranchIds(userId);

  if (managedIds.length === 0) {
    return { branches: [], branchRoles: [], branchMembers: [] };
  }

  const [branches, pendingMemberships, approvedMemberships, branchRoles] = await Promise.all([
    BranchModel.find({ _id: { $in: managedIds.filter((id) => Types.ObjectId.isValid(id)) } }).lean().exec(),
    BranchMembershipModel.find({ branchId: { $in: managedIds }, status: 'requested' }).lean().exec(),
    BranchMembershipModel.find({ branchId: { $in: managedIds }, status: 'approved' })
      .select('userId branchId')
      .lean()
      .exec(),
    RoleModel.find({ scope: 'branch' }).select('code name').sort({ name: 1 }).lean().exec(),
  ]);

  const memberIds = Array.from(
    new Set([...pendingMemberships, ...approvedMemberships].map((membership) => membership.userId).filter(Boolean)),
  );
  const members = await findUsersByIds(memberIds);

  const memberMap = new Map<string, { name: string; email: string }>();
  for (const member of members) {
    memberMap.set(member._id.toString(), {
      name: member.name,
      email: member.email,
    });
  }

  const memberBranchMap = new Map<string, Set<string>>();
  for (const membership of approvedMemberships) {
    if (!memberBranchMap.has(membership.userId)) {
      memberBranchMap.set(membership.userId, new Set<string>());
    }
    memberBranchMap.get(membership.userId)?.add(membership.branchId);
  }

  const requestsByBranch = new Map<string, BranchMembershipDTO[]>();
  for (const membership of pendingMemberships) {
    const list = requestsByBranch.get(membership.branchId) ?? [];
    list.push(
      toPendingRequestDto(membership, {
        name: memberMap.get(membership.userId)?.name,
        email: memberMap.get(membership.userId)?.email,
      }),
    );
    requestsByBranch.set(membership.branchId, list);
  }

  const dtoBranches: BranchExecutiveBranchDTO[] = branches.map((branch) => ({
    id: branch._id.toString(),
    name: branch.name,
    country: branch.country ?? undefined,
    pendingRequests: requestsByBranch.get(branch._id.toString()) ?? [],
  }));

  const dtoRoles: BranchExecutiveRoleOptionDTO[] = branchRoles.map((role) => ({
    id: role._id.toString(),
    code: role.code,
    name: role.name,
  }));

  const dtoMembers: BranchExecutiveMemberOptionDTO[] = members
    .filter((member) => memberBranchMap.has(member._id.toString()))
    .map((member) => ({
      id: member._id.toString(),
      name: member.name,
      email: member.email,
      branchIds: Array.from(memberBranchMap.get(member._id.toString()) ?? []),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    branches: dtoBranches,
    branchRoles: dtoRoles,
    branchMembers: dtoMembers,
  };
}

export async function approveBranchMembership(
  actorId: string,
  userId: string,
  membershipId: string,
  note?: string,
): Promise<BranchMembershipDTO> {
  ensureBranchExecutiveActor(actorId, userId);

  const membership = Types.ObjectId.isValid(membershipId)
    ? await BranchMembershipModel.findById(membershipId).exec()
    : null;
  if (!membership) {
    throw new ApiError(403, 'Membership not found', 'Forbidden');
  }

  await ensureBranchAccess(actorId, membership.branchId);

  membership.status = 'approved';
  membership.approvedAt = new Date();
  membership.approvedBy = actorId;
  membership.note = note ?? membership.note;
  await membership.save();
  await ensureCurrentYearDuesInvoices({
    userId: membership.userId,
    scopeType: 'branch',
    scopeId: membership.branchId,
  });

  const branch = await BranchModel.findById(membership.branchId).select('name').lean<{ name?: string }>().exec();
  await createNotificationForUser(membership.userId, {
    title: 'Branch membership approved',
    message: `Your membership request for ${branch?.name ?? 'the selected branch'} was approved.`,
    type: 'success',
    metadata: {
      membershipId: membership._id.toString(),
      branchId: membership.branchId,
      approvedBy: actorId,
    },
  });

  await recordAuditLog({
    actorUserId: actorId,
    action: 'branch_membership.approved',
    resourceType: 'branch_membership',
    resourceId: membership._id.toString(),
    scopeType: 'branch',
    scopeId: membership.branchId,
    metadata: {
      targetUserId: membership.userId,
      note: note ?? null,
    },
  });

  return toBranchMembershipDto(membership);
}

export async function rejectBranchMembership(
  actorId: string,
  userId: string,
  membershipId: string,
  note: string,
): Promise<BranchMembershipDTO> {
  ensureBranchExecutiveActor(actorId, userId);
  const cleanedNote = note.trim();
  if (!cleanedNote) {
    throw new ApiError(403, 'Rejection note is required', 'Forbidden');
  }

  const membership = Types.ObjectId.isValid(membershipId)
    ? await BranchMembershipModel.findById(membershipId).exec()
    : null;
  if (!membership) {
    throw new ApiError(403, 'Membership not found', 'Forbidden');
  }

  await ensureBranchAccess(actorId, membership.branchId);

  membership.status = 'rejected';
  membership.approvedAt = new Date();
  membership.approvedBy = actorId;
  membership.note = cleanedNote;
  await membership.save();

  const branch = await BranchModel.findById(membership.branchId).select('name').lean<{ name?: string }>().exec();
  await createNotificationForUser(membership.userId, {
    title: 'Branch membership request rejected',
    message: `Your membership request for ${branch?.name ?? 'the selected branch'} was rejected.`,
    type: 'warning',
    metadata: {
      membershipId: membership._id.toString(),
      branchId: membership.branchId,
      rejectedBy: actorId,
      note: cleanedNote,
    },
  });

  await recordAuditLog({
    actorUserId: actorId,
    action: 'branch_membership.rejected',
    resourceType: 'branch_membership',
    resourceId: membership._id.toString(),
    scopeType: 'branch',
    scopeId: membership.branchId,
    metadata: {
      targetUserId: membership.userId,
      note: cleanedNote,
    },
  });

  return toBranchMembershipDto(membership);
}

type RecordBranchExecutiveHandoverInput = {
  branchId?: string;
  roleId?: string;
  userId?: string;
  startDate?: string;
};

export async function recordBranchExecutiveHandover(
  actorId: string,
  userId: string,
  input: RecordBranchExecutiveHandoverInput,
): Promise<void> {
  ensureBranchExecutiveActor(actorId, userId);

  const branchId = input.branchId?.trim() ?? '';
  const roleId = input.roleId?.trim() ?? '';
  const assignedUserId = input.userId?.trim() ?? '';
  if (!branchId || !Types.ObjectId.isValid(branchId)) {
    throw new ApiError(400, 'branchId must be a valid id', 'BadRequest');
  }
  if (!roleId || !Types.ObjectId.isValid(roleId)) {
    throw new ApiError(400, 'roleId must be a valid id', 'BadRequest');
  }
  if (!assignedUserId || !Types.ObjectId.isValid(assignedUserId)) {
    throw new ApiError(400, 'userId must be a valid id', 'BadRequest');
  }

  await ensureBranchAccess(actorId, branchId);

  const role = await RoleModel.findOne({ _id: roleId, scope: 'branch' }).lean().exec();
  if (!role) {
    throw new ApiError(400, 'Selected role is not valid for branch handover', 'BadRequest');
  }

  const branchMember = await BranchMembershipModel.findOne({
    userId: assignedUserId,
    branchId,
    status: 'approved',
  })
    .select('_id')
    .lean()
    .exec();
  if (!branchMember) {
    throw new ApiError(400, 'Selected user is not an approved member of this branch', 'BadRequest');
  }

  const classMembership = await hasClassMembership(assignedUserId);
  if (!classMembership) {
    throw new ApiError(
      400,
      'Selected user must belong to a class before executive assignment',
      'BadRequest',
    );
  }

  const now = new Date();
  const startDate = input.startDate ? new Date(input.startDate) : now;
  const parsedStartDate = Number.isNaN(startDate.getTime()) ? now : startDate;

  const { modifiedCount } = await RoleAssignmentModel.updateMany(
    {
      scopeType: 'branch',
      scopeId: branchId,
      roleCode: role.code,
      ...activeAssignmentFilter(),
    },
    { $set: { endDate: now } },
  ).exec();

  await RoleAssignmentModel.create({
    userId: assignedUserId,
    roleId: role._id,
    roleCode: role.code,
    scopeType: 'branch',
    scopeId: branchId,
    startDate: parsedStartDate,
    endDate: null,
  });

  await createNotificationForUser(assignedUserId, {
    title: 'Branch executive assignment updated',
    message: `You have been assigned as ${role.name}.`,
    type: 'info',
    metadata: {
      roleCode: role.code,
      branchId,
      assignedBy: actorId,
      startDate: parsedStartDate.toISOString(),
    },
  });

  await recordAuditLog({
    actorUserId: actorId,
    action: 'branch_executive.handover_recorded',
    resourceType: 'role_assignment',
    resourceId: `${branchId}:${role.code}:${assignedUserId}`,
    scopeType: 'branch',
    scopeId: branchId,
    metadata: {
      roleId: role._id.toString(),
      roleCode: role.code,
      assignedUserId,
      replacedAssignments: modifiedCount,
      startDate: parsedStartDate.toISOString(),
    },
  });
}

