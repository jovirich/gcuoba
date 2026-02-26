import type {
  BranchDTO,
  ClassLedgerDTO,
  ClassSetDTO,
  DuesInvoiceDTO,
  DuesSchemeDTO,
  ExpenseDTO,
  FinanceAdminSummaryDTO,
  FinanceReportDTO,
  FinanceReportFiltersDTO,
  FinanceReportRowDTO,
  FinanceReportScopeAccessDTO,
  FinanceReportSnapshotCaptureDTO,
  FinanceReportSnapshotDTO,
  FinanceReportTotalsDTO,
  LedgerTotalsDTO,
  LedgerTransactionDTO,
  MemberLedgerDTO,
  PaymentDTO,
  PaymentReceiptDTO,
  ProjectDTO,
} from '@gcuoba/types';
import { Types } from 'mongoose';
import { ApiError } from './api-error';
import { hasGlobalAccess, managedBranchIds, managedClassIds } from './authorization';
import { recordAuditLog } from './audit-logs';
import { userHasFeature } from './roles';
import {
  BranchMembershipModel,
  BranchModel,
  ClassMembershipModel,
  ClassModel,
  DuesInvoiceModel,
  DuesSchemeModel,
  ExpenseModel,
  FinanceReportSnapshotModel,
  PaymentModel,
  PaymentReceiptModel,
  ProjectModel,
  UserModel,
  WelfareContributionModel,
  WelfarePayoutModel,
  type DuesInvoiceDoc,
  type DuesSchemeDoc,
  type ExpenseDoc,
  type FinanceReportSnapshotDoc,
  type PaymentDoc,
  type PaymentReceiptDoc,
  type ProjectDoc,
} from './models';
import { createNotificationForUser } from './notifications';

type ScopeType = 'global' | 'branch' | 'class';
type ScopeAccess = { hasGlobal: boolean; branchIds: string[]; classIds: string[] };
type ReportFilters = { year?: number; month?: number; scopeType?: ScopeType; scopeId?: string | null };

function toSchemeDto(doc: DuesSchemeDoc): DuesSchemeDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    amount: doc.amount,
    currency: doc.currency,
    frequency: doc.frequency,
    scopeType: doc.scope_type,
    scopeId: doc.scope_id ?? null,
    status: doc.status,
  };
}

function mapSchemeRef(populated: unknown): { id: string; title: string } | undefined {
  if (!populated || typeof populated !== 'object') {
    return undefined;
  }
  const row = populated as { _id?: Types.ObjectId; title?: string };
  if (!row._id || !row.title) {
    return undefined;
  }
  return { id: row._id.toString(), title: row.title };
}

function toInvoiceDto(doc: DuesInvoiceDoc, userName?: string): DuesInvoiceDTO {
  const paidAmount = Number(doc.paidAmount ?? 0);
  const amount = Number(doc.amount ?? 0);
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    userName,
    amount,
    currency: doc.currency ?? 'NGN',
    status: doc.status,
    periodStart: doc.periodStart?.toISOString(),
    scheme: mapSchemeRef(doc.schemeId),
    paidAmount: Number(paidAmount.toFixed(2)),
    balance: Number(Math.max(amount - paidAmount, 0).toFixed(2)),
  };
}

function toPaymentDto(doc: PaymentDoc): PaymentDTO {
  return {
    id: doc._id.toString(),
    payerUserId: doc.payerUserId,
    amount: Number(doc.amount ?? 0),
    currency: doc.currency ?? 'NGN',
    channel: doc.channel,
    reference: doc.reference ?? undefined,
    scopeType: doc.scopeType,
    scopeId: doc.scopeId ?? null,
    notes: doc.notes ?? undefined,
    status: doc.status ?? 'completed',
    paidAt: doc.paidAt?.toISOString(),
    applications:
      doc.applications?.map((row) => ({
        invoiceId: row.invoiceId?.toString?.() ?? '',
        amount: Number(row.amount ?? 0),
      })) ?? [],
  };
}

function toProjectDto(doc: ProjectDoc, ownerName?: string): ProjectDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    scopeType: doc.scope_type,
    scopeId: doc.scope_id ?? null,
    budget: doc.budget ?? null,
    actualSpend: Number(doc.actual_spend ?? 0),
    startDate: doc.start_date?.toISOString() ?? null,
    endDate: doc.end_date?.toISOString() ?? null,
    status: doc.status ?? 'planning',
    ownerId: doc.owner_id ?? null,
    ownerName,
  };
}

function toExpenseDto(
  doc: ExpenseDoc,
  userNameMap: Map<string, string>,
  projectNameMap: Map<string, string>,
): ExpenseDTO {
  const projectId = doc.project_id?.toString() ?? null;
  const submittedBy = doc.submitted_by ?? null;
  return {
    id: doc._id.toString(),
    scopeType: doc.scope_type,
    scopeId: doc.scope_id ?? null,
    projectId,
    projectName: projectId ? projectNameMap.get(projectId) : undefined,
    title: doc.title,
    description: doc.description ?? null,
    notes: doc.notes ?? null,
    amount: Number(doc.amount ?? 0),
    currency: doc.currency ?? 'NGN',
    status: doc.status ?? 'pending',
    approvalStage: doc.approval_stage ?? 'pending',
    submittedBy,
    submittedByName: submittedBy ? userNameMap.get(submittedBy) : undefined,
    approvedBy: doc.approved_by ?? null,
    approvedAt: doc.approved_at?.toISOString() ?? null,
    firstApprovedBy: doc.first_approved_by ?? null,
    firstApprovedAt: doc.first_approved_at?.toISOString() ?? null,
    secondApprovedBy: doc.second_approved_by ?? null,
    secondApprovedAt: doc.second_approved_at?.toISOString() ?? null,
    rejectedBy: doc.rejected_by ?? null,
    rejectedAt: doc.rejected_at?.toISOString() ?? null,
    createdAt: (doc as ExpenseDoc & { createdAt?: Date }).createdAt?.toISOString(),
  };
}

