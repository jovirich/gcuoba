import type {
  WelfareCaseDTO,
  WelfareCaseDetailDTO,
  WelfareCategoryDTO,
  WelfareContributionDTO,
  WelfarePayoutDTO,
  WelfareQueueItemDTO,
} from '@gcuoba/types';
import { Types } from 'mongoose';
import { ApiError } from './api-error';
import { hasGlobalAccess, managedBranchIds, managedClassIds } from './authorization';
import { recordAuditLog } from './audit-logs';
import {
  BranchMembershipModel,
  BranchModel,
  ClassMembershipModel,
  ClassModel,
  UserModel,
  WelfareCaseModel,
  WelfareCategoryModel,
  WelfareContributionModel,
  WelfarePayoutModel,
  type WelfareCaseDoc,
  type WelfareContributionDoc,
  type WelfarePayoutDoc,
} from './models';
import { createNotificationForUser } from './notifications';

type WelfareScopeType = 'global' | 'branch' | 'class';
type WelfareQueueStatus = 'pending' | 'approved' | 'rejected';

function toCategory(doc: {
  _id: Types.ObjectId;
  name: string;
  scope_type: WelfareScopeType;
  scope_id?: string | null;
  status: 'active' | 'inactive';
}): WelfareCategoryDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    scopeType: doc.scope_type,
    scopeId: doc.scope_id ?? null,
    status: doc.status,
  };
}

function toCase(doc: WelfareCaseDoc): WelfareCaseDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    categoryId: doc.categoryId,
    scopeType: doc.scopeType,
    scopeId: doc.scopeId ?? null,
    targetAmount: doc.targetAmount ?? 0,
    currency: doc.currency ?? 'NGN',
    status: doc.status ?? 'open',
    totalRaised: doc.totalRaised ?? 0,
    totalDisbursed: doc.totalDisbursed ?? 0,
    beneficiaryName: doc.beneficiaryName ?? undefined,
    beneficiaryUserId: doc.beneficiaryUserId ?? undefined,
  };
}

function toContribution(doc: WelfareContributionDoc): WelfareContributionDTO {
  return {
    id: doc._id.toString(),
    caseId: doc.caseId,
    contributorName: doc.contributorName,
    contributorEmail: doc.contributorEmail ?? undefined,
    contributorUserId: doc.userId ?? undefined,
    amount: doc.amount,
    currency: doc.currency ?? 'NGN',
    notes: doc.notes ?? undefined,
    paidAt: doc.paidAt?.toISOString(),
    status: doc.status ?? 'pending',
    reviewedBy: doc.reviewedBy ?? null,
    reviewedAt: doc.reviewedAt?.toISOString() ?? null,
    reviewNote: doc.reviewNote ?? null,
  };
}

function toPayout(doc: WelfarePayoutDoc): WelfarePayoutDTO {
  return {
    id: doc._id.toString(),
    caseId: doc.caseId,
    beneficiaryUserId: doc.beneficiaryUserId ?? undefined,
    amount: doc.amount,
    currency: doc.currency ?? 'NGN',
    channel: doc.channel,
    reference: doc.reference ?? undefined,
    notes: doc.notes ?? undefined,
    disbursedAt: doc.disbursedAt?.toISOString(),
    status: doc.status ?? 'pending',
    reviewedBy: doc.reviewedBy ?? null,
    reviewedAt: doc.reviewedAt?.toISOString() ?? null,
    reviewNote: doc.reviewNote ?? null,
  };
}

async function resolveReadableScopeAccess(actorId: string) {
  const [global, managedBranches, managedClasses, branchMemberships, classMembership] = await Promise.all([
    hasGlobalAccess(actorId),
    managedBranchIds(actorId),
    managedClassIds(actorId),
    BranchMembershipModel.find({ userId: actorId }).lean<Array<{ branchId: string; status: string }>>().exec(),
    ClassMembershipModel.findOne({ userId: actorId }).select('classId').lean<{ classId?: string }>().exec(),
  ]);

  const readableBranchIds = new Set(managedBranches);
  branchMemberships
    .filter((membership) => membership.status === 'approved')
    .forEach((membership) => readableBranchIds.add(membership.branchId));

  const readableClassIds = new Set(managedClasses);
  if (classMembership?.classId) {
    readableClassIds.add(classMembership.classId);
  }

  return {
    hasGlobalAccess: global,
    readableBranchIds: Array.from(readableBranchIds),
    readableClassIds: Array.from(readableClassIds),
  };
}

