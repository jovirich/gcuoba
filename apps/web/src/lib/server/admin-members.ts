import type {
  AdminMemberDTO,
  BranchMembershipDTO,
  ClassMembershipDTO,
  PrivacyLevel,
  RoleAssignmentDTO,
  UserDTO,
} from '@gcuoba/types';
import { Types } from 'mongoose';
import { ApiError } from './api-error';
import { hasGlobalAccess, managedBranchIds, managedClassIds } from './authorization';
import {
  toBranchMembershipDto,
  toClassMembershipDto,
  toProfileDto,
  toRoleAssignmentDto,
  toUserDto,
} from './dto-mappers';
import {
  BranchMembershipModel,
  ClassModel,
  ClassMembershipModel,
  DocumentRecordModel,
  DuesInvoiceModel,
  EventParticipationModel,
  NotificationModel,
  PasswordResetTokenModel,
  PaymentModel,
  ProfileModel,
  RoleAssignmentModel,
  UserModel,
  WelfareCaseModel,
  WelfareContributionModel,
  WelfarePayoutModel,
} from './models';
import type { AccessTokenPayload } from './jwt';
import { assignAlumniNumberForClassMembership, assignAlumniNumberForUserIfClassed } from './alumni-number';
import { ensureCurrentYearDuesInvoices } from './finance';

export type AdminMemberAccessScope =
  | { kind: 'global' }
  | { kind: 'branch'; branchId: string }
  | { kind: 'class'; classId: string }
  | { kind: 'managed'; branchIds: string[]; classIds: string[] };

type ScopeType = 'global' | 'branch' | 'class';
type ClaimStatus = 'unclaimed' | 'claimed';

const DEFAULT_MEMBER_MODULE_EXCLUDED_EMAILS = [
  'visual.qa@gcuoba.local',
  'ejovi.ekakitie@hotmail.com',
] as const;

function memberModuleExcludedEmails() {
  const raw = process.env.MEMBER_MODULE_EXCLUDED_EMAILS;
  if (!raw) {
    return new Set<string>(DEFAULT_MEMBER_MODULE_EXCLUDED_EMAILS);
  }
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isExcludedFromMemberModule(email?: string | null) {
  if (!email) {
    return false;
  }
  return memberModuleExcludedEmails().has(email.trim().toLowerCase());
}

const TITLE_ALLOWLIST = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'chief']);

function normalizeRequiredString(value: unknown, fieldName: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw new ApiError(400, `${fieldName} is required`, 'BadRequest');
  }
  return normalized;
}

function normalizeOptionalString(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function normalizeOptionalNumber(value: unknown, fieldName: string, min: number, max: number) {
  if (value === null || value === undefined || `${value}`.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ApiError(400, `${fieldName} must be between ${min} and ${max}`, 'BadRequest');
  }
  return parsed;
}

function normalizeClaimStatus(value: unknown): ClaimStatus | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = `${value}`.trim().toLowerCase();
  if (normalized === 'unclaimed' || normalized === 'claimed') {
    return normalized;
  }
  throw new ApiError(400, 'claimStatus must be claimed or unclaimed', 'BadRequest');
}

function normalizePrivacyLevel(value: unknown): PrivacyLevel | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = `${value}`.trim();
  if (normalized === 'public' || normalized === 'public_to_members' || normalized === 'private') {
    return normalized;
  }
  throw new ApiError(400, 'privacyLevel is invalid', 'BadRequest');
}

function activeAssignmentFilter() {
  return {
    $or: [{ endDate: null }, { endDate: { $exists: false } }],
  };
}

function isScopeType(value: string | null | undefined): value is ScopeType {
  return value === 'global' || value === 'branch' || value === 'class';
}

function normalizeScopeId(scopeId?: string | null) {
  return scopeId?.trim() || undefined;
}

