import type {
  WelfareCaseDTO,
  WelfareCaseDetailDTO,
  WelfareCategoryDTO,
  WelfareContributionDTO,
  WelfareOutstandingInvoiceDTO,
  WelfarePayoutDeductionDTO,
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
  DuesInvoiceModel,
  PaymentModel,
  UserModel,
  WelfareCaseModel,
  WelfareCategoryModel,
  WelfareContributionModel,
  WelfarePayoutModel,
  type DuesInvoiceDoc,
  type DuesSchemeDoc,
  type WelfareCaseDoc,
  type WelfareContributionDoc,
  type WelfarePayoutDoc,
} from './models';
import { createNotificationForUser } from './notifications';

type WelfareScopeType = 'global' | 'branch' | 'class';
type WelfareQueueStatus = 'pending' | 'approved' | 'rejected';
type WelfarePayoutDeductionType = 'standard_percentage' | 'dues_invoice' | 'liability' | 'custom';
type NormalizedPayoutDeduction = {
  type: WelfarePayoutDeductionType;
  label: string;
  amount: number;
  percentage?: number | null;
  invoiceId?: string | null;
};
type ResolvedPayoutInput = {
  grossAmount: number;
  netAmount: number;
  totalDeductions: number;
  deductions: NormalizedPayoutDeduction[];
};

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
  const grossAmount = Number(doc.grossAmount ?? doc.amount ?? 0);
  const totalDeductions = Number(doc.totalDeductions ?? Math.max(grossAmount - Number(doc.amount ?? 0), 0));
  const netAmount = Number(doc.amount ?? 0);
  const deductions: WelfarePayoutDeductionDTO[] = (doc.deductions ?? [])
    .map((row) => ({
      type: row.type as WelfarePayoutDeductionType,
      label: row.label,
      amount: Number(row.amount ?? 0),
      percentage: row.percentage ?? null,
      invoiceId: row.invoiceId ? row.invoiceId.toString() : null,
    }))
    .filter((row) => row.amount > 0);
  return {
    id: doc._id.toString(),
    caseId: doc.caseId,
    beneficiaryUserId: doc.beneficiaryUserId ?? undefined,
    amount: netAmount,
    grossAmount: Number(grossAmount.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    netAmount: Number(netAmount.toFixed(2)),
    currency: doc.currency ?? 'NGN',
    channel: doc.channel,
    reference: doc.reference ?? undefined,
    notes: doc.notes ?? undefined,
    deductions,
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

async function ensureBeneficiaryInScope(
  beneficiaryUserId: string,
  scopeType: WelfareScopeType,
  scopeId: string | null,
) {
  if (scopeType === 'global') {
    return;
  }
  if (!scopeId) {
    throw new ApiError(400, `scopeId is required for ${scopeType} scope`, 'BadRequest');
  }

  if (scopeType === 'branch') {
    const membership = await BranchMembershipModel.findOne({
      userId: beneficiaryUserId,
      branchId: scopeId,
      status: 'approved',
    })
      .select('_id')
      .lean<{ _id: Types.ObjectId }>()
      .exec();
    if (!membership) {
      throw new ApiError(400, 'Beneficiary must be an approved member of the selected branch', 'BadRequest');
    }
    return;
  }

  const membership = await ClassMembershipModel.findOne({
    userId: beneficiaryUserId,
    classId: scopeId,
  })
    .select('_id')
    .lean<{ _id: Types.ObjectId }>()
    .exec();
  if (!membership) {
    throw new ApiError(400, 'Beneficiary must belong to the selected class', 'BadRequest');
  }
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

function toOutstandingInvoice(doc: DuesInvoiceDoc, schemeTitle?: string): WelfareOutstandingInvoiceDTO {
  const amount = Number(doc.amount ?? 0);
  const paidAmount = Number(doc.paidAmount ?? 0);
  const balance = Number(Math.max(amount - paidAmount, 0).toFixed(2));
  return {
    id: doc._id.toString(),
    title: schemeTitle ?? 'Dues invoice',
    amount: Number(amount.toFixed(2)),
    paidAmount: Number(paidAmount.toFixed(2)),
    balance,
    currency: doc.currency ?? 'NGN',
    status: doc.status ?? 'unpaid',
    periodStart: doc.periodStart?.toISOString(),
  };
}

function assertInvoiceMatchesScope(
  welfareCase: WelfareCaseDoc,
  scheme: DuesSchemeDoc | null,
  invoiceId: string,
): void {
  if (!scheme) {
    throw new ApiError(400, `Unable to resolve dues scheme for invoice ${invoiceId}`, 'BadRequest');
  }
  if (welfareCase.scopeType === 'global') {
    return;
  }
  const caseScopeId = welfareCase.scopeId ?? null;
  if (scheme.scope_type !== welfareCase.scopeType || (scheme.scope_id ?? null) !== caseScopeId) {
    throw new ApiError(400, `Invoice ${invoiceId} is outside welfare scope`, 'BadRequest');
  }
}

async function resolvePayoutInput(
  welfareCase: WelfareCaseDoc,
  payload: {
    amount?: number;
    retainerMode?: 'none' | 'percentage' | 'fixed';
    retainerPercentage?: number;
    retainerAmount?: number;
    deductions?: Array<{
      type?: WelfarePayoutDeductionType;
      label?: string;
      amount?: number;
      percentage?: number;
      invoiceId?: string;
    }>;
  },
): Promise<ResolvedPayoutInput> {
  const grossAmount = Number(payload.amount ?? 0);
  if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
    throw new ApiError(400, 'amount must be greater than 0', 'BadRequest');
  }

  const deductions: NormalizedPayoutDeduction[] = [];
  const retainerMode = payload.retainerMode ?? 'none';
  if (retainerMode !== 'none' && retainerMode !== 'percentage' && retainerMode !== 'fixed') {
    throw new ApiError(400, 'Invalid retainerMode', 'BadRequest');
  }
  if (retainerMode === 'percentage') {
    const percent = Number(payload.retainerPercentage ?? 0);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      throw new ApiError(400, 'retainerPercentage must be between 0 and 100', 'BadRequest');
    }
    const amount = Number(((grossAmount * percent) / 100).toFixed(2));
    if (amount > 0) {
      deductions.push({
        type: 'standard_percentage',
        label: `Retainer fee (${percent}%)`,
        amount,
        percentage: percent,
        invoiceId: null,
      });
    }
  } else if (retainerMode === 'fixed') {
    const amount = Number(payload.retainerAmount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(400, 'retainerAmount must be greater than 0', 'BadRequest');
    }
    if (amount >= grossAmount) {
      throw new ApiError(400, 'retainerAmount must be less than payout amount', 'BadRequest');
    }
    deductions.push({
      type: 'custom',
      label: 'Retainer fee',
      amount: Number(amount.toFixed(2)),
      percentage: null,
      invoiceId: null,
    });
  }

  const requested = payload.deductions ?? [];
  const duesDeductionTotals = new Map<string, number>();
  const seenDuesInvoiceIds = new Set<string>();
  for (const row of requested) {
    const amount = Number(row.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(400, 'All deductions must have an amount greater than 0', 'BadRequest');
    }
    const type: WelfarePayoutDeductionType =
      row.type === 'dues_invoice' || row.type === 'liability' || row.type === 'standard_percentage'
        ? row.type
        : 'custom';
    const label = row.label?.trim() || (type === 'dues_invoice' ? 'Dues deduction' : 'Liability deduction');
    const invoiceId = row.invoiceId?.trim() || null;

    if (type === 'dues_invoice') {
      if (!invoiceId || !Types.ObjectId.isValid(invoiceId)) {
        throw new ApiError(400, 'Dues deductions require a valid invoiceId', 'BadRequest');
      }
      if (seenDuesInvoiceIds.has(invoiceId)) {
        throw new ApiError(400, `Duplicate dues deduction invoice selected: ${invoiceId}`, 'BadRequest');
      }
      seenDuesInvoiceIds.add(invoiceId);
      if (!welfareCase.beneficiaryUserId) {
        throw new ApiError(400, 'Case beneficiary is required for dues deductions', 'BadRequest');
      }
      const invoice = await DuesInvoiceModel.findById(invoiceId).populate('schemeId').exec();
      if (!invoice || invoice.userId !== welfareCase.beneficiaryUserId) {
        throw new ApiError(400, 'Dues deduction invoice must belong to the case beneficiary', 'BadRequest');
      }
      const scheme = invoice.schemeId as DuesSchemeDoc | null;
      assertInvoiceMatchesScope(welfareCase, scheme, invoiceId);
      const outstanding = Math.max(Number(invoice.amount ?? 0) - Number(invoice.paidAmount ?? 0), 0);
      const cumulative = Number(((duesDeductionTotals.get(invoiceId) ?? 0) + amount).toFixed(2));
      if (cumulative > outstanding + 0.01) {
        throw new ApiError(400, `Dues deduction exceeds invoice outstanding for ${invoiceId}`, 'BadRequest');
      }
      duesDeductionTotals.set(invoiceId, cumulative);
      if ((invoice.currency ?? 'NGN') !== (welfareCase.currency ?? 'NGN')) {
        throw new ApiError(400, `Invoice ${invoiceId} currency must match welfare currency`, 'BadRequest');
      }
    }

    deductions.push({
      type,
      label,
      amount: Number(amount.toFixed(2)),
      percentage: row.percentage ?? null,
      invoiceId,
    });
  }

  const totalDeductions = Number(
    deductions.reduce((sum, row) => sum + Number(row.amount ?? 0), 0).toFixed(2),
  );
  const netAmount = Number((grossAmount - totalDeductions).toFixed(2));
  if (netAmount <= 0) {
    throw new ApiError(400, 'Net payout must remain greater than 0 after deductions', 'BadRequest');
  }

  return {
    grossAmount: Number(grossAmount.toFixed(2)),
    netAmount,
    totalDeductions,
    deductions,
  };
}

async function applyPayoutDuesDeductions(
  actorId: string,
  welfareCase: WelfareCaseDoc,
  payout: WelfarePayoutDoc,
): Promise<void> {
  const rows = (payout.deductions ?? []).filter((row) => row.type === 'dues_invoice' && row.invoiceId && Number(row.amount ?? 0) > 0);
  if (rows.length === 0) {
    return;
  }

  for (const row of rows) {
    const invoiceId = row.invoiceId?.toString();
    if (!invoiceId || !Types.ObjectId.isValid(invoiceId)) {
      continue;
    }
    const invoice = await DuesInvoiceModel.findById(invoiceId).populate('schemeId').exec();
    if (!invoice) {
      throw new ApiError(400, `Invoice ${invoiceId} not found during payout approval`, 'BadRequest');
    }
    if (invoice.userId !== payout.beneficiaryUserId) {
      throw new ApiError(400, `Invoice ${invoiceId} does not belong to payout beneficiary`, 'BadRequest');
    }
    const scheme = invoice.schemeId as DuesSchemeDoc | null;
    assertInvoiceMatchesScope(welfareCase, scheme, invoiceId);
    const outstanding = Math.max(Number(invoice.amount ?? 0) - Number(invoice.paidAmount ?? 0), 0);
    const applied = Number(row.amount ?? 0);
    if (applied <= 0) {
      continue;
    }
    if (applied > outstanding + 0.01) {
      throw new ApiError(400, `Invoice ${invoiceId} outstanding changed; refresh and retry approval`, 'BadRequest');
    }

    await PaymentModel.create({
      payerUserId: invoice.userId,
      amount: Number(applied.toFixed(2)),
      currency: invoice.currency ?? welfareCase.currency ?? 'NGN',
      channel: 'welfare_deduction',
      reference: `WEL-${payout._id.toString()}-${invoice._id.toString()}`,
      scopeType: scheme?.scope_type ?? welfareCase.scopeType,
      scopeId: scheme?.scope_id ?? welfareCase.scopeId ?? null,
      notes: `Applied from welfare payout ${payout._id.toString()}`,
      status: 'completed',
      paidAt: payout.disbursedAt ?? new Date(),
      applications: [{ invoiceId: invoice._id, amount: Number(applied.toFixed(2)) }],
    });

    invoice.paidAmount = Number((Number(invoice.paidAmount ?? 0) + applied).toFixed(2));
    if (invoice.paidAmount + 0.01 >= Number(invoice.amount ?? 0)) {
      invoice.status = 'paid';
      invoice.paidAmount = Number(invoice.amount ?? 0);
    } else {
      invoice.status = 'part_paid';
    }
    await invoice.save();
  }

  await recordAuditLog({
    actorUserId: actorId,
    action: 'welfare_payout.dues_deductions_applied',
    resourceType: 'welfare_payout',
    resourceId: payout._id.toString(),
    scopeType: welfareCase.scopeType,
    scopeId: welfareCase.scopeId ?? null,
    metadata: {
      caseId: welfareCase._id.toString(),
      deductions: rows.map((row) => ({
        invoiceId: row.invoiceId?.toString(),
        amount: Number(row.amount ?? 0),
      })),
    },
  });
}

async function listBeneficiaryOutstandingInvoices(
  welfareCase: WelfareCaseDoc,
): Promise<WelfareOutstandingInvoiceDTO[]> {
  const beneficiaryUserId = welfareCase.beneficiaryUserId;
  if (!beneficiaryUserId) {
    return [];
  }

  const docs = await DuesInvoiceModel.find({
    userId: beneficiaryUserId,
    status: { $in: ['unpaid', 'part_paid'] },
  })
    .populate('schemeId')
    .sort({ periodStart: 1, createdAt: 1 })
    .exec();

  const filtered = docs.filter((doc) => {
    const scheme = doc.schemeId as DuesSchemeDoc | null;
    if (!scheme) {
      return false;
    }
    if ((doc.currency ?? 'NGN') !== (welfareCase.currency ?? 'NGN')) {
      return false;
    }
    if (welfareCase.scopeType === 'global') {
      return true;
    }
    return scheme.scope_type === welfareCase.scopeType && (scheme.scope_id ?? null) === (welfareCase.scopeId ?? null);
  });

  return filtered.map((doc) => {
    const scheme = doc.schemeId as DuesSchemeDoc | null;
    return toOutstandingInvoice(doc, scheme?.title);
  });
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
  if (!beneficiaryUserId) {
    throw new ApiError(400, 'Beneficiary member is required', 'BadRequest');
  }

  const beneficiaryUser = await UserModel.findById(beneficiaryUserId)
    .select('name status')
    .lean<{ name?: string; status?: string }>()
    .exec();
  if (!beneficiaryUser?.name) {
    throw new ApiError(400, 'Beneficiary member not found', 'BadRequest');
  }
  if (beneficiaryUser.status !== 'active') {
    throw new ApiError(400, 'Beneficiary member must be active', 'BadRequest');
  }
  await ensureBeneficiaryInScope(beneficiaryUserId, scopeType, scopeId);

  const record = await WelfareCaseModel.create({
    title,
    description,
    categoryId,
    scopeType,
    scopeId: scopeType === 'global' ? null : scopeId,
    targetAmount: payload.targetAmount ?? 0,
    currency: payload.currency?.trim().toUpperCase() || 'NGN',
    beneficiaryName: beneficiaryUser.name,
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

  const [contributions, payouts, outstandingInvoices] = await Promise.all([
    WelfareContributionModel.find({ caseId }).sort({ paidAt: -1, createdAt: -1 }).exec(),
    WelfarePayoutModel.find({ caseId }).sort({ disbursedAt: -1, createdAt: -1 }).exec(),
    listBeneficiaryOutstandingInvoices(welfareCase),
  ]);

  return {
    ...toCase(welfareCase),
    contributions: contributions.map((doc) => toContribution(doc)),
    payouts: payouts.map((doc) => toPayout(doc)),
    beneficiaryOutstandingInvoices: outstandingInvoices,
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
    retainerMode?: 'none' | 'percentage' | 'fixed';
    retainerPercentage?: number;
    retainerAmount?: number;
    deductions?: Array<{
      type?: WelfarePayoutDeductionType;
      label?: string;
      amount?: number;
      percentage?: number;
      invoiceId?: string;
    }>;
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

  const payoutCurrency = payload.currency?.trim().toUpperCase() || welfareCase.currency || 'NGN';
  if (payoutCurrency !== (welfareCase.currency ?? 'NGN')) {
    throw new ApiError(400, 'Payout currency must match welfare case currency', 'BadRequest');
  }
  const payoutInput = await resolvePayoutInput(welfareCase, payload);
  const channel = payload.channel?.trim();
  if (!channel) {
    throw new ApiError(400, 'channel is required', 'BadRequest');
  }

  const payout = await WelfarePayoutModel.create({
    caseId,
    beneficiaryUserId: welfareCase.beneficiaryUserId ?? null,
    amount: payoutInput.netAmount,
    grossAmount: payoutInput.grossAmount,
    totalDeductions: payoutInput.totalDeductions,
    currency: payoutCurrency,
    channel,
    reference: payload.reference?.trim() || null,
    notes: payload.notes?.trim() || null,
    deductions: payoutInput.deductions.map((row) => ({
      type: row.type,
      label: row.label,
      amount: row.amount,
      percentage: row.percentage ?? null,
      invoiceId: row.invoiceId && Types.ObjectId.isValid(row.invoiceId) ? new Types.ObjectId(row.invoiceId) : null,
    })),
    disbursedAt: null,
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
      grossAmount: payout.grossAmount ?? payout.amount,
      totalDeductions: payout.totalDeductions ?? 0,
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
  if (payout.status !== 'pending') {
    throw new ApiError(400, 'Only pending payouts can be approved', 'BadRequest');
  }

  payout.status = 'approved';
  payout.reviewedBy = actorId;
  payout.reviewedAt = new Date();
  payout.reviewNote = note ?? null;
  if (!payout.disbursedAt) {
    payout.disbursedAt = new Date();
  }
  await applyPayoutDuesDeductions(actorId, welfareCase, payout);
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
  if (payout.status !== 'pending') {
    throw new ApiError(400, 'Only pending payouts can be rejected', 'BadRequest');
  }

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