function toSnapshotDto(doc: FinanceReportSnapshotDoc): FinanceReportSnapshotDTO {
  return {
    id: doc._id.toString(),
    period: doc.period,
    year: doc.year,
    month: doc.month,
    scopeType: doc.scopeType,
    scopeId: doc.scopeId ?? null,
    totalsByCurrency: formatReportTotals(doc.totalsByCurrency ?? {}),
    rowCount: doc.rowCount ?? 0,
    generatedAt: doc.generatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

async function loadScopeAccess(actorId: string): Promise<ScopeAccess> {
  const [global, branches, classes] = await Promise.all([
    hasGlobalAccess(actorId),
    managedBranchIds(actorId),
    managedClassIds(actorId),
  ]);
  return { hasGlobal: global, branchIds: branches, classIds: classes };
}

function scopedFilter(scope: ScopeAccess, scopeTypeField: string, scopeIdField: string): Record<string, unknown> {
  if (scope.hasGlobal) {
    return {};
  }
  const clauses: Array<Record<string, unknown>> = [];
  if (scope.branchIds.length > 0) {
    clauses.push({ [scopeTypeField]: 'branch', [scopeIdField]: { $in: scope.branchIds } });
  }
  if (scope.classIds.length > 0) {
    clauses.push({ [scopeTypeField]: 'class', [scopeIdField]: { $in: scope.classIds } });
  }
  if (clauses.length === 0) {
    return { _id: { $in: [] } };
  }
  return { $or: clauses };
}

function ensureScopeReadable(scope: ScopeAccess, scopeType: ScopeType, scopeId?: string | null): void {
  if (scope.hasGlobal) {
    return;
  }
  if (scopeType === 'global') {
    throw new ApiError(403, 'Not authorized for global scope', 'Forbidden');
  }
  if (!scopeId) {
    throw new ApiError(400, 'scopeId is required', 'BadRequest');
  }
  if (scopeType === 'branch' && !scope.branchIds.includes(scopeId)) {
    throw new ApiError(403, 'Not authorized for this branch scope', 'Forbidden');
  }
  if (scopeType === 'class' && !scope.classIds.includes(scopeId)) {
    throw new ApiError(403, 'Not authorized for this class scope', 'Forbidden');
  }
}

function ensureScopeWritable(scope: ScopeAccess, scopeType: ScopeType, scopeId: string | null): void {
  if (scope.hasGlobal) {
    return;
  }
  if (scopeType === 'global') {
    throw new ApiError(403, 'Not authorized for global scope', 'Forbidden');
  }
  ensureScopeReadable(scope, scopeType, scopeId);
}

async function ensureFeature(actorId: string, moduleKey: string, scopeType?: ScopeType, scopeId?: string | null) {
  const allowed = await userHasFeature(actorId, moduleKey, scopeType, scopeId ?? null);
  if (!allowed) {
    throw new ApiError(403, `Not authorized for ${moduleKey} actions`, 'Forbidden');
  }
}

async function validateScope(scopeType: ScopeType, scopeId: string | null): Promise<void> {
  if (scopeType === 'global') {
    return;
  }
  if (!scopeId) {
    throw new ApiError(400, `scopeId is required for ${scopeType} scope`, 'BadRequest');
  }
  if (!Types.ObjectId.isValid(scopeId)) {
    throw new ApiError(400, 'Invalid scopeId', 'BadRequest');
  }
  if (scopeType === 'branch') {
    const exists = await BranchModel.exists({ _id: scopeId });
    if (!exists) {
      throw new ApiError(400, 'Branch not found for scopeId', 'BadRequest');
    }
    return;
  }
  const exists = await ClassModel.exists({ _id: scopeId });
  if (!exists) {
    throw new ApiError(400, 'Class not found for scopeId', 'BadRequest');
  }
}

async function buildUserNameMap(ids: string[]): Promise<Map<string, string>> {
  const valid = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  if (valid.length === 0) {
    return new Map();
  }
  const rows = await UserModel.find({ _id: { $in: valid } })
    .select('name')
    .lean<Array<{ _id: Types.ObjectId; name?: string }>>()
    .exec();
  const map = new Map<string, string>();
  rows.forEach((row) => {
    if (row.name) {
      map.set(row._id.toString(), row.name);
    }
  });
  return map;
}

async function toInvoicesWithUsers(docs: DuesInvoiceDoc[]): Promise<DuesInvoiceDTO[]> {
  const userNameMap = await buildUserNameMap([...new Set(docs.map((doc) => doc.userId))]);
  return docs.map((doc) => toInvoiceDto(doc, userNameMap.get(doc.userId)));
}

async function ensureMemberLedgerAccess(actorId: string, memberId: string): Promise<void> {
  if (actorId === memberId || (await hasGlobalAccess(actorId))) {
    return;
  }

  const [classMembership, branchMemberships] = await Promise.all([
    ClassMembershipModel.findOne({ userId: memberId }).select('classId').lean<{ classId?: string }>().exec(),
    BranchMembershipModel.find({ userId: memberId, status: 'approved' })
      .select('branchId')
      .lean<Array<{ branchId: string }>>()
      .exec(),
  ]);

  if (classMembership?.classId) {
    const classAllowed = await userHasFeature(actorId, 'members', 'class', classMembership.classId);
    if (classAllowed) {
      return;
    }
  }

  const branchChecks = await Promise.all(
    branchMemberships.map((membership) => userHasFeature(actorId, 'members', 'branch', membership.branchId)),
  );
  if (branchChecks.some(Boolean)) {
    return;
  }

  throw new ApiError(403, 'Not authorized for this member ledger', 'Forbidden');
}

async function ensureClassLedgerAccess(actorId: string, classId: string): Promise<void> {
  if (await hasGlobalAccess(actorId)) {
    return;
  }
  const classes = await managedClassIds(actorId);
  if (!classes.includes(classId)) {
    throw new ApiError(403, 'Not authorized for this class ledger', 'Forbidden');
  }
}

function reportRange(year?: number, month?: number) {
  if (year === undefined) {
    return null;
  }
  const start = month !== undefined ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const end = month !== undefined ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
  return { start, end };
}

async function normalizeReportFilters(filters: FinanceReportFiltersDTO): Promise<ReportFilters> {
  const year = filters.year;
  const month = filters.month;
  if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
    throw new ApiError(400, 'Invalid report year', 'BadRequest');
  }
  if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
    throw new ApiError(400, 'Invalid report month', 'BadRequest');
  }
  if (month !== undefined && year === undefined) {
    throw new ApiError(400, 'year is required when month is provided', 'BadRequest');
  }
  if (!filters.scopeType) {
    return { year, month };
  }
  if (filters.scopeType === 'global') {
    return { year, month, scopeType: 'global', scopeId: null };
  }
  const scopeId = filters.scopeId ?? null;
  await validateScope(filters.scopeType, scopeId);
  return { year, month, scopeType: filters.scopeType, scopeId };
}

function formatReportTotals(input: Record<string, FinanceReportTotalsDTO>): Record<string, FinanceReportTotalsDTO> {
  const out: Record<string, FinanceReportTotalsDTO> = {};
  Object.entries(input).forEach(([currency, totals]) => {
    out[currency] = {
      billed: Number((totals.billed ?? 0).toFixed(2)),
      paid: Number((totals.paid ?? 0).toFixed(2)),
      outstanding: Number((totals.outstanding ?? 0).toFixed(2)),
    };
  });
  return out;
}