export async function resolveAdminMemberAccessScope(
  authUser: AccessTokenPayload,
  scopeTypeRaw?: string | null,
  scopeIdRaw?: string | null,
): Promise<AdminMemberAccessScope> {
  const scopeType = isScopeType(scopeTypeRaw) ? scopeTypeRaw : undefined;
  const scopeId = normalizeScopeId(scopeIdRaw);
  const global = await hasGlobalAccess(authUser.sub);

  if (global) {
    if (!scopeType || scopeType === 'global') {
      return { kind: 'global' };
    }
    if (!scopeId) {
      throw new ApiError(400, 'scopeId is required for branch/class scope', 'BadRequest');
    }
    if (scopeType === 'branch') {
      return { kind: 'branch', branchId: scopeId };
    }
    return { kind: 'class', classId: scopeId };
  }

  const [branches, classes] = await Promise.all([
    managedBranchIds(authUser.sub),
    managedClassIds(authUser.sub),
  ]);

  if (scopeType === 'global') {
    throw new ApiError(403, 'Not authorized for global scope', 'Forbidden');
  }

  if (scopeType === 'branch') {
    const branchId = scopeId ?? (branches.length === 1 ? branches[0] : null);
    if (!branchId) {
      throw new ApiError(400, 'scopeId is required for branch scope', 'BadRequest');
    }
    if (!branches.includes(branchId)) {
      throw new ApiError(403, 'Not authorized for this branch scope', 'Forbidden');
    }
    return { kind: 'branch', branchId };
  }

  if (scopeType === 'class') {
    const classId = scopeId ?? (classes.length === 1 ? classes[0] : null);
    if (!classId) {
      throw new ApiError(400, 'scopeId is required for class scope', 'BadRequest');
    }
    if (!classes.includes(classId)) {
      throw new ApiError(403, 'Not authorized for this class scope', 'Forbidden');
    }
    return { kind: 'class', classId };
  }

  if (branches.length === 0 && classes.length === 0) {
    throw new ApiError(403, 'Not authorized', 'Forbidden');
  }

  return { kind: 'managed', branchIds: branches, classIds: classes };
}

function groupByUser<T extends { userId: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.userId) ?? [];
    list.push(item);
    map.set(item.userId, list);
  }
  return map;
}

function resolveScopedUserIds(
  scope: AdminMemberAccessScope,
  branchMemberships: BranchMembershipDTO[],
  classMemberships: ClassMembershipDTO[],
): Set<string> | null {
  if (scope.kind === 'global') {
    return null;
  }

  const userIds = new Set<string>();
  if (scope.kind === 'branch') {
    branchMemberships
      .filter((membership) => membership.branchId === scope.branchId)
      .forEach((membership) => userIds.add(membership.userId));
    return userIds;
  }
  if (scope.kind === 'class') {
    classMemberships
      .filter((membership) => membership.classId === scope.classId)
      .forEach((membership) => userIds.add(membership.userId));
    return userIds;
  }

  const managedBranchIds = new Set(scope.branchIds);
  const managedClassIds = new Set(scope.classIds);
  branchMemberships
    .filter((membership) => managedBranchIds.has(membership.branchId))
    .forEach((membership) => userIds.add(membership.userId));
  classMemberships
    .filter((membership) => managedClassIds.has(membership.classId))
    .forEach((membership) => userIds.add(membership.userId));
  return userIds;
}

function isMemberInScope(member: AdminMemberDTO, scope: AdminMemberAccessScope): boolean {
  if (scope.kind === 'global') {
    return true;
  }
  if (scope.kind === 'class') {
    return member.classMembership?.classId === scope.classId;
  }
  if (scope.kind === 'branch') {
    return member.branchMemberships.some((membership) => membership.branchId === scope.branchId);
  }

  const managedBranchIds = new Set(scope.branchIds);
  const managedClassIds = new Set(scope.classIds);
  const classInScope = managedClassIds.has(member.classMembership?.classId ?? '');
  const branchInScope = member.branchMemberships.some((membership) =>
    managedBranchIds.has(membership.branchId),
  );
  return classInScope || branchInScope;
}