async function ensureScopeExists(scopeType: WelfareScopeType, scopeId: string | null) {
  if (scopeType === 'global') {
    return;
  }
  if (!scopeId) {
    throw new ApiError(400, `scopeId is required for ${scopeType} scope`, 'BadRequest');
  }

  if (scopeType === 'branch') {
    const exists = await BranchModel.exists({ _id: scopeId });
    if (!exists) {
      throw new ApiError(400, 'Branch scope not found', 'BadRequest');
    }
    return;
  }

  const exists = await ClassModel.exists({ _id: scopeId });
  if (!exists) {
    throw new ApiError(400, 'Class scope not found', 'BadRequest');
  }
}

async function ensureScopeManagement(actorId: string, scopeType: WelfareScopeType, scopeId: string | null) {
  if (await hasGlobalAccess(actorId)) {
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

async function ensureCanViewCase(actorId: string, welfareCase: WelfareCaseDoc) {
  if (await hasGlobalAccess(actorId)) {
    return;
  }

  if (welfareCase.scopeType === 'global') {
    return;
  }

  const [managedBranches, managedClasses] = await Promise.all([
    managedBranchIds(actorId),
    managedClassIds(actorId),
  ]);
  const scopeId = welfareCase.scopeId ?? null;

  if (welfareCase.scopeType === 'branch' && scopeId) {
    if (managedBranches.includes(scopeId)) {
      return;
    }
    const memberships = await BranchMembershipModel.find({
      userId: actorId,
      branchId: scopeId,
      status: 'approved',
    })
      .select('_id')
      .lean<Array<{ _id: Types.ObjectId }>>()
      .exec();
    if (memberships.length > 0) {
      return;
    }
    throw new ApiError(403, 'Not authorized for this welfare case', 'Forbidden');
  }

  if (welfareCase.scopeType === 'class' && scopeId) {
    if (managedClasses.includes(scopeId)) {
      return;
    }
    const classMembership = await ClassMembershipModel.findOne({ userId: actorId })
      .select('classId')
      .lean<{ classId?: string }>()
      .exec();
    if (classMembership?.classId === scopeId) {
      return;
    }
    throw new ApiError(403, 'Not authorized for this welfare case', 'Forbidden');
  }
}

async function ensureCaseManagement(actorId: string, welfareCase: WelfareCaseDoc) {
  await ensureScopeManagement(actorId, welfareCase.scopeType, welfareCase.scopeId ?? null);
}

async function refreshCaseTotals(caseId: string) {
  const [caseRecord, approvedContributions, approvedPayouts] = await Promise.all([
    WelfareCaseModel.findById(caseId).exec(),
    WelfareContributionModel.find({
      caseId,
      $or: [{ status: 'approved' }, { status: { $exists: false } }],
    })
      .select('amount')
      .lean<Array<{ amount: number }>>()
      .exec(),
    WelfarePayoutModel.find({
      caseId,
      $or: [{ status: 'approved' }, { status: { $exists: false } }],
    })
      .select('amount')
      .lean<Array<{ amount: number }>>()
      .exec(),
  ]);

  if (!caseRecord) {
    return;
  }

  const totalRaised = approvedContributions.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const totalDisbursed = approvedPayouts.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  caseRecord.totalRaised = Number(totalRaised.toFixed(2));
  caseRecord.totalDisbursed = Number(totalDisbursed.toFixed(2));

  if ((caseRecord.targetAmount ?? 0) > 0 && caseRecord.totalDisbursed >= caseRecord.targetAmount) {
    caseRecord.status = 'closed';
  }
  await caseRecord.save();
}

function createdAtIso(row: WelfareContributionDoc | WelfarePayoutDoc): string | undefined {
  const createdAt = (row as (WelfareContributionDoc | WelfarePayoutDoc) & { createdAt?: Date }).createdAt;
  return createdAt?.toISOString();
}

export async function listWelfareCategories(
  actorId: string,
  scopeType?: WelfareScopeType,
  scopeId?: string,
): Promise<WelfareCategoryDTO[]> {
  const access = await resolveReadableScopeAccess(actorId);
  const query: Record<string, unknown> = { status: 'active' };

  if (access.hasGlobalAccess) {
    if (!scopeType) {
      const docs = await WelfareCategoryModel.find(query).sort({ name: 1 }).lean().exec();
      return docs.map((doc) => toCategory(doc));
    }

    if (scopeType === 'global') {
      query.scope_type = 'global';
    } else if (scopeId) {
      query.$or = [
        { scope_type: 'global', scope_id: null },
        { scope_type: scopeType, scope_id: scopeId },
      ];
    } else {
      query.scope_type = scopeType;
    }

    const docs = await WelfareCategoryModel.find(query).sort({ name: 1 }).lean().exec();
    return docs.map((doc) => toCategory(doc));
  }

  if (scopeType === 'global') {
    query.scope_type = 'global';
  } else if (scopeType === 'branch') {
    if (!scopeId) {
      throw new ApiError(400, 'scopeId is required for branch scope', 'BadRequest');
    }
    if (!access.readableBranchIds.includes(scopeId)) {
      throw new ApiError(403, 'Not authorized for this branch scope', 'Forbidden');
    }
    query.$or = [
      { scope_type: 'global', scope_id: null },
      { scope_type: 'branch', scope_id: scopeId },
    ];
  } else if (scopeType === 'class') {
    if (!scopeId) {
      throw new ApiError(400, 'scopeId is required for class scope', 'BadRequest');
    }
    if (!access.readableClassIds.includes(scopeId)) {
      throw new ApiError(403, 'Not authorized for this class scope', 'Forbidden');
    }
    query.$or = [
      { scope_type: 'global', scope_id: null },
      { scope_type: 'class', scope_id: scopeId },
    ];
  } else {
    query.$or = [
      { scope_type: 'global' },
      ...(access.readableBranchIds.length > 0
        ? [{ scope_type: 'branch', scope_id: { $in: access.readableBranchIds } }]
        : []),
      ...(access.readableClassIds.length > 0
        ? [{ scope_type: 'class', scope_id: { $in: access.readableClassIds } }]
        : []),
    ];
  }

  const docs = await WelfareCategoryModel.find(query).sort({ name: 1 }).lean().exec();
  return docs.map((doc) => toCategory(doc));
}

export async function listWelfareCases(
  actorId: string,
  scopeType?: WelfareScopeType,
  scopeId?: string,
  includeClosed = false,
): Promise<WelfareCaseDTO[]> {
  const access = await resolveReadableScopeAccess(actorId);
  const query: Record<string, unknown> = {};
  if (!includeClosed) {
    query.status = 'open';
  }

  if (access.hasGlobalAccess) {
    if (!scopeType) {
      const docs = await WelfareCaseModel.find(query).sort({ createdAt: -1 }).exec();
      return docs.map((doc) => toCase(doc));
    }

    query.scopeType = scopeType;
    if (scopeType !== 'global' && scopeId) {
      query.scopeId = scopeId;
    }
    const docs = await WelfareCaseModel.find(query).sort({ createdAt: -1 }).exec();
    return docs.map((doc) => toCase(doc));
  }

  if (scopeType === 'global') {
    query.scopeType = 'global';
  } else if (scopeType === 'branch') {
    if (!scopeId) {
      throw new ApiError(400, 'scopeId is required for branch scope', 'BadRequest');
    }
    if (!access.readableBranchIds.includes(scopeId)) {
      throw new ApiError(403, 'Not authorized for this branch scope', 'Forbidden');
    }
    query.scopeType = 'branch';
    query.scopeId = scopeId;
  } else if (scopeType === 'class') {
    if (!scopeId) {
      throw new ApiError(400, 'scopeId is required for class scope', 'BadRequest');
    }
    if (!access.readableClassIds.includes(scopeId)) {
      throw new ApiError(403, 'Not authorized for this class scope', 'Forbidden');
    }
    query.scopeType = 'class';
    query.scopeId = scopeId;
  } else {
    query.$or = [
      { scopeType: 'global' },
      ...(access.readableBranchIds.length > 0
        ? [{ scopeType: 'branch', scopeId: { $in: access.readableBranchIds } }]
        : []),
      ...(access.readableClassIds.length > 0
        ? [{ scopeType: 'class', scopeId: { $in: access.readableClassIds } }]
        : []),
    ];
  }

  const docs = await WelfareCaseModel.find(query).sort({ createdAt: -1 }).exec();
  return docs.map((doc) => toCase(doc));
}

export async function createWelfareCase(
  actorId: string,
  payload: {
    title?: string;
    description?: string;
    categoryId?: string;
    scopeType?: WelfareScopeType;
    scopeId?: string;
    targetAmount?: number;
    currency?: string;
    beneficiaryName?: string;
    beneficiaryUserId?: string;
  },
): Promise<WelfareCaseDTO> {
  const title = payload.title?.trim();
  const description = payload.description?.trim();
  const categoryId = payload.categoryId?.trim();
  const scopeType = payload.scopeType;
  const scopeId = scopeType === 'global' ? null : payload.scopeId?.trim() || null;

  if (!title || !description || !categoryId || !scopeType) {
    throw new ApiError(400, 'Missing required fields', 'BadRequest');
  }
  if (scopeType !== 'global' && scopeType !== 'branch' && scopeType !== 'class') {
    throw new ApiError(400, 'Invalid scopeType', 'BadRequest');
  }

  await ensureScopeExists(scopeType, scopeId);
  await ensureScopeManagement(actorId, scopeType, scopeId);

  if (!Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(400, 'Invalid welfare category', 'BadRequest');
  }
  const category = await WelfareCategoryModel.findById(categoryId).exec();
  if (!category || category.status !== 'active') {
    throw new ApiError(400, 'Invalid welfare category', 'BadRequest');
  }

  const scopeMatches =
    category.scope_type === 'global' ||
    (category.scope_type === scopeType && (category.scope_id ?? null) === (scopeId ?? null));
  if (!scopeMatches) {
    throw new ApiError(400, 'Category does not match selected case scope', 'BadRequest');
  }

  const beneficiaryUserId = payload.beneficiaryUserId?.trim() || null;
  if (beneficiaryUserId) {
    const user = await UserModel.exists({ _id: beneficiaryUserId });
    if (!user) {
      throw new ApiError(400, 'Beneficiary user not found', 'BadRequest');
    }
  }

  const record = await WelfareCaseModel.create({
    title,
    description,
    categoryId,
    scopeType,
    scopeId: scopeType === 'global' ? null : scopeId,
    targetAmount: payload.targetAmount ?? 0,
    currency: payload.currency?.trim().toUpperCase() || 'NGN',
    beneficiaryName: payload.beneficiaryName?.trim() || null,
    beneficiaryUserId,
    status: 'open',
    totalRaised: 0,
    totalDisbursed: 0,
  });

  await recordAuditLog({
    actorUserId: actorId,
    action: 'welfare_case.created',
    resourceType: 'welfare_case',
    resourceId: record._id.toString(),
    scopeType: record.scopeType,
    scopeId: record.scopeId ?? null,
    metadata: {
      title: record.title,
      categoryId: record.categoryId,
      targetAmount: record.targetAmount ?? 0,
      beneficiaryUserId: record.beneficiaryUserId ?? null,
    },
  });

  if (record.beneficiaryUserId) {
    await createNotificationForUser(record.beneficiaryUserId, {
      title: 'Welfare case created',
      message: `A welfare case "${record.title}" was opened with your profile as beneficiary.`,
      type: 'info',
      metadata: { caseId: record._id.toString() },
    });
  }

  return toCase(record);
}

export async function updateWelfareCaseStatus(
  actorId: string,
  caseId: string,
  status: 'open' | 'closed',
): Promise<WelfareCaseDTO> {
  if (status !== 'open' && status !== 'closed') {
    throw new ApiError(400, 'Invalid status', 'BadRequest');
  }
  if (!Types.ObjectId.isValid(caseId)) {
    throw new ApiError(404, 'Case not found', 'NotFound');
  }

  const welfareCase = await WelfareCaseModel.findById(caseId).exec();
  if (!welfareCase) {
    throw new ApiError(404, 'Case not found', 'NotFound');
  }
  await ensureCaseManagement(actorId, welfareCase);

  welfareCase.status = status;
  await welfareCase.save();
  await recordAuditLog({
    actorUserId: actorId,
    action: `welfare_case.${status === 'closed' ? 'closed' : 'reopened'}`,
    resourceType: 'welfare_case',
    resourceId: welfareCase._id.toString(),
    scopeType: welfareCase.scopeType,
    scopeId: welfareCase.scopeId ?? null,
    metadata: { status },
  });
  return toCase(welfareCase);
}

export async function getWelfareCaseDetail(actorId: string, caseId: string): Promise<WelfareCaseDetailDTO> {
  if (!Types.ObjectId.isValid(caseId)) {
    throw new ApiError(404, 'Case not found', 'NotFound');
  }
  const welfareCase = await WelfareCaseModel.findById(caseId).exec();
  if (!welfareCase) {
    throw new ApiError(404, 'Case not found', 'NotFound');
  }
  await ensureCanViewCase(actorId, welfareCase);

  const [contributions, payouts] = await Promise.all([
    WelfareContributionModel.find({ caseId }).sort({ paidAt: -1, createdAt: -1 }).exec(),
    WelfarePayoutModel.find({ caseId }).sort({ disbursedAt: -1, createdAt: -1 }).exec(),
  ]);

  return {
    ...toCase(welfareCase),
    contributions: contributions.map((doc) => toContribution(doc)),
    payouts: payouts.map((doc) => toPayout(doc)),
  };
}

export async function recordWelfareContribution(
  actorId: string,
  caseId: string,
  payload: {
    contributorUserId?: string;
    contributorName?: string;
    contributorEmail?: string;
    amount?: number;
    currency?: string;
    notes?: string;
  },
): Promise<WelfareContributionDTO> {
  if (!Types.ObjectId.isValid(caseId)) {
    throw new ApiError(404, 'Case not found', 'NotFound');
  }
  const welfareCase = await WelfareCaseModel.findById(caseId).exec();
  if (!welfareCase) {
    throw new ApiError(404, 'Case not found', 'NotFound');
  }
  if (welfareCase.status !== 'open') {
    throw new ApiError(400, 'Case is closed', 'BadRequest');
  }
  await ensureCanViewCase(actorId, welfareCase);

  const contributorName = payload.contributorName?.trim();
  if (!contributorName) {
    throw new ApiError(400, 'contributorName is required', 'BadRequest');
  }
  const amount = Number(payload.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'amount must be greater than 0', 'BadRequest');
  }

  const contribution = await WelfareContributionModel.create({
    caseId,
    userId: payload.contributorUserId?.trim() || actorId,
    contributorName,
    contributorEmail: payload.contributorEmail?.trim() || null,
    amount,
    currency: payload.currency?.trim().toUpperCase() || welfareCase.currency || 'NGN',
    notes: payload.notes?.trim() || null,
    paidAt: new Date(),
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  });

  await recordAuditLog({
    actorUserId: actorId,
    action: 'welfare_contribution.recorded',
    resourceType: 'welfare_contribution',
    resourceId: contribution._id.toString(),
    scopeType: welfareCase.scopeType,
    scopeId: welfareCase.scopeId ?? null,
    metadata: {
      caseId,
      amount: contribution.amount,
      currency: contribution.currency ?? 'NGN',
      contributorUserId: contribution.userId ?? null,
    },
  });

  return toContribution(contribution);
}

export async function recordWelfarePayout(
  actorId: string,
  caseId: string,
  payload: {
    amount?: number;
    currency?: string;
    channel?: string;
    reference?: string;
    notes?: string;
  },
): Promise<WelfarePayoutDTO> {
  if (!Types.ObjectId.isValid(caseId)) {
    throw new ApiError(404, 'Case not found', 'NotFound');
  }
  const welfareCase = await WelfareCaseModel.findById(caseId).exec();
  if (!welfareCase) {
    throw new ApiError(404, 'Case not found', 'NotFound');
  }
  if (welfareCase.status !== 'open') {
    throw new ApiError(400, 'Case is closed', 'BadRequest');
  }
  await ensureCaseManagement(actorId, welfareCase);

  const amount = Number(payload.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'amount must be greater than 0', 'BadRequest');
  }
  const channel = payload.channel?.trim();
  if (!channel) {
    throw new ApiError(400, 'channel is required', 'BadRequest');
  }

  const payout = await WelfarePayoutModel.create({
    caseId,
    beneficiaryUserId: welfareCase.beneficiaryUserId ?? null,
    amount,
    currency: payload.currency?.trim().toUpperCase() || welfareCase.currency || 'NGN',
    channel,
    reference: payload.reference?.trim() || null,
    notes: payload.notes?.trim() || null,
    disbursedAt: new Date(),
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  });

  await recordAuditLog({
    actorUserId: actorId,
    action: 'welfare_payout.recorded',
    resourceType: 'welfare_payout',
    resourceId: payout._id.toString(),
    scopeType: welfareCase.scopeType,
    scopeId: welfareCase.scopeId ?? null,
    metadata: {
      caseId,
      amount: payout.amount,
      currency: payout.currency ?? 'NGN',
      beneficiaryUserId: payout.beneficiaryUserId ?? null,
    },
  });

  if (payout.beneficiaryUserId) {
    await createNotificationForUser(payout.beneficiaryUserId, {
      title: 'Welfare payout queued for approval',
      message: `A payout request has been submitted for welfare case "${welfareCase.title}".`,
      type: 'info',
      metadata: {
        caseId: welfareCase._id.toString(),
        payoutId: payout._id.toString(),
      },
    });
  }

  return toPayout(payout);
}

