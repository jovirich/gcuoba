import type {
  CurrencyTotalsDTO,
  DashboardSummaryDTO,
  DuesInvoiceDTO,
  DuesSchemeSummaryDTO,
  DuesSummaryDTO,
  WelfareCaseDTO,
} from '@gcuoba/types';
import { Types } from 'mongoose';
import {
  toBranchDto,
  toBranchMembershipDto,
  toClassMembershipDto,
  toUserDto,
} from './dto-mappers';
import {
  AnnouncementModel,
  BranchMembershipModel,
  BranchModel,
  ClassMembershipModel,
  DuesInvoiceModel,
  DuesSchemeModel,
  EventModel,
  PaymentModel,
  UserModel,
  WelfareCaseModel,
  type DuesInvoiceDoc,
  type DuesSchemeDoc,
  type PaymentDoc,
} from './models';
import { managedBranchIds, managedClassIds } from './authorization';

function emptyTotals(): CurrencyTotalsDTO {
  return { due: 0, paid: 0, balance: 0 };
}

function describeScope(scheme?: DuesSchemeDoc | null) {
  switch (scheme?.scope_type) {
    case 'branch':
      return 'Branch';
    case 'class':
      return 'Class';
    case 'global':
      return 'Global';
    default:
      return 'Custom';
  }
}

function resolveFrequency(scheme?: DuesSchemeDoc | null): 'monthly' | 'quarterly' | 'annual' | 'one_off' | 'custom' {
  if (!scheme?.frequency) {
    return 'custom';
  }
  if (
    scheme.frequency === 'monthly' ||
    scheme.frequency === 'quarterly' ||
    scheme.frequency === 'annual' ||
    scheme.frequency === 'one_off'
  ) {
    return scheme.frequency;
  }
  return 'custom';
}

function calculateAppliedTotals(payments: PaymentDoc[]) {
  const map = new Map<string, number>();
  payments.forEach((payment) => {
    payment.applications?.forEach((application) => {
      const invoiceId = application.invoiceId?.toString?.();
      if (!invoiceId) {
        return;
      }
      const current = map.get(invoiceId) ?? 0;
      map.set(invoiceId, Number((current + (application.amount ?? 0)).toFixed(2)));
    });
  });
  return map;
}

function buildSchemeSummaryRows(
  invoices: DuesInvoiceDoc[],
  schemeMap: Map<string, DuesSchemeDoc>,
  appliedMap: Map<string, number>,
) {
  const grouped = new Map<string, DuesSchemeSummaryDTO>();

  invoices.forEach((invoice) => {
    const scheme = schemeMap.get(invoice.schemeId.toString());
    const key = scheme?._id?.toString() ?? `manual-${invoice._id.toString()}`;
    const existing = grouped.get(key) ?? {
      schemeId: scheme?._id?.toString() ?? null,
      label: scheme?.title ?? `Manual invoice #${invoice._id.toString()}`,
      frequency: resolveFrequency(scheme),
      scope: describeScope(scheme),
      currency: invoice.currency ?? 'NGN',
      due: 0,
      paid: 0,
      balance: 0,
    };

    existing.due += invoice.amount ?? 0;
    const paid = appliedMap.get(invoice._id.toString()) ?? 0;
    existing.paid += paid;
    existing.balance = Math.max(existing.due - existing.paid, 0);
    grouped.set(key, existing);
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      due: Number(row.due.toFixed(2)),
      paid: Number(row.paid.toFixed(2)),
      balance: Number(row.balance.toFixed(2)),
    }))
    .sort((a, b) => b.due - a.due);
}

function buildPriorOutstandingRows(
  invoices: DuesInvoiceDoc[],
  appliedMap: Map<string, number>,
  year: number,
) {
  const cutoff = new Date(year, 0, 1);
  const rows: Array<{ currency: string; due: number; paid: number; balance: number }> = [];

  invoices.forEach((invoice) => {
    if (!invoice.periodStart || invoice.periodStart >= cutoff) {
      return;
    }
    if (!['unpaid', 'part_paid'].includes(invoice.status)) {
      return;
    }

    const paid = appliedMap.get(invoice._id.toString()) ?? 0;
    const outstanding = Math.max((invoice.amount ?? 0) - paid, 0);
    if (outstanding <= 0) {
      return;
    }

    rows.push({
      currency: invoice.currency ?? 'NGN',
      due: outstanding,
      paid: 0,
      balance: outstanding,
    });
  });

  return rows;
}