async function reportRows(filters: ReportFilters): Promise<{ rows: FinanceReportRowDTO[]; totals: Record<string, FinanceReportTotalsDTO> }> {
  const invoiceQuery: Record<string, unknown> = {};
  const paymentQuery: Record<string, unknown> = {};
  const range = reportRange(filters.year, filters.month);
  if (range) {
    invoiceQuery.periodStart = { $gte: range.start, $lt: range.end };
    paymentQuery.paidAt = { $gte: range.start, $lt: range.end };
  }

  if (filters.scopeType && filters.scopeType !== 'global') {
    paymentQuery.scopeType = filters.scopeType;
    paymentQuery.scopeId = filters.scopeId ?? null;
    const schemeRows = await DuesSchemeModel.find({ scope_type: filters.scopeType, scope_id: filters.scopeId ?? null })
      .select('_id')
      .lean<Array<{ _id: Types.ObjectId }>>()
      .exec();
    invoiceQuery.schemeId = { $in: schemeRows.map((row) => row._id) };
  }

  const [invoices, payments] = await Promise.all([
    DuesInvoiceModel.find(invoiceQuery)
      .select('userId amount paidAmount currency')
      .lean<Array<{ userId: string; amount: number; paidAmount?: number; currency?: string }>>()
      .exec(),
    PaymentModel.find(paymentQuery)
      .select('payerUserId currency')
      .lean<Array<{ payerUserId: string; currency?: string }>>()
      .exec(),
  ]);

  const totals: Record<string, FinanceReportTotalsDTO> = {};
  const rowsMap = new Map<string, FinanceReportRowDTO>();
  const userIds = new Set<string>();

  invoices.forEach((invoice) => {
    const currency = invoice.currency ?? 'NGN';
    const key = `${invoice.userId}|${currency}`;
    const row = rowsMap.get(key) ?? {
      userId: invoice.userId,
      currency,
      invoices: 0,
      payments: 0,
      billed: 0,
      paid: 0,
      outstanding: 0,
    };
    const billed = Number(invoice.amount ?? 0);
    const paid = Number(invoice.paidAmount ?? 0);
    const outstanding = Math.max(billed - paid, 0);
    row.invoices += 1;
    row.billed += billed;
    row.paid += paid;
    row.outstanding += outstanding;
    rowsMap.set(key, row);
    userIds.add(invoice.userId);

    if (!totals[currency]) {
      totals[currency] = { billed: 0, paid: 0, outstanding: 0 };
    }
    totals[currency].billed += billed;
    totals[currency].paid += paid;
    totals[currency].outstanding += outstanding;
  });

  payments.forEach((payment) => {
    const currency = payment.currency ?? 'NGN';
    const key = `${payment.payerUserId}|${currency}`;
    const row = rowsMap.get(key) ?? {
      userId: payment.payerUserId,
      currency,
      invoices: 0,
      payments: 0,
      billed: 0,
      paid: 0,
      outstanding: 0,
    };
    row.payments += 1;
    rowsMap.set(key, row);
    userIds.add(payment.payerUserId);
  });

  const userNameMap = await buildUserNameMap([...userIds]);
  const rows = Array.from(rowsMap.values()).map((row) => ({
    ...row,
    userName: userNameMap.get(row.userId),
    billed: Number(row.billed.toFixed(2)),
    paid: Number(row.paid.toFixed(2)),
    outstanding: Number(row.outstanding.toFixed(2)),
  }));

  return { rows, totals: formatReportTotals(totals) };
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function expenseIdsForUser(doc: ExpenseDoc): string[] {
  return [doc.submitted_by, doc.approved_by, doc.first_approved_by, doc.second_approved_by, doc.rejected_by].filter(
    (value): value is string => Boolean(value),
  );
}

async function mapExpenses(docs: ExpenseDoc[]): Promise<ExpenseDTO[]> {
  const userIds = [...new Set(docs.flatMap((doc) => expenseIdsForUser(doc)))];
  const projectIds = [...new Set(docs.map((doc) => doc.project_id?.toString()).filter(Boolean) as string[])];
  const [userNameMap, projects] = await Promise.all([
    buildUserNameMap(userIds),
    projectIds.length > 0
      ? ProjectModel.find({ _id: { $in: projectIds.map((id) => new Types.ObjectId(id)) } })
          .select('_id name')
          .lean<Array<{ _id: Types.ObjectId; name: string }>>()
          .exec()
      : Promise.resolve([]),
  ]);
  const projectNameMap = new Map(projects.map((project) => [project._id.toString(), project.name]));
  return docs.map((doc) => toExpenseDto(doc, userNameMap, projectNameMap));
}

export async function getAdminSummary(actorId: string): Promise<FinanceAdminSummaryDTO> {
  const scope = await loadScopeAccess(actorId);
  if (!scope.hasGlobal && scope.branchIds.length === 0 && scope.classIds.length === 0) {
    throw new ApiError(403, 'Not authorized', 'Forbidden');
  }

  const [canDues, canPayments, canProjects, canExpenses] = await Promise.all([
    userHasFeature(actorId, 'dues'),
    userHasFeature(actorId, 'payments'),
    userHasFeature(actorId, 'projects'),
    userHasFeature(actorId, 'expenses'),
  ]);
  if (!(canDues || canPayments || canProjects || canExpenses)) {
    throw new ApiError(403, 'Not authorized', 'Forbidden');
  }

  const [schemes, invoices, payments, projects, expenses] = await Promise.all([
    canDues
      ? DuesSchemeModel.find(scopedFilter(scope, 'scope_type', 'scope_id')).sort({ title: 1 }).exec()
      : Promise.resolve([]),
    canDues
      ? DuesInvoiceModel.find(
          scope.hasGlobal
            ? {}
            : {
                schemeId: {
                  $in: await DuesSchemeModel.find(scopedFilter(scope, 'scope_type', 'scope_id'))
                    .select('_id')
                    .lean<Array<{ _id: Types.ObjectId }>>()
                    .exec()
                    .then((rows) => rows.map((row) => row._id)),
                },
              },
        )
          .populate('schemeId')
          .sort({ createdAt: -1 })
          .exec()
      : Promise.resolve([]),
    canPayments
      ? PaymentModel.find(scopedFilter(scope, 'scopeType', 'scopeId')).sort({ paidAt: -1, createdAt: -1 }).exec()
      : Promise.resolve([]),
    canProjects
      ? ProjectModel.find(scopedFilter(scope, 'scope_type', 'scope_id')).sort({ createdAt: -1 }).exec()
      : Promise.resolve([]),
    canExpenses
      ? ExpenseModel.find(scopedFilter(scope, 'scope_type', 'scope_id')).sort({ createdAt: -1 }).exec()
      : Promise.resolve([]),
  ]);

  const [invoiceDtos, ownerMap, expenseDtos] = await Promise.all([
    toInvoicesWithUsers(invoices),
    buildUserNameMap(projects.map((project) => project.owner_id).filter((value): value is string => Boolean(value))),
    mapExpenses(expenses),
  ]);

  return {
    schemes: schemes.map((scheme) => toSchemeDto(scheme)),
    invoices: invoiceDtos,
    payments: payments.map((payment) => toPaymentDto(payment)),
    projects: projects.map((project) => toProjectDto(project, ownerMap.get(project.owner_id ?? ''))),
    expenses: expenseDtos,
  };
}

export async function getOverviewReport(filters: FinanceReportFiltersDTO): Promise<FinanceReportDTO> {
  const normalized = await normalizeReportFilters(filters);
  const { rows, totals } = await reportRows(normalized);
  return {
    generatedAt: new Date().toISOString(),
    filters: {
      year: normalized.year,
      month: normalized.month,
      scopeType: normalized.scopeType,
      scopeId: normalized.scopeId ?? null,
    },
    totalsByCurrency: totals,
    rows: rows.sort((a, b) => b.outstanding - a.outstanding),
  };
}

export async function exportOverviewReportCsv(filters: FinanceReportFiltersDTO): Promise<{ filename: string; content: string }> {
  const report = await getOverviewReport(filters);
  const rows = [
    ['User ID', 'User Name', 'Currency', 'Invoices', 'Payments', 'Billed', 'Paid', 'Outstanding'],
    ...report.rows.map((row) => [
      row.userId,
      row.userName ?? '',
      row.currency,
      String(row.invoices),
      String(row.payments),
      row.billed.toFixed(2),
      row.paid.toFixed(2),
      row.outstanding.toFixed(2),
    ]),
  ];
  const content = rows.map((row) => row.map((value) => csvEscape(value)).join(',')).join('\n');
  return { filename: 'finance-overview-report.csv', content };
}

export async function getReportScopeAccess(actorId: string): Promise<FinanceReportScopeAccessDTO> {
  const [global, branchIds, classIds, branches, classes] = await Promise.all([
    hasGlobalAccess(actorId),
    managedBranchIds(actorId),
    managedClassIds(actorId),
    BranchModel.find().sort({ name: 1 }).lean<Array<{ _id: Types.ObjectId; name: string; country?: string | null }>>().exec(),
    ClassModel.find()
      .sort({ entryYear: 1, label: 1 })
      .lean<Array<{ _id: Types.ObjectId; label: string; entryYear: number; status: 'active' | 'inactive' }>>()
      .exec(),
  ]);
  const branchDtos: BranchDTO[] = branches.map((branch) => ({
    id: branch._id.toString(),
    name: branch.name,
    country: branch.country ?? undefined,
  }));
  const classDtos: ClassSetDTO[] = classes.map((classSet) => ({
    id: classSet._id.toString(),
    label: classSet.label,
    entryYear: classSet.entryYear,
    status: classSet.status,
  }));
  return {
    hasGlobalAccess: global,
    branches: global ? branchDtos : branchDtos.filter((branch) => branchIds.includes(branch.id)),
    classes: global ? classDtos : classDtos.filter((classSet) => classIds.includes(classSet.id)),
  };
}

export async function getScopedOverviewReport(actorId: string, filters: FinanceReportFiltersDTO): Promise<FinanceReportDTO> {
  if (!filters.scopeType) {
    throw new ApiError(400, 'scopeType is required', 'BadRequest');
  }
  const normalized = await normalizeReportFilters(filters);
  if (!normalized.scopeType) {
    throw new ApiError(400, 'scopeType is required', 'BadRequest');
  }
  const scope = await loadScopeAccess(actorId);
  ensureScopeReadable(scope, normalized.scopeType, normalized.scopeId ?? null);
  return getOverviewReport(normalized);
}

export async function exportScopedOverviewReportCsv(
  actorId: string,
  filters: FinanceReportFiltersDTO,
): Promise<{ filename: string; content: string }> {
  const report = await getScopedOverviewReport(actorId, filters);
  const rows = [
    ['User ID', 'User Name', 'Currency', 'Invoices', 'Payments', 'Billed', 'Paid', 'Outstanding'],
    ...report.rows.map((row) => [
      row.userId,
      row.userName ?? '',
      row.currency,
      String(row.invoices),
      String(row.payments),
      row.billed.toFixed(2),
      row.paid.toFixed(2),
      row.outstanding.toFixed(2),
    ]),
  ];
  return {
    filename: 'finance-scoped-report.csv',
    content: rows.map((row) => row.map((value) => csvEscape(value)).join(',')).join('\n'),
  };
}

function snapshotPeriod(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new ApiError(400, 'Invalid snapshot year', 'BadRequest');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new ApiError(400, 'Invalid snapshot month', 'BadRequest');
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export async function captureMonthlySnapshots(
  actorId: string,
  year?: number,
  month?: number,
): Promise<FinanceReportSnapshotCaptureDTO> {
  if (!(await hasGlobalAccess(actorId))) {
    throw new ApiError(403, 'Not authorized for snapshot capture', 'Forbidden');
  }
  const now = new Date();
  const resolvedYear = year ?? now.getFullYear();
  const resolvedMonth = month ?? now.getMonth() + 1;
  const period = snapshotPeriod(resolvedYear, resolvedMonth);

  const [branches, classes] = await Promise.all([
    BranchModel.find().select('_id').lean<Array<{ _id: Types.ObjectId }>>().exec(),
    ClassModel.find().select('_id').lean<Array<{ _id: Types.ObjectId }>>().exec(),
  ]);
  const scopes: Array<{ scopeType: ScopeType; scopeId?: string | null }> = [
    { scopeType: 'global', scopeId: null },
    ...branches.map((branch) => ({ scopeType: 'branch' as const, scopeId: branch._id.toString() })),
    ...classes.map((classSet) => ({ scopeType: 'class' as const, scopeId: classSet._id.toString() })),
  ];

  const snapshots: FinanceReportSnapshotDTO[] = [];
  for (const target of scopes) {
    const report = await getOverviewReport({
      year: resolvedYear,
      month: resolvedMonth,
      scopeType: target.scopeType,
      scopeId: target.scopeId ?? null,
    });
    const doc = await FinanceReportSnapshotModel.findOneAndUpdate(
      { period, scopeType: target.scopeType, scopeId: target.scopeId ?? null },
      {
        $set: {
          period,
          year: resolvedYear,
          month: resolvedMonth,
          scopeType: target.scopeType,
          scopeId: target.scopeId ?? null,
          totalsByCurrency: report.totalsByCurrency,
          rowCount: report.rows.length,
          generatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
    snapshots.push(toSnapshotDto(doc));
  }

  await recordAuditLog({
    actorUserId: actorId,
    action: 'finance_snapshots.captured',
    resourceType: 'finance_report_snapshot',
    resourceId: period,
    scopeType: 'global',
    scopeId: null,
    metadata: { period, count: snapshots.length },
  });

  return { period, snapshots };
}

export async function listReportSnapshots(
  actorId: string,
  options?: { scopeType?: ScopeType; scopeId?: string | null; limit?: number },
): Promise<FinanceReportSnapshotDTO[]> {
  const scope = await loadScopeAccess(actorId);
  const query: Record<string, unknown> = {};
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);

  if (options?.scopeType) {
    if (options.scopeType === 'global') {
      if (!scope.hasGlobal) {
        throw new ApiError(403, 'Not authorized for global snapshots', 'Forbidden');
      }
      query.scopeType = 'global';
      query.scopeId = null;
    } else if (options.scopeId) {
      ensureScopeReadable(scope, options.scopeType, options.scopeId);
      query.scopeType = options.scopeType;
      query.scopeId = options.scopeId;
    } else if (!scope.hasGlobal) {
      query.scopeType = options.scopeType;
      query.scopeId = { $in: options.scopeType === 'branch' ? scope.branchIds : scope.classIds };
    } else {
      query.scopeType = options.scopeType;
    }
  } else if (!scope.hasGlobal) {
    query.$or = [
      { scopeType: 'branch', scopeId: { $in: scope.branchIds } },
      { scopeType: 'class', scopeId: { $in: scope.classIds } },
    ];
  }

  const docs = await FinanceReportSnapshotModel.find(query).sort({ period: -1, generatedAt: -1 }).limit(limit).exec();
  return docs.map((doc) => toSnapshotDto(doc));
}

export async function listSchemes(actorId: string, activeOnly = true): Promise<DuesSchemeDTO[]> {
  await ensureFeature(actorId, 'dues');
  const scope = await loadScopeAccess(actorId);
  const query = scope.hasGlobal
    ? activeOnly
      ? { status: 'active' }
      : {}
    : { ...(activeOnly ? { status: 'active' } : {}), ...scopedFilter(scope, 'scope_type', 'scope_id') };
  const docs = await DuesSchemeModel.find(query).sort({ title: 1 }).exec();
  return docs.map((doc) => toSchemeDto(doc));
}

export async function createScheme(actorId: string, payload: Partial<DuesSchemeDTO>): Promise<DuesSchemeDTO> {
  const scopeType = payload.scopeType;
  const scopeId = scopeType === 'global' ? null : payload.scopeId?.trim() || null;
  const title = payload.title?.trim();
  const amount = Number(payload.amount ?? 0);
  if (!scopeType || !title || !Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Missing or invalid required fields', 'BadRequest');
  }
  await ensureFeature(actorId, 'dues', scopeType, scopeId);
  const scope = await loadScopeAccess(actorId);
  ensureScopeWritable(scope, scopeType, scopeId);
  await validateScope(scopeType, scopeId);
  const doc = await DuesSchemeModel.create({
    title,
    amount,
    currency: payload.currency?.trim().toUpperCase() || 'NGN',
    frequency: payload.frequency ?? 'annual',
    scope_type: scopeType,
    scope_id: scopeId,
    status: payload.status ?? 'active',
  });
  return toSchemeDto(doc);
}

export async function updateScheme(actorId: string, schemeId: string, payload: Partial<DuesSchemeDTO>): Promise<DuesSchemeDTO> {
  if (!Types.ObjectId.isValid(schemeId)) {
    throw new ApiError(404, 'Dues scheme not found', 'NotFound');
  }
  const doc = await DuesSchemeModel.findById(schemeId).exec();
  if (!doc) {
    throw new ApiError(404, 'Dues scheme not found', 'NotFound');
  }
  const scope = await loadScopeAccess(actorId);
  ensureScopeReadable(scope, doc.scope_type, doc.scope_id);
  await ensureFeature(actorId, 'dues', doc.scope_type, doc.scope_id ?? null);
  if (payload.title !== undefined) doc.title = payload.title.trim();
  if (payload.amount !== undefined) doc.amount = Number(payload.amount);
  if (payload.currency !== undefined) doc.currency = payload.currency.trim().toUpperCase() || 'NGN';
  if (payload.frequency !== undefined) doc.frequency = payload.frequency;
  if (payload.status !== undefined) doc.status = payload.status;
  await doc.save();
  return toSchemeDto(doc);
}

export async function deleteScheme(actorId: string, schemeId: string): Promise<void> {
  if (!Types.ObjectId.isValid(schemeId)) {
    throw new ApiError(404, 'Dues scheme not found', 'NotFound');
  }
  const doc = await DuesSchemeModel.findById(schemeId).exec();
  if (!doc) {
    throw new ApiError(404, 'Dues scheme not found', 'NotFound');
  }
  const scope = await loadScopeAccess(actorId);
  ensureScopeReadable(scope, doc.scope_type, doc.scope_id);
  await ensureFeature(actorId, 'dues', doc.scope_type, doc.scope_id ?? null);
  await DuesSchemeModel.findByIdAndDelete(doc._id).exec();
}

function periodsForYear(frequency: 'monthly' | 'quarterly' | 'annual' | 'one_off', year: number) {
  if (frequency === 'monthly') {
    return Array.from({ length: 12 }, (_, index) => ({
      start: new Date(Date.UTC(year, index, 1)),
      end: new Date(Date.UTC(year, index + 1, 0)),
    }));
  }
  if (frequency === 'quarterly') {
    return [0, 3, 6, 9].map((month) => ({
      start: new Date(Date.UTC(year, month, 1)),
      end: new Date(Date.UTC(year, month + 3, 0)),
    }));
  }
  if (frequency === 'annual') {
    return [{ start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 11, 31)) }];
  }
  return [{ start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 0, 1)) }];
}