async function listAccessibleCasesForQueue(actorId: string, scopeType?: WelfareScopeType, scopeId?: string) {
  const global = await hasGlobalAccess(actorId);
  const query: Record<string, unknown> = {};

  if (scopeType) {
    if (scopeType === 'global') {
      if (!global) {
        throw new ApiError(403, 'Not authorized for global welfare queue', 'Forbidden');
      }
      query.scopeType = 'global';
    } else {
      await ensureScopeManagement(actorId, scopeType, scopeId ?? null);
      query.scopeType = scopeType;
      if (scopeId) {
        query.scopeId = scopeId;
      }
    }
  } else if (!global) {
    const [managedBranches, managedClasses] = await Promise.all([
      managedBranchIds(actorId),
      managedClassIds(actorId),
    ]);
    query.$or = [
      { scopeType: 'branch', scopeId: { $in: managedBranches } },
      { scopeType: 'class', scopeId: { $in: managedClasses } },
    ];
  }

  return WelfareCaseModel.find(query).exec();
}

export async function listWelfareQueue(
  actorId: string,
  scopeType?: WelfareScopeType,
  scopeId?: string,
  status: WelfareQueueStatus = 'pending',
): Promise<WelfareQueueItemDTO[]> {
  const cases = await listAccessibleCasesForQueue(actorId, scopeType, scopeId);
  const caseIds = cases.map((record) => record._id.toString());
  if (caseIds.length === 0) {
    return [];
  }

  const [contributions, payouts] = await Promise.all([
    WelfareContributionModel.find({ caseId: { $in: caseIds }, status }).sort({ createdAt: -1 }).exec(),
    WelfarePayoutModel.find({ caseId: { $in: caseIds }, status }).sort({ createdAt: -1 }).exec(),
  ]);
  const caseMap = new Map(cases.map((record) => [record._id.toString(), record]));

  const queue: WelfareQueueItemDTO[] = [];
  contributions.forEach((entry) => {
    const welfareCase = caseMap.get(entry.caseId);
    if (!welfareCase) {
      return;
    }
    queue.push({
      id: entry._id.toString(),
      kind: 'contribution',
      caseId: entry.caseId,
      caseTitle: welfareCase.title,
      scopeType: welfareCase.scopeType,
      scopeId: welfareCase.scopeId ?? null,
      amount: entry.amount,
      currency: entry.currency ?? welfareCase.currency ?? 'NGN',
      submittedAt: entry.paidAt?.toISOString() ?? createdAtIso(entry) ?? undefined,
      submittedBy: entry.contributorName,
      status: entry.status ?? 'pending',
    });
  });

  payouts.forEach((entry) => {
    const welfareCase = caseMap.get(entry.caseId);
    if (!welfareCase) {
      return;
    }
    queue.push({
      id: entry._id.toString(),
      kind: 'payout',
      caseId: entry.caseId,
      caseTitle: welfareCase.title,
      scopeType: welfareCase.scopeType,
      scopeId: welfareCase.scopeId ?? null,
      amount: entry.amount,
      currency: entry.currency ?? welfareCase.currency ?? 'NGN',
      submittedAt: entry.disbursedAt?.toISOString() ?? createdAtIso(entry) ?? undefined,
      submittedBy: welfareCase.beneficiaryName ?? 'Beneficiary payout',
      status: entry.status ?? 'pending',
    });
  });

  queue.sort((a, b) => {
    const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bTime - aTime;
  });
  return queue;
}