function applyScopeToMemberPayload(member: AdminMemberDTO, scope: AdminMemberAccessScope): AdminMemberDTO {
  if (scope.kind === 'global') {
    return member;
  }

  if (scope.kind === 'branch') {
    return {
      ...member,
      branchMemberships: member.branchMemberships.filter(
        (membership) => membership.branchId === scope.branchId,
      ),
      roleAssignments: member.roleAssignments.filter(
        (assignment) =>
          assignment.scopeType === 'global' ||
          (assignment.scopeType === 'branch' && assignment.scopeId === scope.branchId),
      ),
    };
  }

  if (scope.kind === 'class') {
    return {
      ...member,
      classMembership: member.classMembership?.classId === scope.classId ? member.classMembership : null,
      roleAssignments: member.roleAssignments.filter(
        (assignment) =>
          assignment.scopeType === 'global' ||
          (assignment.scopeType === 'class' && assignment.scopeId === scope.classId),
      ),
    };
  }

  const managedBranchIds = new Set(scope.branchIds);
  const managedClassIds = new Set(scope.classIds);
  return {
    ...member,
    branchMemberships: member.branchMemberships.filter((membership) =>
      managedBranchIds.has(membership.branchId),
    ),
    classMembership: managedClassIds.has(member.classMembership?.classId ?? '')
      ? member.classMembership
      : null,
    roleAssignments: member.roleAssignments.filter((assignment) => {
      if (assignment.scopeType === 'global') {
        return true;
      }
      if (assignment.scopeType === 'branch') {
        return managedBranchIds.has(assignment.scopeId ?? '');
      }
      if (assignment.scopeType === 'class') {
        return managedClassIds.has(assignment.scopeId ?? '');
      }
      return false;
    }),
  };
}

async function ensureMemberInScope(userId: string, scope: AdminMemberAccessScope) {
  if (scope.kind === 'global') {
    return;
  }

  const [classMembershipDoc, branchMembershipDocs] = await Promise.all([
    ClassMembershipModel.findOne({ userId }).lean().exec(),
    BranchMembershipModel.find({ userId }).lean().exec(),
  ]);

  const member: AdminMemberDTO = {
    user: { id: userId, name: '', email: '', phone: null, status: 'active' },
    profile: null,
    classMembership: classMembershipDoc ? toClassMembershipDto(classMembershipDoc) : null,
    branchMemberships: branchMembershipDocs.map((doc) => toBranchMembershipDto(doc)),
    roleAssignments: [],
  };
  if (!isMemberInScope(member, scope)) {
    throw new ApiError(403, 'Not authorized for this member', 'Forbidden');
  }
}

function ensureClassChangeAllowed(scope: AdminMemberAccessScope, classId: string) {
  if (scope.kind === 'global') {
    return;
  }
  if (scope.kind === 'branch') {
    throw new ApiError(403, 'Class updates require class or global scope', 'Forbidden');
  }
  if (scope.kind === 'class' && scope.classId !== classId) {
    throw new ApiError(403, 'Not authorized to assign outside your class scope', 'Forbidden');
  }
  if (scope.kind === 'managed' && !scope.classIds.includes(classId)) {
    throw new ApiError(403, 'Not authorized to assign outside your class scope', 'Forbidden');
  }
}

function buildMemberPayload(
  user: UserDTO,
  profileMap: Map<string, AdminMemberDTO['profile']>,
  branchMap: Map<string, BranchMembershipDTO[]>,
  classMap: Map<string, ClassMembershipDTO>,
  assignmentMap: Map<string, RoleAssignmentDTO[]>,
): AdminMemberDTO {
  return {
    user,
    profile: profileMap.get(user.id) ?? null,
    classMembership: classMap.get(user.id) ?? null,
    branchMemberships: branchMap.get(user.id) ?? [],
    roleAssignments: assignmentMap.get(user.id) ?? [],
  };
}