export async function generateSchemeInvoices(actorId: string, schemeId: string, year: number): Promise<{ created: number; skipped: number }> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new ApiError(400, 'Invalid year', 'BadRequest');
  }
  if (!Types.ObjectId.isValid(schemeId)) {
    throw new ApiError(404, 'Dues scheme not found', 'NotFound');
  }
  const scheme = await DuesSchemeModel.findById(schemeId).exec();
  if (!scheme) {
    throw new ApiError(404, 'Dues scheme not found', 'NotFound');
  }
  const scope = await loadScopeAccess(actorId);
  ensureScopeReadable(scope, scheme.scope_type, scheme.scope_id);
  await ensureFeature(actorId, 'dues', scheme.scope_type, scheme.scope_id ?? null);
  if (scheme.scope_type === 'global') {
    throw new ApiError(400, 'Global dues cannot be generated directly to members', 'BadRequest');
  }
  if (!scheme.scope_id) {
    throw new ApiError(400, 'Scheme scope is missing scope_id', 'BadRequest');
  }
  const activeUserIds = await UserModel.find({ status: 'active' })
    .select('_id')
    .lean<Array<{ _id: Types.ObjectId }>>()
    .exec()
    .then((rows) => new Set(rows.map((row) => row._id.toString())));
  const targetUserIds =
    scheme.scope_type === 'class'
      ? await ClassMembershipModel.find({ classId: scheme.scope_id })
          .select('userId')
          .lean<Array<{ userId: string }>>()
          .exec()
          .then((rows) => rows.map((row) => row.userId))
      : await BranchMembershipModel.find({ branchId: scheme.scope_id, status: 'approved' })
          .select('userId')
          .lean<Array<{ userId: string }>>()
          .exec()
          .then((rows) => rows.map((row) => row.userId));
  const users = targetUserIds.filter((id) => activeUserIds.has(id));
  const periods = periodsForYear(scheme.frequency, year);
  const starts = periods.map((period) => period.start);
  const existing = await DuesInvoiceModel.find({ schemeId: scheme._id, userId: { $in: users }, periodStart: { $in: starts } })
    .select('userId periodStart')
    .lean<Array<{ userId: string; periodStart?: Date }>>()
    .exec();
  const existingKeys = new Set(existing.map((row) => `${row.userId}|${row.periodStart?.toISOString() ?? ''}`));
  const rows: Array<{ schemeId: Types.ObjectId; userId: string; amount: number; currency: string; periodStart: Date; periodEnd: Date; status: 'unpaid'; paidAmount: number }> = [];
  let skipped = 0;
  users.forEach((userId) => {
    periods.forEach((period) => {
      const key = `${userId}|${period.start.toISOString()}`;
      if (existingKeys.has(key)) {
        skipped += 1;
      } else {
        rows.push({
          schemeId: scheme._id,
          userId,
          amount: scheme.amount,
          currency: scheme.currency,
          periodStart: period.start,
          periodEnd: period.end,
          status: 'unpaid',
          paidAmount: 0,
        });
      }
    });
  });
  if (rows.length > 0) {
    await DuesInvoiceModel.insertMany(rows);
  }
  return { created: rows.length, skipped };
}