export async function approveWelfareContribution(
  actorId: string,
  contributionId: string,
  note?: string,
): Promise<WelfareContributionDTO> {
  if (!Types.ObjectId.isValid(contributionId)) {
    throw new ApiError(404, 'Contribution not found', 'NotFound');
  }

  const contribution = await WelfareContributionModel.findById(contributionId).exec();
  if (!contribution) {
    throw new ApiError(404, 'Contribution not found', 'NotFound');
  }
  const welfareCase = await WelfareCaseModel.findById(contribution.caseId).exec();
  if (!welfareCase) {
    throw new ApiError(404, 'Case not found', 'NotFound');
  }
  await ensureCaseManagement(actorId, welfareCase);

  contribution.status = 'approved';
  contribution.reviewedBy = actorId;
  contribution.reviewedAt = new Date();
  contribution.reviewNote = note ?? null;
  await contribution.save();
  await refreshCaseTotals(welfareCase._id.toString());

  if (contribution.userId) {
    await createNotificationForUser(contribution.userId, {
      title: 'Welfare contribution approved',
      message: `Your contribution for "${welfareCase.title}" has been approved.`,
      type: 'success',
      metadata: {
        caseId: welfareCase._id.toString(),
        contributionId: contribution._id.toString(),
      },
    });
  }
  await recordAuditLog({
    actorUserId: actorId,
    action: 'welfare_contribution.approved',
    resourceType: 'welfare_contribution',
    resourceId: contribution._id.toString(),
    scopeType: welfareCase.scopeType,
    scopeId: welfareCase.scopeId ?? null,
    metadata: {
      caseId: welfareCase._id.toString(),
      reviewNote: note ?? null,
    },
  });

  return toContribution(contribution);
}