function aggregateCurrencyRows(
  rows: Array<{ currency: string; due: number; paid: number; balance: number }>,
): Record<string, CurrencyTotalsDTO> {
  const totals: Record<string, CurrencyTotalsDTO> = {};

  rows.forEach((row) => {
    const currency = row.currency ?? 'NGN';
    if (!totals[currency]) {
      totals[currency] = emptyTotals();
    }
    totals[currency].due += row.due ?? 0;
    totals[currency].paid += row.paid ?? 0;
    totals[currency].balance += row.balance ?? 0;
  });

  return totals;
}

function formatCurrencyTotals(totals: Record<string, CurrencyTotalsDTO>): Record<string, CurrencyTotalsDTO> {
  const formatted: Record<string, CurrencyTotalsDTO> = {};
  Object.entries(totals).forEach(([currency, values]) => {
    formatted[currency] = {
      due: Number((values.due ?? 0).toFixed(2)),
      paid: Number((values.paid ?? 0).toFixed(2)),
      balance: Number(Math.max(values.balance ?? 0, 0).toFixed(2)),
    };
  });
  return formatted;
}

async function listOutstandingInvoices(userId: string): Promise<DuesInvoiceDTO[]> {
  const docs = await DuesInvoiceModel.find({ userId, status: { $in: ['unpaid', 'part_paid'] } })
    .sort({ periodStart: -1, createdAt: -1 })
    .lean<DuesInvoiceDoc[]>()
    .exec();

  const schemeIds = Array.from(new Set(docs.map((invoice) => invoice.schemeId?.toString()).filter(Boolean)));
  const schemes = schemeIds.length
    ? await DuesSchemeModel.find({
        _id: { $in: schemeIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)) },
      })
        .lean<DuesSchemeDoc[]>()
        .exec()
    : [];
  const schemeMap = new Map(schemes.map((scheme) => [scheme._id.toString(), scheme]));

  return docs.map((doc) => {
    const paidAmount = doc.paidAmount ?? 0;
    const scheme = schemeMap.get(doc.schemeId.toString());
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      amount: doc.amount,
      currency: doc.currency ?? 'NGN',
      status: doc.status,
      periodStart: doc.periodStart?.toISOString(),
      scheme: scheme ? { id: scheme._id.toString(), title: scheme.title } : undefined,
      paidAmount,
      balance: Number(Math.max(doc.amount - paidAmount, 0).toFixed(2)),
    };
  });
}

async function buildMemberDuesSummary(userId: string): Promise<DuesSummaryDTO> {
  const currentYear = new Date().getFullYear();
  const invoices = await DuesInvoiceModel.find({ userId }).lean<DuesInvoiceDoc[]>().exec();

  const schemeIds = Array.from(new Set(invoices.map((invoice) => invoice.schemeId?.toString()).filter(Boolean)));
  const schemes = schemeIds.length
    ? await DuesSchemeModel.find({
        _id: { $in: schemeIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)) },
      })
        .lean<DuesSchemeDoc[]>()
        .exec()
    : [];
  const schemeMap = new Map(schemes.map((scheme) => [scheme._id.toString(), scheme]));

  const invoiceIds = invoices.map((invoice) => invoice._id).filter(Boolean);
  const payments = invoiceIds.length
    ? await PaymentModel.find({ 'applications.invoiceId': { $in: invoiceIds } }).lean<PaymentDoc[]>().exec()
    : [];
  const appliedMap = calculateAppliedTotals(payments);

  const currentYearInvoices = invoices.filter(
    (invoice) => Boolean(invoice.periodStart && invoice.periodStart.getFullYear() === currentYear),
  );
  const schemeRows = buildSchemeSummaryRows(currentYearInvoices, schemeMap, appliedMap);
  const totalsByCurrency = formatCurrencyTotals(aggregateCurrencyRows(schemeRows));

  const priorRows = buildPriorOutstandingRows(invoices, appliedMap, currentYear);
  const priorTotals = formatCurrencyTotals(aggregateCurrencyRows(priorRows));

  const primaryCurrency = Object.keys(totalsByCurrency)[0] ?? Object.keys(priorTotals)[0] ?? 'NGN';
  if (Object.keys(totalsByCurrency).length === 0) {
    totalsByCurrency[primaryCurrency] = emptyTotals();
  }

  return {
    year: currentYear,
    schemes: schemeRows,
    totalsByCurrency,
    primaryCurrency,
    hasData: schemeRows.length > 0,
    priorOutstandingByCurrency: priorTotals,
    hasPriorOutstanding: Object.values(priorTotals).some((totals) => totals.balance > 0),
  };
}