export async function listProjects(actorId: string): Promise<ProjectDTO[]> {
  await ensureFeature(actorId, 'projects');
  const scope = await loadScopeAccess(actorId);
  const docs = await ProjectModel.find(scopedFilter(scope, 'scope_type', 'scope_id')).sort({ createdAt: -1 }).exec();
  const ownerMap = await buildUserNameMap(docs.map((doc) => doc.owner_id).filter((value): value is string => Boolean(value)));
  return docs.map((doc) => toProjectDto(doc, ownerMap.get(doc.owner_id ?? '')));
}

export async function createProject(actorId: string, payload: Partial<ProjectDTO>): Promise<ProjectDTO> {
  const scopeType = payload.scopeType;
  const scopeId = scopeType === 'global' ? null : payload.scopeId?.trim() || null;
  const name = payload.name?.trim();
  if (!scopeType || !name) {
    throw new ApiError(400, 'Missing required fields', 'BadRequest');
  }
  await ensureFeature(actorId, 'projects', scopeType, scopeId);
  const access = await loadScopeAccess(actorId);
  ensureScopeWritable(access, scopeType, scopeId);
  await validateScope(scopeType, scopeId);
  const ownerId = payload.ownerId && access.hasGlobal ? payload.ownerId : actorId;
  const doc = await ProjectModel.create({
    name,
    scope_type: scopeType,
    scope_id: scopeId,
    budget: Number(payload.budget ?? 0),
    actual_spend: 0,
    start_date: payload.startDate ? new Date(payload.startDate) : null,
    end_date: payload.endDate ? new Date(payload.endDate) : null,
    status: payload.status ?? 'planning',
    owner_id: ownerId,
  });
  const ownerName = (await buildUserNameMap([ownerId])).get(ownerId);
  return toProjectDto(doc, ownerName);
}

export async function updateProject(actorId: string, projectId: string, payload: Partial<ProjectDTO>): Promise<ProjectDTO> {
  if (!Types.ObjectId.isValid(projectId)) {
    throw new ApiError(404, 'Project not found', 'NotFound');
  }
  const doc = await ProjectModel.findById(projectId).exec();
  if (!doc) {
    throw new ApiError(404, 'Project not found', 'NotFound');
  }
  const access = await loadScopeAccess(actorId);
  ensureScopeReadable(access, doc.scope_type, doc.scope_id);
  await ensureFeature(actorId, 'projects', doc.scope_type, doc.scope_id ?? null);
  if (payload.name !== undefined) doc.name = payload.name.trim();
  if (payload.budget !== undefined) doc.budget = Number(payload.budget);
  if (payload.status !== undefined) doc.status = payload.status;
  if (payload.startDate !== undefined) doc.start_date = payload.startDate ? new Date(payload.startDate) : null;
  if (payload.endDate !== undefined) doc.end_date = payload.endDate ? new Date(payload.endDate) : null;
  await doc.save();
  const ownerName = doc.owner_id ? (await buildUserNameMap([doc.owner_id])).get(doc.owner_id) : undefined;
  return toProjectDto(doc, ownerName);
}