export async function rejectWelfareContribution(
  actorId: string,
  contributionId: string,
  note?: string,
): Promise<WelfareContributionDTO> {
  const trimmed = note?.trim();
  if (!trimmed) {
    throw new ApiError(400, 'Rejection note is required', 'BadRequest');
  }
  if (!Types.ObjectId.isValid(contributionId)) {
    throw new ApiError(404, 'Contribution not found', 'NotFound');
  }

  const contribution = await WelfareContributionModel.findById(contributionId).exec();
  if (!contribution) {
    throw new ApiError(404, 'Contribution not found', 'NotFound');
  }
  const welfareCase = await WelfareCaseModel.findById(contribution.caseId).exec();
  if (!welfareCase) {
    throw new ApiError(404, 'Case not found', 'NotFound');
  }
  await ensureCaseManagement(actorId, welfareCase);

  contribution.status = 'rejected';
  contribution.reviewedBy = actorId;
  contribution.reviewedAt = new Date();
  contribution.reviewNote = trimmed;
  await contribution.save();
  await refreshCaseTotals(welfareCase._id.toString());

  if (contribution.userId) {
    await createNotificationForUser(contribution.userId, {
      title: 'Welfare contribution rejected',
      message: `Your contribution for "${welfareCase.title}" was rejected.`,
      type: 'warning',
      metadata: {
        caseId: welfareCase._id.toString(),
        contributionId: contribution._id.toString(),
        reviewNote: trimmed,
      },
    });
  }
  await recordAuditLog({
    actorUserId: actorId,
    action: 'welfare_contribution.rejected',
    resourceType: 'welfare_contribution',
    resourceId: contribution._id.toString(),
    scopeType: welfareCase.scopeType,
    scopeId: welfareCase.scopeId ?? null,
    metadata: {
      caseId: welfareCase._id.toString(),
      reviewNote: trimmed,
    },
  });

  return toContribution(contribution);
}