export async function listAdminMembers(
  scope: AdminMemberAccessScope,
  options?: { excludeSystemAccounts?: boolean },
): Promise<AdminMemberDTO[]> {
  const [branchDocs, classDocs, assignmentDocs] = await Promise.all([
    BranchMembershipModel.find().lean().exec(),
    ClassMembershipModel.find().lean().exec(),
    RoleAssignmentModel.find(activeAssignmentFilter()).lean().exec(),
  ]);

  const branchMemberships = branchDocs.map((doc) => toBranchMembershipDto(doc));
  const classMemberships = classDocs.map((doc) => toClassMembershipDto(doc));
  const assignments = assignmentDocs.map((doc) => toRoleAssignmentDto(doc));

  const scopedUserIds = resolveScopedUserIds(scope, branchMemberships, classMemberships);
  if (scopedUserIds && scopedUserIds.size === 0) {
    return [];
  }

  const usersDocs = scopedUserIds
    ? await UserModel.find({
        _id: { $in: Array.from(scopedUserIds).filter((id) => Types.ObjectId.isValid(id)) },
      })
        .select('name email phone status claimStatus claimedAt')
        .exec()
    : await UserModel.find().select('name email phone status claimStatus claimedAt').exec();

  const scopedUsersDocs =
    options?.excludeSystemAccounts
      ? usersDocs.filter((doc) => !isExcludedFromMemberModule(doc.email))
      : usersDocs;

  const users = scopedUsersDocs.map((doc) => toUserDto(doc));
  const userIds = users.map((user) => user.id);

  const profileDocs = userIds.length
    ? await ProfileModel.find({ userId: { $in: userIds } }).lean().exec()
    : [];
  const profileMap = new Map(profileDocs.map((doc) => [doc.userId, toProfileDto(doc)]));

  const branchMap = groupByUser(branchMemberships);
  const classMap = new Map(classMemberships.map((membership) => [membership.userId, membership]));
  const assignmentMap = groupByUser(assignments);

  return users
    .map((user) => buildMemberPayload(user, profileMap, branchMap, classMap, assignmentMap))
    .map((member) => applyScopeToMemberPayload(member, scope))
    .sort((a, b) => a.user.name.localeCompare(b.user.name));
}

export async function findAdminMember(
  userId: string,
  scope: AdminMemberAccessScope,
  options?: { excludeSystemAccounts?: boolean },
): Promise<AdminMemberDTO> {
  const user = await UserModel.findById(userId).select('name email phone status claimStatus claimedAt').exec();
  if (!user) {
    throw new ApiError(404, 'User not found', 'NotFound');
  }
  if (options?.excludeSystemAccounts && isExcludedFromMemberModule(user.email)) {
    throw new ApiError(404, 'User not found', 'NotFound');
  }

  const [profileDoc, branchDocs, classDoc, assignmentDocs] = await Promise.all([
    ProfileModel.findOne({ userId }).lean().exec(),
    BranchMembershipModel.find({ userId }).lean().exec(),
    ClassMembershipModel.findOne({ userId }).lean().exec(),
    RoleAssignmentModel.find({ userId, ...activeAssignmentFilter() }).lean().exec(),
  ]);

  const payload: AdminMemberDTO = {
    user: toUserDto(user),
    profile: profileDoc ? toProfileDto(profileDoc) : null,
    classMembership: classDoc ? toClassMembershipDto(classDoc) : null,
    branchMemberships: branchDocs.map((doc) => toBranchMembershipDto(doc)),
    roleAssignments: assignmentDocs.map((doc) => toRoleAssignmentDto(doc)),
  };

  if (!isMemberInScope(payload, scope)) {
    throw new ApiError(403, 'Not authorized for this member', 'Forbidden');
  }

  return applyScopeToMemberPayload(payload, scope);
}

type AdminMemberProfileUpdateInput = {
  title?: string | null;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  email?: string;
  phone?: string | null;
  claimStatus?: ClaimStatus | null;
  dobDay?: number | string | null;
  dobMonth?: number | string | null;
  dobYear?: number | string | null;
  sex?: string | null;
  stateOfOrigin?: string | null;
  lgaOfOrigin?: string | null;
  occupation?: string | null;
  houseId?: string | null;
  privacyLevel?: PrivacyLevel | null;
};