export async function deleteProject(actorId: string, projectId: string): Promise<void> {
  if (!Types.ObjectId.isValid(projectId)) {
    throw new ApiError(404, 'Project not found', 'NotFound');
  }
  const doc = await ProjectModel.findById(projectId).exec();
  if (!doc) {
    throw new ApiError(404, 'Project not found', 'NotFound');
  }
  const access = await loadScopeAccess(actorId);
  ensureScopeReadable(access, doc.scope_type, doc.scope_id);
  await ensureFeature(actorId, 'projects', doc.scope_type, doc.scope_id ?? null);
  await ExpenseModel.updateMany({ project_id: doc._id }, { $set: { project_id: null } }).exec();
  await ProjectModel.findByIdAndDelete(doc._id).exec();
}

export async function listExpenses(actorId: string): Promise<ExpenseDTO[]> {
  await ensureFeature(actorId, 'expenses');
  const scope = await loadScopeAccess(actorId);
  const docs = await ExpenseModel.find(scopedFilter(scope, 'scope_type', 'scope_id')).sort({ createdAt: -1 }).exec();
  return mapExpenses(docs);
}

export async function createExpense(actorId: string, payload: Partial<ExpenseDTO>): Promise<ExpenseDTO> {
  const scopeType = payload.scopeType;
  const scopeId = scopeType === 'global' ? null : payload.scopeId?.trim() || null;
  const title = payload.title?.trim();
  const amount = Number(payload.amount ?? 0);
  if (!scopeType || !title || !Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Missing or invalid required fields', 'BadRequest');
  }
  await ensureFeature(actorId, 'expenses', scopeType, scopeId);
  const access = await loadScopeAccess(actorId);
  ensureScopeWritable(access, scopeType, scopeId);
  await validateScope(scopeType, scopeId);
  const projectId =
    payload.projectId && Types.ObjectId.isValid(payload.projectId) ? new Types.ObjectId(payload.projectId) : null;
  const doc = await ExpenseModel.create({
    scope_type: scopeType,
    scope_id: scopeId,
    project_id: projectId,
    title,
    description: payload.description?.trim() || null,
    notes: payload.notes?.trim() || null,
    amount,
    currency: payload.currency?.trim().toUpperCase() || 'NGN',
    status: 'pending',
    approval_stage: 'pending',
    submitted_by: actorId,
  });
  const [dto] = await mapExpenses([doc]);
  return dto;
}

export async function updateExpense(actorId: string, expenseId: string, payload: Partial<ExpenseDTO>): Promise<ExpenseDTO> {
  if (!Types.ObjectId.isValid(expenseId)) {
    throw new ApiError(404, 'Expense not found', 'NotFound');
  }
  const doc = await ExpenseModel.findById(expenseId).exec();
  if (!doc) {
    throw new ApiError(404, 'Expense not found', 'NotFound');
  }
  const access = await loadScopeAccess(actorId);
  ensureScopeReadable(access, doc.scope_type, doc.scope_id);
  await ensureFeature(actorId, 'expenses', doc.scope_type, doc.scope_id ?? null);
  if (doc.approval_stage === 'approved' || doc.approval_stage === 'rejected') {
    throw new ApiError(400, 'Finalized expenses cannot be edited', 'BadRequest');
  }
  if (payload.title !== undefined) doc.title = payload.title.trim();
  if (payload.description !== undefined) doc.description = payload.description?.trim() || null;
  if (payload.notes !== undefined) doc.notes = payload.notes?.trim() || null;
  if (payload.amount !== undefined) doc.amount = Number(payload.amount);
  if (payload.currency !== undefined) doc.currency = payload.currency.trim().toUpperCase() || 'NGN';
  if (payload.projectId !== undefined) {
    doc.project_id = payload.projectId && Types.ObjectId.isValid(payload.projectId) ? new Types.ObjectId(payload.projectId) : null;
  }
  await doc.save();
  const [dto] = await mapExpenses([doc]);
  return dto;
}

export async function approveExpenseFirst(actorId: string, expenseId: string): Promise<ExpenseDTO> {
  if (!Types.ObjectId.isValid(expenseId)) {
    throw new ApiError(404, 'Expense not found', 'NotFound');
  }
  const doc = await ExpenseModel.findById(expenseId).exec();
  if (!doc) {
    throw new ApiError(404, 'Expense not found', 'NotFound');
  }
  const access = await loadScopeAccess(actorId);
  ensureScopeReadable(access, doc.scope_type, doc.scope_id);
  await ensureFeature(actorId, 'expenses', doc.scope_type, doc.scope_id ?? null);
  if (doc.approval_stage !== 'pending') {
    throw new ApiError(400, 'Expense is not awaiting first approval', 'BadRequest');
  }
  doc.approval_stage = 'finance_approved';
  doc.first_approved_by = actorId;
  doc.first_approved_at = new Date();
  await doc.save();
  const [dto] = await mapExpenses([doc]);
  return dto;
}

export async function approveExpenseFinal(actorId: string, expenseId: string): Promise<ExpenseDTO> {
  if (!Types.ObjectId.isValid(expenseId)) {
    throw new ApiError(404, 'Expense not found', 'NotFound');
  }
  const doc = await ExpenseModel.findById(expenseId).exec();
  if (!doc) {
    throw new ApiError(404, 'Expense not found', 'NotFound');
  }
  const access = await loadScopeAccess(actorId);
  ensureScopeReadable(access, doc.scope_type, doc.scope_id);
  await ensureFeature(actorId, 'expenses', doc.scope_type, doc.scope_id ?? null);
  if (doc.approval_stage !== 'finance_approved') {
    throw new ApiError(400, 'Expense is not awaiting final approval', 'BadRequest');
  }
  if (doc.first_approved_by === actorId) {
    throw new ApiError(400, 'Another approver is required', 'BadRequest');
  }
  doc.approval_stage = 'approved';
  doc.status = 'approved';
  doc.second_approved_by = actorId;
  doc.second_approved_at = new Date();
  doc.approved_by = actorId;
  doc.approved_at = doc.second_approved_at;
  await doc.save();
  if (doc.project_id) {
    const project = await ProjectModel.findById(doc.project_id).exec();
    if (project) {
      project.actual_spend = Number((Number(project.actual_spend ?? 0) + Number(doc.amount ?? 0)).toFixed(2));
      await project.save();
    }
  }
  const [dto] = await mapExpenses([doc]);
  return dto;
}

export async function rejectExpense(actorId: string, expenseId: string): Promise<ExpenseDTO> {
  if (!Types.ObjectId.isValid(expenseId)) {
    throw new ApiError(404, 'Expense not found', 'NotFound');
  }
  const doc = await ExpenseModel.findById(expenseId).exec();
  if (!doc) {
    throw new ApiError(404, 'Expense not found', 'NotFound');
  }
  const access = await loadScopeAccess(actorId);
  ensureScopeReadable(access, doc.scope_type, doc.scope_id);
  await ensureFeature(actorId, 'expenses', doc.scope_type, doc.scope_id ?? null);
  if (doc.approval_stage === 'approved' || doc.approval_stage === 'rejected') {
    throw new ApiError(400, 'Expense is already finalized', 'BadRequest');
  }
  doc.approval_stage = 'rejected';
  doc.status = 'rejected';
  doc.rejected_by = actorId;
  doc.rejected_at = new Date();
  await doc.save();
  const [dto] = await mapExpenses([doc]);
  return dto;
}