export async function approveWelfarePayout(
  actorId: string,
  payoutId: string,
  note?: string,
): Promise<WelfarePayoutDTO> {
  if (!Types.ObjectId.isValid(payoutId)) {
    throw new ApiError(404, 'Payout not found', 'NotFound');
  }
  const payout = await WelfarePayoutModel.findById(payoutId).exec();
  if (!payout) {
    throw new ApiError(404, 'Payout not found', 'NotFound');
  }
  const welfareCase = await WelfareCaseModel.findById(payout.caseId).exec();
  if (!welfareCase) {
    throw new ApiError(404, 'Case not found', 'NotFound');
  }
  await ensureCaseManagement(actorId, welfareCase);

  payout.status = 'approved';
  payout.reviewedBy = actorId;
  payout.reviewedAt = new Date();
  payout.reviewNote = note ?? null;
  if (!payout.disbursedAt) {
    payout.disbursedAt = new Date();
  }
  await payout.save();
  await refreshCaseTotals(welfareCase._id.toString());

  if (payout.beneficiaryUserId) {
    await createNotificationForUser(payout.beneficiaryUserId, {
      title: 'Welfare payout approved',
      message: `A welfare payout for "${welfareCase.title}" has been approved.`,
      type: 'success',
      metadata: {
        caseId: welfareCase._id.toString(),
        payoutId: payout._id.toString(),
      },
    });
  }
  await recordAuditLog({
    actorUserId: actorId,
    action: 'welfare_payout.approved',
    resourceType: 'welfare_payout',
    resourceId: payout._id.toString(),
    scopeType: welfareCase.scopeType,
    scopeId: welfareCase.scopeId ?? null,
    metadata: {
      caseId: welfareCase._id.toString(),
      reviewNote: note ?? null,
    },
  });

  return toPayout(payout);
}