async function listWelfareCasesForUser(actorId: string): Promise<WelfareCaseDTO[]> {
  const [managedBranches, managedClasses, branchMemberships, classMembership] = await Promise.all([
    managedBranchIds(actorId),
    managedClassIds(actorId),
    BranchMembershipModel.find({ userId: actorId, status: 'approved' })
      .select('branchId')
      .lean<Array<{ branchId: string }>>()
      .exec(),
    ClassMembershipModel.findOne({ userId: actorId }).select('classId').lean<{ classId?: string }>().exec(),
  ]);

  const readableBranches = new Set(managedBranches);
  branchMemberships.forEach((membership) => readableBranches.add(membership.branchId));
  const readableClasses = new Set(managedClasses);
  if (classMembership?.classId) {
    readableClasses.add(classMembership.classId);
  }

  const scopeQuery: Record<string, unknown>[] = [{ scopeType: 'global' }];
  if (readableBranches.size > 0) {
    scopeQuery.push({ scopeType: 'branch', scopeId: { $in: Array.from(readableBranches) } });
  }
  if (readableClasses.size > 0) {
    scopeQuery.push({ scopeType: 'class', scopeId: { $in: Array.from(readableClasses) } });
  }

  const docs = await WelfareCaseModel.find({
    status: 'open',
    $or: scopeQuery,
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return docs.map((doc) => ({
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
  }));
}

async function listAnnouncementsForUser(branchIds: string[], classId: string | null) {
  const scopes: Record<string, unknown>[] = [{ scopeType: 'global' }];
  if (branchIds.length > 0) {
    scopes.push({ scopeType: 'branch', scopeId: { $in: branchIds } });
  }
  if (classId) {
    scopes.push({ scopeType: 'class', scopeId: classId });
  }

  const docs = await AnnouncementModel.find({
    status: 'published',
    publishedAt: { $lte: new Date() },
    $or: scopes,
  })
    .sort({ publishedAt: -1 })
    .limit(5)
    .lean()
    .exec();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    body: doc.body,
    scopeType: doc.scopeType,
    scopeId: doc.scopeId ?? null,
    publishedAt: doc.publishedAt?.toISOString(),
    status: doc.status ?? 'draft',
  }));
}

async function listEventsForUser(branchIds: string[], classId: string | null) {
  const scopes: Record<string, unknown>[] = [{ scopeType: 'global' }];
  if (branchIds.length > 0) {
    scopes.push({ scopeType: 'branch', scopeId: { $in: branchIds } });
  }
  if (classId) {
    scopes.push({ scopeType: 'class', scopeId: classId });
  }

  const docs = await EventModel.find({
    status: 'published',
    startAt: { $gte: new Date() },
    $or: scopes,
  })
    .sort({ startAt: 1 })
    .limit(5)
    .lean()
    .exec();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? null,
    scopeType: doc.scopeType,
    scopeId: doc.scopeId ?? null,
    location: doc.location ?? null,
    startAt: doc.startAt?.toISOString(),
    endAt: doc.endAt?.toISOString(),
    status: doc.status,
  }));
}

export async function buildDashboardSummary(userId: string): Promise<DashboardSummaryDTO> {
  const [userDoc, branches, branchMemberships, classMembership, outstandingInvoices, welfareCases, duesSummary] =
    await Promise.all([
      UserModel.findById(userId).select('name email phone status').exec(),
      BranchModel.find().sort({ name: 1 }).exec(),
      BranchMembershipModel.find({ userId }).sort({ requestedAt: -1, createdAt: -1 }).exec(),
      ClassMembershipModel.findOne({ userId }).exec(),
      listOutstandingInvoices(userId),
      listWelfareCasesForUser(userId),
      buildMemberDuesSummary(userId),
    ]);

  const approvedBranchIds = branchMemberships
    .filter((membership) => membership.status === 'approved')
    .map((membership) => membership.branchId);
  const classId = classMembership?.classId ?? null;

  const [announcements, events] = await Promise.all([
    listAnnouncementsForUser(approvedBranchIds, classId),
    listEventsForUser(approvedBranchIds, classId),
  ]);

  return {
    user: userDoc ? toUserDto(userDoc) : null,
    branches: branches.map((branch) => toBranchDto(branch)),
    branchMemberships: branchMemberships.map((membership) => toBranchMembershipDto(membership)),
    classMembership: classMembership ? toClassMembershipDto(classMembership) : null,
    outstandingInvoices,
    welfareCases,
    announcements,
    events,
    duesSummary,
  };
}