export async function deleteExpense(actorId: string, expenseId: string): Promise<void> {
  if (!Types.ObjectId.isValid(expenseId)) {
    throw new ApiError(404, 'Expense not found', 'NotFound');
  }
  const doc = await ExpenseModel.findById(expenseId).exec();
  if (!doc) {
    throw new ApiError(404, 'Expense not found', 'NotFound');
  }
  const access = await loadScopeAccess(actorId);
  ensureScopeReadable(access, doc.scope_type, doc.scope_id);
  await ensureFeature(actorId, 'expenses', doc.scope_type, doc.scope_id ?? null);
  await ExpenseModel.findByIdAndDelete(doc._id).exec();
}

export async function listPayments(actorId: string): Promise<PaymentDTO[]> {
  await ensureFeature(actorId, 'payments');
  const scope = await loadScopeAccess(actorId);
  const docs = await PaymentModel.find(scopedFilter(scope, 'scopeType', 'scopeId')).sort({ paidAt: -1, createdAt: -1 }).exec();
  return docs.map((doc) => toPaymentDto(doc));
}

export async function recordPayment(actorId: string, payload: {
  invoiceId?: string;
  invoiceApplications?: Array<{ invoiceId?: string; amount?: number }>;
  payerUserId?: string;
  amount?: number;
  currency?: string;
  channel?: string;
  reference?: string;
  notes?: string;
  scopeType?: ScopeType;
  scopeId?: string | null;
}): Promise<PaymentDTO> {
  const fromApplications =
    payload.invoiceApplications?.find((row) => row.invoiceId && Number(row.amount ?? 0) > 0) ?? null;
  const invoiceId = payload.invoiceId ?? fromApplications?.invoiceId;
  const amount = Number(payload.amount ?? fromApplications?.amount ?? 0);
  if (!invoiceId || !Types.ObjectId.isValid(invoiceId)) {
    throw new ApiError(400, 'invoiceId is required', 'BadRequest');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'amount must be greater than 0', 'BadRequest');
  }
  if (!payload.channel?.trim()) {
    throw new ApiError(400, 'channel is required', 'BadRequest');
  }
  const invoice = await DuesInvoiceModel.findById(invoiceId).populate('schemeId').exec();
  if (!invoice) {
    throw new ApiError(404, 'Invoice not found', 'NotFound');
  }
  const scheme = invoice.schemeId as DuesSchemeDoc | null;
  if (!scheme) {
    throw new ApiError(404, 'Invoice scheme not found', 'NotFound');
  }
  const requestedScopeType = payload.scopeType;
  const requestedScopeId = payload.scopeId ?? null;
  if (requestedScopeType && requestedScopeType !== scheme.scope_type) {
    throw new ApiError(400, 'Payment scopeType must match invoice scope', 'BadRequest');
  }
  if (requestedScopeId && requestedScopeId !== (scheme.scope_id ?? null)) {
    throw new ApiError(400, 'Payment scopeId must match invoice scope', 'BadRequest');
  }

  if (payload.payerUserId && payload.payerUserId !== invoice.userId) {
    throw new ApiError(400, 'payerUserId must match invoice owner', 'BadRequest');
  }

  await ensureFeature(actorId, 'payments', scheme.scope_type, scheme.scope_id ?? null);
  const scope = await loadScopeAccess(actorId);
  ensureScopeWritable(scope, scheme.scope_type, scheme.scope_id ?? null);
  const outstanding = Math.max(Number(invoice.amount ?? 0) - Number(invoice.paidAmount ?? 0), 0);
  const applied = Math.min(amount, outstanding);
  if (applied <= 0) {
    throw new ApiError(400, 'Invoice has no outstanding balance', 'BadRequest');
  }
  const payment = await PaymentModel.create({
    payerUserId: invoice.userId,
    amount: applied,
    currency: payload.currency?.trim().toUpperCase() || invoice.currency || 'NGN',
    channel: payload.channel.trim(),
    reference: payload.reference?.trim() || null,
    scopeType: scheme.scope_type,
    scopeId: scheme.scope_id ?? null,
    notes: payload.notes?.trim() || null,
    status: 'completed',
    paidAt: new Date(),
    applications: [{ invoiceId: invoice._id, amount: applied }],
  });
  invoice.paidAmount = Number((Number(invoice.paidAmount ?? 0) + applied).toFixed(2));
  if (invoice.paidAmount + 0.01 >= Number(invoice.amount ?? 0)) {
    invoice.status = 'paid';
    invoice.paidAmount = Number(invoice.amount ?? 0);
  } else {
    invoice.status = 'part_paid';
  }
  await invoice.save();
  await createNotificationForUser(invoice.userId, {
    title: 'Payment recorded',
    message: `Your payment of ${applied.toLocaleString()} ${payment.currency} has been recorded.`,
    type: 'success',
    metadata: { paymentId: payment._id.toString(), invoiceId: invoice._id.toString() },
  });
  return toPaymentDto(payment);
}

export async function listInvoices(userId: string): Promise<DuesInvoiceDTO[]> {
  const docs = await DuesInvoiceModel.find({ userId }).populate('schemeId').exec();
  return toInvoicesWithUsers(docs);
}

export async function listOutstandingInvoices(userId: string): Promise<DuesInvoiceDTO[]> {
  const docs = await DuesInvoiceModel.find({ userId, status: { $in: ['unpaid', 'part_paid'] } })
    .populate('schemeId')
    .exec();
  return toInvoicesWithUsers(docs);
}

export async function createInvoice(
  actorId: string,
  payload: { schemeId?: string; userId?: string; amount?: number; currency?: string },
): Promise<DuesInvoiceDTO> {
  const schemeId = payload.schemeId;
  const userId = payload.userId;
  const amount = Number(payload.amount ?? 0);
  if (!schemeId || !Types.ObjectId.isValid(schemeId)) {
    throw new ApiError(400, 'Invalid schemeId', 'BadRequest');
  }
  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'Invalid userId', 'BadRequest');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'amount must be greater than 0', 'BadRequest');
  }
  const scheme = await DuesSchemeModel.findById(schemeId).exec();
  if (!scheme) {
    throw new ApiError(404, 'Dues scheme not found', 'NotFound');
  }
  await ensureFeature(actorId, 'dues', scheme.scope_type, scheme.scope_id ?? null);
  const scope = await loadScopeAccess(actorId);
  ensureScopeWritable(scope, scheme.scope_type, scheme.scope_id ?? null);
  if (scheme.scope_type === 'global') {
    throw new ApiError(400, 'Global dues cannot be invoiced directly to members.', 'BadRequest');
  }
  const doc = await DuesInvoiceModel.create({
    schemeId: scheme._id,
    userId,
    amount,
    currency: payload.currency?.trim().toUpperCase() || scheme.currency || 'NGN',
    status: 'unpaid',
    paidAmount: 0,
  });
  return toInvoiceDto(doc);
}

async function loadPaymentOrThrow(paymentId: string): Promise<PaymentDoc> {
  if (!Types.ObjectId.isValid(paymentId)) {
    throw new ApiError(404, 'Payment not found', 'NotFound');
  }
  const doc = await PaymentModel.findById(paymentId).exec();
  if (!doc) {
    throw new ApiError(404, 'Payment not found', 'NotFound');
  }
  return doc;
}

async function ensurePaymentAccess(actorId: string, payment: PaymentDoc): Promise<void> {
  await ensureMemberLedgerAccess(actorId, payment.payerUserId);
}

async function nextReceiptNo(): Promise<string> {
  const latest = await PaymentReceiptModel.findOne().sort({ issuedAt: -1 }).exec();
  if (!latest) {
    return 'RC000001';
  }
  const current = parseInt(latest.receiptNo.replace(/\D/g, ''), 10);
  const next = Number.isFinite(current) ? current + 1 : 1;
  return `RC${next.toString().padStart(6, '0')}`;
}