export async function updateAdminMemberProfile(
  userId: string,
  scope: AdminMemberAccessScope,
  input: AdminMemberProfileUpdateInput,
  options?: { excludeSystemAccounts?: boolean },
): Promise<AdminMemberDTO> {
  await ensureMemberInScope(userId, scope);

  const [user, existingProfile] = await Promise.all([
    UserModel.findById(userId).exec(),
    ProfileModel.findOne({ userId }).exec(),
  ]);
  if (!user) {
    throw new ApiError(404, 'User not found', 'NotFound');
  }
  if (options?.excludeSystemAccounts && isExcludedFromMemberModule(user.email)) {
    throw new ApiError(404, 'User not found', 'NotFound');
  }

  const firstName = normalizeRequiredString(input.firstName, 'firstName');
  const lastName = normalizeRequiredString(input.lastName, 'lastName');
  const middleName = normalizeOptionalString(input.middleName);
  const titleRaw = normalizeOptionalString(input.title)?.toLowerCase() ?? null;
  if (titleRaw && !TITLE_ALLOWLIST.has(titleRaw)) {
    throw new ApiError(400, 'title is invalid', 'BadRequest');
  }

  const email = normalizeRequiredString(input.email, 'email').toLowerCase();
  if (!email.includes('@')) {
    throw new ApiError(400, 'email is invalid', 'BadRequest');
  }
  const phone = normalizeOptionalString(input.phone);

  const [emailConflict, phoneConflict] = await Promise.all([
    UserModel.findOne({ email, _id: { $ne: userId } }).select('_id').lean<{ _id: unknown }>().exec(),
    phone
      ? UserModel.findOne({ phone, _id: { $ne: userId } }).select('_id').lean<{ _id: unknown }>().exec()
      : Promise.resolve(null),
  ]);
  if (emailConflict) {
    throw new ApiError(400, 'This email is already in use by another member.', 'BadRequest');
  }
  if (phoneConflict) {
    throw new ApiError(400, 'This phone number is already in use by another member.', 'BadRequest');
  }

  const claimStatus = normalizeClaimStatus(input.claimStatus);
  if (input.claimStatus === null) {
    user.claimStatus = undefined;
    user.claimedAt = null;
  } else if (claimStatus) {
    user.claimStatus = claimStatus;
    user.claimedAt = claimStatus === 'claimed' ? user.claimedAt ?? new Date() : null;
  }

  user.name = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
  user.email = email;
  user.phone = phone;
  await user.save();

  const dobDay = normalizeOptionalNumber(input.dobDay, 'dobDay', 1, 31);
  const dobMonth = normalizeOptionalNumber(input.dobMonth, 'dobMonth', 1, 12);
  const dobYear = normalizeOptionalNumber(input.dobYear, 'dobYear', 1900, 2100);
  const privacyLevel = normalizePrivacyLevel(input.privacyLevel) ?? existingProfile?.privacyLevel ?? 'public_to_members';

  await ProfileModel.findOneAndUpdate(
    { userId },
    {
      userId,
      title: titleRaw,
      firstName,
      middleName,
      lastName,
      dobDay,
      dobMonth,
      dobYear,
      sex: normalizeOptionalString(input.sex),
      stateOfOrigin: normalizeOptionalString(input.stateOfOrigin),
      lgaOfOrigin: normalizeOptionalString(input.lgaOfOrigin),
      occupation: normalizeOptionalString(input.occupation),
      houseId: normalizeOptionalString(input.houseId),
      privacyLevel,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).exec();

  return findAdminMember(userId, scope, options);
}

type DeleteAdminMemberResult = {
  success: true;
  userId: string;
};

export async function deleteAdminMember(
  userId: string,
  scope: AdminMemberAccessScope,
  options?: { excludeSystemAccounts?: boolean },
): Promise<DeleteAdminMemberResult> {
  await ensureMemberInScope(userId, scope);

  const user = await UserModel.findById(userId).select('email claimStatus').exec();
  if (!user) {
    throw new ApiError(404, 'User not found', 'NotFound');
  }
  if (options?.excludeSystemAccounts && isExcludedFromMemberModule(user.email)) {
    throw new ApiError(404, 'User not found', 'NotFound');
  }
  if (user.claimStatus !== 'unclaimed') {
    throw new ApiError(
      400,
      'Only imported members that are still unclaimed can be deleted.',
      'BadRequest',
    );
  }

  const [
    hasDuesInvoices,
    hasPayments,
    hasWelfareContributions,
    hasWelfarePayouts,
    hasWelfareCases,
    hasEventParticipations,
    hasDocuments,
  ] = await Promise.all([
    DuesInvoiceModel.exists({ userId }),
    PaymentModel.exists({ payerUserId: userId }),
    WelfareContributionModel.exists({ userId }),
    WelfarePayoutModel.exists({ beneficiaryUserId: userId }),
    WelfareCaseModel.exists({ beneficiaryUserId: userId }),
    EventParticipationModel.exists({ userId }),
    DocumentRecordModel.exists({ ownerUserId: userId }),
  ]);

  if (
    hasDuesInvoices ||
    hasPayments ||
    hasWelfareContributions ||
    hasWelfarePayouts ||
    hasWelfareCases ||
    hasEventParticipations ||
    hasDocuments
  ) {
    throw new ApiError(
      400,
      'This unclaimed member has financial or activity records and cannot be deleted.',
      'BadRequest',
    );
  }

  const email = user.email?.toLowerCase() ?? null;
  await Promise.all([
    ProfileModel.deleteOne({ userId }).exec(),
    ClassMembershipModel.deleteOne({ userId }).exec(),
    BranchMembershipModel.deleteMany({ userId }).exec(),
    RoleAssignmentModel.deleteMany({ userId }).exec(),
    NotificationModel.deleteMany({ userId }).exec(),
    EventParticipationModel.deleteMany({ userId }).exec(),
    DocumentRecordModel.deleteMany({ ownerUserId: userId }).exec(),
    email ? PasswordResetTokenModel.deleteMany({ email }).exec() : Promise.resolve(),
  ]);

  await UserModel.deleteOne({ _id: userId }).exec();
  return { success: true, userId };
}

export async function updateAdminMemberStatus(
  userId: string,
  status: 'pending' | 'active' | 'suspended',
  scope: AdminMemberAccessScope,
): Promise<UserDTO> {
  await ensureMemberInScope(userId, scope);

  const user = await UserModel.findByIdAndUpdate(userId, { status }, { new: true })
    .select('name email phone status claimStatus claimedAt')
    .exec();
  if (!user) {
    throw new ApiError(404, 'User not found', 'NotFound');
  }
  if (status === 'active') {
    await assignAlumniNumberForUserIfClassed(userId);
    await ensureCurrentYearDuesInvoices({ userId });
  }
  return toUserDto(user);
}

function resolveClaimActivationClassId(scope: AdminMemberAccessScope, classIdRaw?: string | null) {
  if (scope.kind === 'branch') {
    throw new ApiError(403, 'Class member activation is not available in branch scope', 'Forbidden');
  }
  if (scope.kind === 'class') {
    return scope.classId;
  }
  const classId = classIdRaw?.trim() || null;
  if (!classId) {
    throw new ApiError(400, 'classId is required for this scope', 'BadRequest');
  }
  if (scope.kind === 'managed' && !scope.classIds.includes(classId)) {
    throw new ApiError(403, 'Not authorized for this class scope', 'Forbidden');
  }
  return classId;
}

export async function activatePendingClassMembersAsUnclaimed(
  scope: AdminMemberAccessScope,
  classIdRaw?: string | null,
): Promise<{
  classId: string;
  classLabel: string;
  classYear: number;
  totalClassMembers: number;
  pendingFound: number;
  activated: number;
}> {
  const classId = resolveClaimActivationClassId(scope, classIdRaw);
  const classDoc = await ClassModel.findById(classId)
    .select('label entryYear')
    .lean<{ label?: string; entryYear?: number }>()
    .exec();
  if (!classDoc?.label || !classDoc.entryYear) {
    throw new ApiError(404, 'Class not found', 'NotFound');
  }

  const classMemberships = await ClassMembershipModel.find({ classId })
    .select('userId')
    .lean<Array<{ userId: string }>>()
    .exec();
  const classUserIds = classMemberships
    .map((entry) => entry.userId)
    .filter((entry): entry is string => Boolean(entry) && Types.ObjectId.isValid(entry));
  if (classUserIds.length === 0) {
    return {
      classId,
      classLabel: classDoc.label,
      classYear: classDoc.entryYear,
      totalClassMembers: 0,
      pendingFound: 0,
      activated: 0,
    };
  }

  const users = await UserModel.find({ _id: { $in: classUserIds } })
    .select('_id status')
    .lean<Array<{ _id: Types.ObjectId; status: 'pending' | 'active' | 'suspended' }>>()
    .exec();
  const pendingUserIds = users
    .filter((entry) => entry.status === 'pending')
    .map((entry) => entry._id.toString());

  if (pendingUserIds.length === 0) {
    return {
      classId,
      classLabel: classDoc.label,
      classYear: classDoc.entryYear,
      totalClassMembers: classUserIds.length,
      pendingFound: 0,
      activated: 0,
    };
  }

  await UserModel.updateMany(
    { _id: { $in: pendingUserIds } },
    { $set: { status: 'active', claimStatus: 'unclaimed', claimedAt: null } },
  ).exec();

  const approvedBranchMemberships = await BranchMembershipModel.find({
    userId: { $in: pendingUserIds },
    status: 'approved',
  })
    .select('userId branchId')
    .lean<Array<{ userId: string; branchId: string }>>()
    .exec();
  const branchMembershipsByUser = new Map<string, string[]>();
  approvedBranchMemberships.forEach((entry) => {
    const list = branchMembershipsByUser.get(entry.userId) ?? [];
    list.push(entry.branchId);
    branchMembershipsByUser.set(entry.userId, list);
  });

  for (const userId of pendingUserIds) {
    await assignAlumniNumberForClassMembership(userId, classId);
    await ensureCurrentYearDuesInvoices({ userId, scopeType: 'class', scopeId: classId });
    const branchIds = branchMembershipsByUser.get(userId) ?? [];
    for (const branchId of branchIds) {
      await ensureCurrentYearDuesInvoices({ userId, scopeType: 'branch', scopeId: branchId });
    }
  }

  return {
    classId,
    classLabel: classDoc.label,
    classYear: classDoc.entryYear,
    totalClassMembers: classUserIds.length,
    pendingFound: pendingUserIds.length,
    activated: pendingUserIds.length,
  };
}

export async function changeAdminMemberClass(
  userId: string,
  classId: string,
  scope: AdminMemberAccessScope,
): Promise<ClassMembershipDTO> {
  ensureClassChangeAllowed(scope, classId);
  await ensureMemberInScope(userId, scope);

  const previousMembership = await ClassMembershipModel.findOne({ userId })
    .select('classId')
    .lean<{ classId?: string }>()
    .exec();
  const previousClassId = previousMembership?.classId ?? null;

  const doc = await ClassMembershipModel.findOneAndUpdate(
    { userId },
    { userId, classId, joinedAt: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
    .lean()
    .exec();

  if (!doc) {
    throw new ApiError(500, 'Unable to update class membership', 'InternalServerError');
  }

  if (previousClassId && previousClassId !== classId) {
    await syncClassScopedRoleAssignments(userId, previousClassId, classId);
  }

  await assignAlumniNumberForClassMembership(userId, classId);
  await ensureCurrentYearDuesInvoices({ userId, scopeType: 'class', scopeId: classId });

  return toClassMembershipDto(doc);
}

export async function rejectAdminMemberClass(
  userId: string,
  scope: AdminMemberAccessScope,
): Promise<{ success: true; classId: string | null }> {
  await ensureMemberInScope(userId, scope);
  const existing = await ClassMembershipModel.findOne({ userId }).select('classId').exec();
  if (!existing?.classId) {
    throw new ApiError(404, 'Class membership not found', 'NotFound');
  }
  const classId = existing.classId;
  ensureClassChangeAllowed(scope, classId);
  await ClassMembershipModel.deleteOne({ userId }).exec();
  await RoleAssignmentModel.updateMany(
    {
      userId,
      scopeType: 'class',
      scopeId: classId,
      ...activeAssignmentFilter(),
    },
    { $set: { endDate: new Date() } },
  ).exec();
  return { success: true, classId };
}

async function syncClassScopedRoleAssignments(userId: string, previousClassId: string, nextClassId: string) {
  const activeAssignments = await RoleAssignmentModel.find({
    userId,
    scopeType: 'class',
    scopeId: previousClassId,
    ...activeAssignmentFilter(),
  }).exec();

  if (activeAssignments.length === 0) {
    return;
  }

  const now = new Date();
  for (const assignment of activeAssignments) {
    const duplicateAtTarget = await RoleAssignmentModel.findOne({
      userId,
      roleCode: assignment.roleCode,
      scopeType: 'class',
      scopeId: nextClassId,
      ...activeAssignmentFilter(),
    }).exec();

    if (duplicateAtTarget) {
      assignment.endDate = now;
      await assignment.save();
      continue;
    }

    assignment.scopeId = nextClassId;
    await assignment.save();
  }
}

function ensureBranchMembershipChangeAllowed(scope: AdminMemberAccessScope, branchId: string) {
  if (scope.kind === 'global') {
    return;
  }
  if (scope.kind === 'class') {
    throw new ApiError(403, 'Branch updates require branch or global scope', 'Forbidden');
  }
  if (scope.kind === 'branch' && scope.branchId !== branchId) {
    throw new ApiError(403, 'Not authorized to assign outside your branch scope', 'Forbidden');
  }
  if (scope.kind === 'managed' && !scope.branchIds.includes(branchId)) {
    throw new ApiError(403, 'Not authorized to assign outside your branch scope', 'Forbidden');
  }
}

export async function addAdminMemberBranchMembership(
  actorUserId: string,
  userId: string,
  branchId: string,
  scope: AdminMemberAccessScope,
  note?: string | null,
): Promise<BranchMembershipDTO> {
  ensureBranchMembershipChangeAllowed(scope, branchId);
  await ensureMemberInScope(userId, scope);

  const now = new Date();
  const doc = await BranchMembershipModel.findOneAndUpdate(
    { userId, branchId },
    {
      userId,
      branchId,
      status: 'approved',
      requestedAt: now,
      approvedBy: actorUserId,
      approvedAt: now,
      endedAt: null,
      note: note?.trim() || null,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
    .lean()
    .exec();

  if (!doc) {
    throw new ApiError(500, 'Unable to add branch membership', 'InternalServerError');
  }
  await ensureCurrentYearDuesInvoices({ userId, scopeType: 'branch', scopeId: branchId });
  return toBranchMembershipDto(doc);
}

export async function endAdminMemberBranchMembership(
  userId: string,
  branchId: string,
  scope: AdminMemberAccessScope,
): Promise<BranchMembershipDTO> {
  ensureBranchMembershipChangeAllowed(scope, branchId);
  await ensureMemberInScope(userId, scope);

  const membership = await BranchMembershipModel.findOne({ userId, branchId }).exec();
  if (!membership) {
    throw new ApiError(404, 'Branch membership not found', 'NotFound');
  }

  membership.status = 'ended';
  membership.endedAt = new Date();
  await membership.save();

  return toBranchMembershipDto(membership);
}