export async function rejectWelfarePayout(
  actorId: string,
  payoutId: string,
  note?: string,
): Promise<WelfarePayoutDTO> {
  const trimmed = note?.trim();
  if (!trimmed) {
    throw new ApiError(400, 'Rejection note is required', 'BadRequest');
  }
  if (!Types.ObjectId.isValid(payoutId)) {
    throw new ApiError(404, 'Payout not found', 'NotFound');
  }

  const payout = await WelfarePayoutModel.findById(payoutId).exec();
  if (!payout) {
    throw new ApiError(404, 'Payout not found', 'NotFound');
  }
  const welfareCase = await WelfareCaseModel.findById(payout.caseId).exec();
  if (!welfareCase) {
    throw new ApiError(404, 'Case not found', 'NotFound');
  }
  await ensureCaseManagement(actorId, welfareCase);

  payout.status = 'rejected';
  payout.reviewedBy = actorId;
  payout.reviewedAt = new Date();
  payout.reviewNote = trimmed;
  await payout.save();
  await refreshCaseTotals(welfareCase._id.toString());

  if (payout.beneficiaryUserId) {
    await createNotificationForUser(payout.beneficiaryUserId, {
      title: 'Welfare payout rejected',
      message: `A welfare payout for "${welfareCase.title}" was rejected.`,
      type: 'warning',
      metadata: {
        caseId: welfareCase._id.toString(),
        payoutId: payout._id.toString(),
        reviewNote: trimmed,
      },
    });
  }
  await recordAuditLog({
    actorUserId: actorId,
    action: 'welfare_payout.rejected',
    resourceType: 'welfare_payout',
    resourceId: payout._id.toString(),
    scopeType: welfareCase.scopeType,
    scopeId: welfareCase.scopeId ?? null,
    metadata: {
      caseId: welfareCase._id.toString(),
      reviewNote: trimmed,
    },
  });

  return toPayout(payout);
}