async function findOrIssueReceipt(payment: PaymentDoc): Promise<PaymentReceiptDoc> {
  const existing = await PaymentReceiptModel.findOne({ paymentId: payment._id }).exec();
  if (existing) {
    return existing;
  }
  return PaymentReceiptModel.create({
    paymentId: payment._id,
    receiptNo: await nextReceiptNo(),
    issuedAt: new Date(),
  });
}

export async function getPaymentReceipt(actorId: string, paymentId: string): Promise<PaymentReceiptDTO> {
  const payment = await loadPaymentOrThrow(paymentId);
  await ensurePaymentAccess(actorId, payment);
  const receipt = await findOrIssueReceipt(payment);
  const payerName = (await buildUserNameMap([payment.payerUserId])).get(payment.payerUserId);
  return {
    id: receipt._id.toString(),
    paymentId: payment._id.toString(),
    receiptNo: receipt.receiptNo,
    issuedAt: receipt.issuedAt?.toISOString() ?? new Date().toISOString(),
    amount: Number(payment.amount ?? 0),
    payerUserId: payment.payerUserId,
    downloadUrl: `/finance/payments/${payment._id.toString()}/receipt/download`,
    payerName,
  };
}

export async function getPaymentReceiptFile(
  actorId: string,
  paymentId: string,
): Promise<{ filename: string; content: string }> {
  const payment = await loadPaymentOrThrow(paymentId);
  await ensurePaymentAccess(actorId, payment);
  const receipt = await findOrIssueReceipt(payment);
  const payerName = (await buildUserNameMap([payment.payerUserId])).get(payment.payerUserId) ?? payment.payerUserId;
  return {
    filename: `${receipt.receiptNo}.txt`,
    content: [
      `Receipt No: ${receipt.receiptNo}`,
      `Issued At: ${receipt.issuedAt?.toISOString() ?? new Date().toISOString()}`,
      `Member: ${payerName}`,
      `Amount: ${Number(payment.amount ?? 0).toLocaleString()} ${payment.currency ?? 'NGN'}`,
      `Channel: ${payment.channel}`,
      `Reference: ${payment.reference ?? 'N/A'}`,
    ].join('\n'),
  };
}

export async function getMemberLedger(actorId: string, memberId: string): Promise<MemberLedgerDTO> {
  if (!Types.ObjectId.isValid(memberId)) {
    throw new ApiError(404, 'Member not found', 'NotFound');
  }
  await ensureMemberLedgerAccess(actorId, memberId);
  const [member, invoices, payments, contributions, payouts] = await Promise.all([
    UserModel.findById(memberId).select('_id').lean<{ _id: Types.ObjectId }>().exec(),
    DuesInvoiceModel.find({ userId: memberId }).populate('schemeId').sort({ periodStart: -1, createdAt: -1 }).limit(100).exec(),
    PaymentModel.find({ payerUserId: memberId }).sort({ paidAt: -1, createdAt: -1 }).limit(50).exec(),
    WelfareContributionModel.find({ userId: memberId })
      .select('_id amount paidAt caseId createdAt')
      .sort({ paidAt: -1, createdAt: -1 })
      .limit(50)
      .lean<Array<{ _id: Types.ObjectId; amount?: number; paidAt?: Date | null; caseId: string; createdAt?: Date }>>()
      .exec(),
    WelfarePayoutModel.find({ beneficiaryUserId: memberId })
      .select('_id amount disbursedAt caseId createdAt')
      .sort({ disbursedAt: -1, createdAt: -1 })
      .limit(50)
      .lean<Array<{ _id: Types.ObjectId; amount?: number; disbursedAt?: Date | null; caseId: string; createdAt?: Date }>>()
      .exec(),
  ]);
  if (!member) {
    throw new ApiError(404, 'Member not found', 'NotFound');
  }

  const invoiceDtos = await toInvoicesWithUsers(invoices);
  const paymentDtos = payments.map((payment) => toPaymentDto(payment));
  const billed = invoices.reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0);
  const paid = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount ?? 0), 0);
  const welfareContributed = contributions.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const welfareReceived = payouts.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const totals: LedgerTotalsDTO = {
    billed: Number(billed.toFixed(2)),
    paid: Number(paid.toFixed(2)),
    outstanding: Number(Math.max(billed - paid, 0).toFixed(2)),
    welfareContributed: Number(welfareContributed.toFixed(2)),
    welfareReceived: Number(welfareReceived.toFixed(2)),
  };

  const transactions: LedgerTransactionDTO[] = [];
  invoices.forEach((invoice) => {
    transactions.push({
      id: `invoice-${invoice._id.toString()}`,
      date: invoice.periodStart?.toISOString() ?? (invoice as DuesInvoiceDoc & { createdAt?: Date }).createdAt?.toISOString(),
      type: 'Invoice',
      description: mapSchemeRef(invoice.schemeId)?.title ?? 'Invoice',
      debit: Number(invoice.amount ?? 0),
      credit: 0,
      balance: 0,
    });
  });
  payments.forEach((payment) => {
    transactions.push({
      id: `payment-${payment._id.toString()}`,
      date: payment.paidAt?.toISOString() ?? (payment as PaymentDoc & { createdAt?: Date }).createdAt?.toISOString(),
      type: 'Payment',
      description: payment.reference ?? 'Payment',
      debit: 0,
      credit: Number(payment.amount ?? 0),
      balance: 0,
    });
  });
  transactions.sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime());
  let running = 0;
  const finalTransactions = transactions.map((tx) => {
    running += tx.debit - tx.credit;
    return { ...tx, balance: Number(running.toFixed(2)) };
  });

  return {
    memberId,
    totals,
    invoices: invoiceDtos,
    payments: paymentDtos,
    transactions: finalTransactions,
  };
}

export async function getClassLedger(actorId: string, classId: string, year?: number): Promise<ClassLedgerDTO> {
  if (!Types.ObjectId.isValid(classId)) {
    throw new ApiError(404, 'Class not found', 'NotFound');
  }
  await ensureClassLedgerAccess(actorId, classId);
  const memberIds = await ClassMembershipModel.find({ classId })
    .select('userId')
    .lean<Array<{ userId: string }>>()
    .exec()
    .then((rows) => rows.map((row) => row.userId));
  if (memberIds.length === 0) {
    return { classId, year: year ?? null, totals: { billed: 0, paid: 0, outstanding: 0 }, invoices: [], payments: [] };
  }
  const range = year ? reportRange(year) : null;
  const invoiceQuery: Record<string, unknown> = { userId: { $in: memberIds } };
  const paymentQuery: Record<string, unknown> = { payerUserId: { $in: memberIds } };
  if (range) {
    invoiceQuery.periodStart = { $gte: range.start, $lt: range.end };
    paymentQuery.paidAt = { $gte: range.start, $lt: range.end };
  }
  const [invoices, payments] = await Promise.all([
    DuesInvoiceModel.find(invoiceQuery).populate('schemeId').sort({ periodStart: -1, createdAt: -1 }).limit(200).exec(),
    PaymentModel.find(paymentQuery).sort({ paidAt: -1, createdAt: -1 }).limit(150).exec(),
  ]);
  const invoiceDtos = await toInvoicesWithUsers(invoices);
  const paymentDtos = payments.map((payment) => toPaymentDto(payment));
  const billed = invoices.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const paid = invoices.reduce((sum, row) => sum + Number(row.paidAmount ?? 0), 0);
  return {
    classId,
    year: year ?? null,
    totals: {
      billed: Number(billed.toFixed(2)),
      paid: Number(paid.toFixed(2)),
      outstanding: Number(Math.max(billed - paid, 0).toFixed(2)),
    },
    invoices: invoiceDtos,
    payments: paymentDtos,
  };
}
