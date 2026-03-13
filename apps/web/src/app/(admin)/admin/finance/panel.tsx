'use client';

import type {
  BranchDTO,
  ClassSetDTO,
  DuesInvoiceDTO,
  DuesSchemeDTO,
  ExpenseDTO,
  FinanceAdminSummaryDTO,
  FinanceReportDTO,
  FinanceReportScopeAccessDTO,
  FinanceReportSnapshotDTO,
  PaymentDTO,
  ProjectDTO,
} from '@gcuoba/types';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchJson, API_BASE_URL } from '@/lib/api';
import { PaginationControls } from '@/components/ui/pagination-controls';

type Props = {
  summary: FinanceAdminSummaryDTO;
  authToken: string;
  activeScopeType?: 'global' | 'branch' | 'class';
  activeScopeId?: string | null;
  initialSection?: FinanceSection;
  enabledSections?: FinanceSection[];
  showSectionTabs?: boolean;
};

type FinanceSection = 'reports' | 'dues' | 'projects' | 'expenses' | 'payments';
const ALL_FINANCE_SECTIONS: FinanceSection[] = ['reports', 'dues', 'expenses', 'payments', 'projects'];
const FINANCE_SECTION_LABELS: Record<FinanceSection, string> = {
  reports: 'Reports',
  dues: 'Dues',
  projects: 'Projects',
  expenses: 'Expenses',
  payments: 'Post Payments',
};

type PaymentType = 'dues';

type SchemeFormState = {
  title: string;
  amount: string;
  currency: string;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_off';
  oneOffYear: string;
  scopeType: 'global' | 'branch' | 'class';
  scopeId: string;
};

type ScopeOptionsState = {
  branches: BranchDTO[];
  classes: ClassSetDTO[];
};

type ReportFilterState = {
  year: string;
  month: string;
  scopeType: 'global' | 'branch' | 'class';
  scopeId: string;
};

type SnapshotCaptureState = {
  year: string;
  month: string;
};

type ProjectFormState = {
  name: string;
  scopeType: 'global' | 'branch' | 'class';
  scopeId: string;
  budget: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
};

type ExpenseFormState = {
  scopeType: 'global' | 'branch' | 'class';
  scopeId: string;
  projectId: string;
  title: string;
  description: string;
  amount: string;
  currency: string;
  notes: string;
};

type ManagedScopeType = 'global' | 'branch' | 'class';

function availableScopeTypes(access: FinanceReportScopeAccessDTO | null): ManagedScopeType[] {
  if (!access) {
    return ['global', 'branch', 'class'];
  }
  const scopes: ManagedScopeType[] = [];
  if (access.hasGlobalAccess) {
    scopes.push('global');
  }
  if (access.branches.length > 0) {
    scopes.push('branch');
  }
  if (access.classes.length > 0) {
    scopes.push('class');
  }
  return scopes.length > 0 ? scopes : ['global'];
}

function defaultScopeIdForType(access: FinanceReportScopeAccessDTO | null, scopeType: ManagedScopeType): string {
  if (!access) {
    return '';
  }
  if (scopeType === 'branch') {
    return access.branches[0]?.id ?? '';
  }
  if (scopeType === 'class') {
    return access.classes[0]?.id ?? '';
  }
  return '';
}

function normalizeScopeSelection(
  access: FinanceReportScopeAccessDTO | null,
  scopeType: ManagedScopeType,
  scopeId: string,
): { scopeType: ManagedScopeType; scopeId: string } {
  const options = availableScopeTypes(access);
  const nextType = options.includes(scopeType) ? scopeType : options[0];
  if (nextType === 'global') {
    return { scopeType: nextType, scopeId: '' };
  }
  const rows = nextType === 'branch' ? access?.branches ?? [] : access?.classes ?? [];
  if (rows.some((row) => row.id === scopeId)) {
    return { scopeType: nextType, scopeId };
  }
  return { scopeType: nextType, scopeId: defaultScopeIdForType(access, nextType) };
}

function lockScopeAccess(
  access: FinanceReportScopeAccessDTO,
  activeScopeType?: ManagedScopeType,
  activeScopeId?: string | null,
): FinanceReportScopeAccessDTO {
  if (!activeScopeType) {
    return access;
  }
  if (activeScopeType === 'global') {
    return {
      hasGlobalAccess: access.hasGlobalAccess,
      branches: [],
      classes: [],
    };
  }
  if (activeScopeType === 'branch') {
    return {
      hasGlobalAccess: false,
      branches: activeScopeId
        ? access.branches.filter((entry) => entry.id === activeScopeId)
        : access.branches,
      classes: [],
    };
  }
  return {
    hasGlobalAccess: false,
    branches: [],
    classes: activeScopeId
      ? access.classes.filter((entry) => entry.id === activeScopeId)
      : access.classes,
  };
}

function nowLocalDateTimeValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function FinancePanel({
  summary,
  authToken,
  activeScopeType,
  activeScopeId,
  initialSection = 'reports',
  enabledSections,
  showSectionTabs,
}: Props) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<FinanceSection>(
    ALL_FINANCE_SECTIONS.includes(initialSection) ? initialSection : 'reports',
  );
  const [paymentState, setPaymentState] = useState({
    paymentType: 'dues' as PaymentType,
    memberId: '',
    invoiceId: '',
    amount: '',
    channel: 'manual',
    reference: '',
    notes: '',
    paidAt: nowLocalDateTimeValue(),
  });
  const [paymentMemberInput, setPaymentMemberInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [schemeForm, setSchemeForm] = useState<SchemeFormState>({
    title: '',
    amount: '',
    currency: 'NGN',
    frequency: 'annual',
    oneOffYear: String(new Date().getFullYear()),
    scopeType: 'global',
    scopeId: '',
  });
  const [schemeBusy, setSchemeBusy] = useState(false);
  const [schemeActionId, setSchemeActionId] = useState<string | null>(null);
  const [duesViewTab, setDuesViewTab] = useState<'manage' | 'create'>('manage');
  const [scopeOptions, setScopeOptions] = useState<ScopeOptionsState>({ branches: [], classes: [] });
  const [scopeLoadError, setScopeLoadError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [reportFilters, setReportFilters] = useState<ReportFilterState>({
    year: String(currentYear),
    month: '',
    scopeType: 'global',
    scopeId: '',
  });
  const [reportData, setReportData] = useState<FinanceReportDTO | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportDownloading, setReportDownloading] = useState(false);
  const [reportQuery, setReportQuery] = useState('');
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(20);
  const [scopeAccess, setScopeAccess] = useState<FinanceReportScopeAccessDTO | null>(null);
  const [scopeAccessError, setScopeAccessError] = useState<string | null>(null);
  const [scopedFilters, setScopedFilters] = useState<ReportFilterState>({
    year: String(currentYear),
    month: '',
    scopeType: 'global',
    scopeId: '',
  });
  const [scopedReport, setScopedReport] = useState<FinanceReportDTO | null>(null);
  const [scopedLoading, setScopedLoading] = useState(false);
  const [scopedError, setScopedError] = useState<string | null>(null);
  const [scopedDownloading, setScopedDownloading] = useState(false);
  const [scopedQuery, setScopedQuery] = useState('');
  const [scopedPage, setScopedPage] = useState(1);
  const [scopedPageSize, setScopedPageSize] = useState(20);
  const [snapshotCapture, setSnapshotCapture] = useState<SnapshotCaptureState>({
    year: String(currentYear),
    month: String(new Date().getMonth() + 1),
  });
  const [snapshots, setSnapshots] = useState<FinanceReportSnapshotDTO[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [snapshotCaptureBusy, setSnapshotCaptureBusy] = useState(false);
  const [snapshotQuery, setSnapshotQuery] = useState('');
  const [snapshotPage, setSnapshotPage] = useState(1);
  const [snapshotPageSize, setSnapshotPageSize] = useState(20);
  const [projectForm, setProjectForm] = useState<ProjectFormState>({
    name: '',
    scopeType: 'global',
    scopeId: '',
    budget: '',
    startDate: '',
    endDate: '',
    status: 'planning',
  });
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectActionId, setProjectActionId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectEditBusy, setProjectEditBusy] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState<ProjectFormState>({
    name: '',
    scopeType: 'global',
    scopeId: '',
    budget: '',
    startDate: '',
    endDate: '',
    status: 'planning',
  });
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>({
    scopeType: 'global',
    scopeId: '',
    projectId: '',
    title: '',
    description: '',
    amount: '',
    currency: 'NGN',
    notes: '',
  });
  const [expenseBusy, setExpenseBusy] = useState(false);
  const [expenseActionId, setExpenseActionId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseEditBusy, setExpenseEditBusy] = useState(false);
  const [expenseEditForm, setExpenseEditForm] = useState<ExpenseFormState>({
    scopeType: 'global',
    scopeId: '',
    projectId: '',
    title: '',
    description: '',
    amount: '',
    currency: 'NGN',
    notes: '',
  });
  const [schemeQuery, setSchemeQuery] = useState('');
  const [schemePage, setSchemePage] = useState(1);
  const [schemePageSize, setSchemePageSize] = useState(20);
  const [projectQuery, setProjectQuery] = useState('');
  const [projectPage, setProjectPage] = useState(1);
  const [projectPageSize, setProjectPageSize] = useState(20);
  const [expenseQuery, setExpenseQuery] = useState('');
  const [expensePage, setExpensePage] = useState(1);
  const [expensePageSize, setExpensePageSize] = useState(20);

  const visibleSections = useMemo(() => {
    const source = enabledSections?.length ? enabledSections : ALL_FINANCE_SECTIONS;
    const unique = Array.from(new Set(source)).filter((section): section is FinanceSection =>
      ALL_FINANCE_SECTIONS.includes(section as FinanceSection),
    );
    return unique.length ? unique : ALL_FINANCE_SECTIONS;
  }, [enabledSections]);

  const renderSectionTabs = showSectionTabs ?? visibleSections.length > 1;

  useEffect(() => {
    const nextSection = visibleSections.includes(initialSection) ? initialSection : visibleSections[0];
    setActiveSection(nextSection);
  }, [initialSection, visibleSections]);

  useEffect(() => {
    setSchemePage(1);
  }, [schemeQuery]);

  useEffect(() => {
    setProjectPage(1);
  }, [projectQuery]);

  useEffect(() => {
    setExpensePage(1);
  }, [expenseQuery]);

  const scopeLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    scopeOptions.branches.forEach((branch) => labels.set(branch.id, branch.name));
    scopeOptions.classes.forEach((classSet) => labels.set(classSet.id, `${classSet.entryYear} - ${classSet.label}`));
    return labels;
  }, [scopeOptions]);

  const outstandingInvoices = useMemo(() => {
    return summary.invoices.filter((invoice) => (invoice.balance ?? 0) > 0);
  }, [summary.invoices]);

  const invoiceMembers = useMemo(() => {
    const grouped = new Map<
      string,
      {
        userId: string;
        memberLabel: string;
        optionLabel: string;
        invoiceCount: number;
        outstandingInvoiceCount: number;
        totalOutstanding: number;
      }
    >();
    summary.invoices.forEach((invoice) => {
      const balance = invoiceOutstandingBalance(invoice);
      const existing = grouped.get(invoice.userId);
      const name = invoice.userName?.trim();
      const alumni = invoice.userAlumniNumber?.trim() || null;
      const memberLabel = name || alumni || 'Member';
      const optionLabel = alumni ? `${memberLabel} (${alumni})` : memberLabel;
      if (existing) {
        existing.invoiceCount += 1;
        if (balance > 0) {
          existing.outstandingInvoiceCount += 1;
          existing.totalOutstanding = Number((existing.totalOutstanding + balance).toFixed(2));
        }
        return;
      }
      grouped.set(invoice.userId, {
        userId: invoice.userId,
        memberLabel,
        optionLabel,
        invoiceCount: 1,
        outstandingInvoiceCount: balance > 0 ? 1 : 0,
        totalOutstanding: Number(Math.max(balance, 0).toFixed(2)),
      });
    });
    return Array.from(grouped.values()).sort((a, b) => a.memberLabel.localeCompare(b.memberLabel));
  }, [summary.invoices]);

  const selectedPaymentMember = useMemo(
    () => invoiceMembers.find((entry) => entry.userId === paymentState.memberId) ?? null,
    [invoiceMembers, paymentState.memberId],
  );

  const selectedMemberInvoices = useMemo(() => {
    if (!paymentState.memberId) {
      return [] as DuesInvoiceDTO[];
    }
    return outstandingInvoices
      .filter((invoice) => invoice.userId === paymentState.memberId)
      .sort((a, b) => {
        const aTime = a.periodStart ? new Date(a.periodStart).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.periodStart ? new Date(b.periodStart).getTime() : Number.MAX_SAFE_INTEGER;
        if (aTime !== bTime) {
          return aTime - bTime;
        }
        return a.id.localeCompare(b.id);
      });
  }, [outstandingInvoices, paymentState.memberId]);

  const selectedMemberDuesBuckets = useMemo(() => {
    const grouped = new Map<
      string,
      {
        anchorInvoiceId: string;
        schemeTitle: string;
        currency: string;
        invoiceCount: number;
        totalOutstanding: number;
      }
    >();
    selectedMemberInvoices.forEach((invoice) => {
      const schemeId = invoice.scheme?.id ?? `no-scheme:${invoice.scheme?.title ?? 'dues'}`;
      const balance = invoiceOutstandingBalance(invoice);
      if (balance <= 0) {
        return;
      }
      const existing = grouped.get(schemeId);
      if (existing) {
        existing.invoiceCount += 1;
        existing.totalOutstanding = Number((existing.totalOutstanding + balance).toFixed(2));
        return;
      }
      grouped.set(schemeId, {
        anchorInvoiceId: invoice.id,
        schemeTitle: invoice.scheme?.title ?? 'Dues',
        currency: invoice.currency ?? 'NGN',
        invoiceCount: 1,
        totalOutstanding: Number(balance.toFixed(2)),
      });
    });
    return Array.from(grouped.values()).sort((a, b) => a.schemeTitle.localeCompare(b.schemeTitle));
  }, [selectedMemberInvoices]);

  const selectedPaymentInvoice = useMemo(() => {
    if (!paymentState.invoiceId) {
      return null;
    }
    return selectedMemberInvoices.find((invoice) => invoice.id === paymentState.invoiceId) ?? null;
  }, [paymentState.invoiceId, selectedMemberInvoices]);

  const selectedSchemeInvoices = useMemo(() => {
    if (!selectedPaymentInvoice) {
      return [] as DuesInvoiceDTO[];
    }
    const schemeId = selectedPaymentInvoice.scheme?.id ?? null;
    return selectedMemberInvoices.filter((invoice) => {
      if (schemeId) {
        return invoice.scheme?.id === schemeId;
      }
      return (invoice.scheme?.title ?? 'Dues') === (selectedPaymentInvoice.scheme?.title ?? 'Dues');
    });
  }, [selectedMemberInvoices, selectedPaymentInvoice]);

  const paymentAllocationPreview = useMemo(() => {
    const amount = Number(paymentState.amount);
    if (!Number.isFinite(amount) || amount <= 0 || selectedSchemeInvoices.length === 0) {
      return null;
    }
    const totalOutstanding = selectedSchemeInvoices.reduce(
      (sum, invoice) => sum + invoiceOutstandingBalance(invoice),
      0,
    );
    let remaining = Number(amount.toFixed(2));
    let applied = 0;
    let coveredInvoices = 0;
    selectedSchemeInvoices.forEach((invoice) => {
      if (remaining <= 0.01) {
        return;
      }
      const balance = invoiceOutstandingBalance(invoice);
      if (balance <= 0.01) {
        return;
      }
      const nextApplied = Number(Math.min(remaining, balance).toFixed(2));
      if (nextApplied <= 0) {
        return;
      }
      applied = Number((applied + nextApplied).toFixed(2));
      remaining = Number((remaining - nextApplied).toFixed(2));
      coveredInvoices += 1;
    });
    const unapplied = Number(Math.max(amount - applied, 0).toFixed(2));
    const remainingOutstanding = Number(Math.max(totalOutstanding - applied, 0).toFixed(2));
    return {
      totalOutstanding: Number(totalOutstanding.toFixed(2)),
      applied,
      uncoveredInvoices: Math.max(selectedSchemeInvoices.length - coveredInvoices, 0),
      coveredInvoices,
      unapplied,
      remainingOutstanding,
    };
  }, [paymentState.amount, selectedSchemeInvoices]);

  const filteredSchemes = useMemo(() => {
    const query = schemeQuery.trim().toLowerCase();
    if (!query) {
      return summary.schemes;
    }
    return summary.schemes.filter((scheme) => {
      const scopeLabel = scheme.scopeId ? scopeLabelById.get(scheme.scopeId) ?? scheme.scopeId : '';
      return (
        scheme.title.toLowerCase().includes(query) ||
        scheme.scopeType.toLowerCase().includes(query) ||
        scopeLabel.toLowerCase().includes(query) ||
        scheme.status.toLowerCase().includes(query) ||
        scheme.frequency.toLowerCase().includes(query)
      );
    });
  }, [schemeQuery, summary.schemes, scopeLabelById]);
  const schemeTotalPages = Math.max(1, Math.ceil(filteredSchemes.length / schemePageSize));
  const schemeCurrentPage = Math.min(Math.max(schemePage, 1), schemeTotalPages);
  const pagedSchemes = useMemo(() => {
    const start = (schemeCurrentPage - 1) * schemePageSize;
    return filteredSchemes.slice(start, start + schemePageSize);
  }, [filteredSchemes, schemeCurrentPage, schemePageSize]);

  const filteredProjects = useMemo(() => {
    const query = projectQuery.trim().toLowerCase();
    if (!query) {
      return summary.projects;
    }
    return summary.projects.filter((project) => {
      const scopeLabel = project.scopeId ? scopeLabelById.get(project.scopeId) ?? project.scopeId : '';
      return (
        project.name.toLowerCase().includes(query) ||
        project.scopeType.toLowerCase().includes(query) ||
        scopeLabel.toLowerCase().includes(query) ||
        project.status.toLowerCase().includes(query)
      );
    });
  }, [projectQuery, summary.projects, scopeLabelById]);
  const projectTotalPages = Math.max(1, Math.ceil(filteredProjects.length / projectPageSize));
  const projectCurrentPage = Math.min(Math.max(projectPage, 1), projectTotalPages);
  const pagedProjects = useMemo(() => {
    const start = (projectCurrentPage - 1) * projectPageSize;
    return filteredProjects.slice(start, start + projectPageSize);
  }, [filteredProjects, projectCurrentPage, projectPageSize]);

  const filteredExpenses = useMemo(() => {
    const query = expenseQuery.trim().toLowerCase();
    if (!query) {
      return summary.expenses;
    }
    return summary.expenses.filter((expense) => {
      const scopeLabel = expense.scopeId ? scopeLabelById.get(expense.scopeId) ?? expense.scopeId : '';
      return (
        expense.title.toLowerCase().includes(query) ||
        expense.scopeType.toLowerCase().includes(query) ||
        scopeLabel.toLowerCase().includes(query) ||
        (expense.projectName ?? '').toLowerCase().includes(query) ||
        expense.status.toLowerCase().includes(query) ||
        expense.approvalStage.toLowerCase().includes(query)
      );
    });
  }, [expenseQuery, summary.expenses, scopeLabelById]);
  const expenseTotalPages = Math.max(1, Math.ceil(filteredExpenses.length / expensePageSize));
  const expenseCurrentPage = Math.min(Math.max(expensePage, 1), expenseTotalPages);
  const pagedExpenses = useMemo(() => {
    const start = (expenseCurrentPage - 1) * expensePageSize;
    return filteredExpenses.slice(start, start + expensePageSize);
  }, [filteredExpenses, expenseCurrentPage, expensePageSize]);

  const filteredReportRows = useMemo(() => {
    const rows = reportData?.rows ?? [];
    const query = reportQuery.trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter((row) => {
      return (
        (row.userName ?? '').toLowerCase().includes(query) ||
        (row.userAlumniNumber ?? '').toLowerCase().includes(query) ||
        row.userId.toLowerCase().includes(query) ||
        (row.currency ?? '').toLowerCase().includes(query)
      );
    });
  }, [reportData?.rows, reportQuery]);
  const reportTotalPages = Math.max(1, Math.ceil(filteredReportRows.length / reportPageSize));
  const reportCurrentPage = Math.min(Math.max(reportPage, 1), reportTotalPages);
  const pagedReportRows = useMemo(() => {
    const start = (reportCurrentPage - 1) * reportPageSize;
    return filteredReportRows.slice(start, start + reportPageSize);
  }, [filteredReportRows, reportCurrentPage, reportPageSize]);

  const filteredScopedRows = useMemo(() => {
    const rows = scopedReport?.rows ?? [];
    const query = scopedQuery.trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter((row) => {
      return (
        (row.userName ?? '').toLowerCase().includes(query) ||
        (row.userAlumniNumber ?? '').toLowerCase().includes(query) ||
        row.userId.toLowerCase().includes(query) ||
        (row.currency ?? '').toLowerCase().includes(query)
      );
    });
  }, [scopedQuery, scopedReport?.rows]);
  const scopedTotalPages = Math.max(1, Math.ceil(filteredScopedRows.length / scopedPageSize));
  const scopedCurrentPage = Math.min(Math.max(scopedPage, 1), scopedTotalPages);
  const pagedScopedRows = useMemo(() => {
    const start = (scopedCurrentPage - 1) * scopedPageSize;
    return filteredScopedRows.slice(start, start + scopedPageSize);
  }, [filteredScopedRows, scopedCurrentPage, scopedPageSize]);

  const filteredSnapshots = useMemo(() => {
    const query = snapshotQuery.trim().toLowerCase();
    if (!query) {
      return snapshots;
    }
    return snapshots.filter((snapshot) => {
      return (
        snapshot.period.toLowerCase().includes(query) ||
        snapshot.scopeType.toLowerCase().includes(query) ||
        (snapshot.scopeId ?? '').toLowerCase().includes(query)
      );
    });
  }, [snapshotQuery, snapshots]);
  const snapshotTotalPages = Math.max(1, Math.ceil(filteredSnapshots.length / snapshotPageSize));
  const snapshotCurrentPage = Math.min(Math.max(snapshotPage, 1), snapshotTotalPages);
  const pagedSnapshots = useMemo(() => {
    const start = (snapshotCurrentPage - 1) * snapshotPageSize;
    return filteredSnapshots.slice(start, start + snapshotPageSize);
  }, [filteredSnapshots, snapshotCurrentPage, snapshotPageSize]);

  const projectOptionsForExpense = useMemo(() => {
    return summary.projects.filter((project) => {
      if (expenseForm.scopeType === 'global') {
        return project.scopeType === 'global';
      }
      return project.scopeType === expenseForm.scopeType && project.scopeId === expenseForm.scopeId;
    });
  }, [expenseForm.scopeId, expenseForm.scopeType, summary.projects]);

  const projectOptionsForExpenseEdit = useMemo(() => {
    return summary.projects.filter((project) => {
      if (expenseEditForm.scopeType === 'global') {
        return project.scopeType === 'global';
      }
      return project.scopeType === expenseEditForm.scopeType && project.scopeId === expenseEditForm.scopeId;
    });
  }, [expenseEditForm.scopeId, expenseEditForm.scopeType, summary.projects]);

  const scopeTypeChoices = useMemo(() => availableScopeTypes(scopeAccess), [scopeAccess]);
  const hasGlobalScopeAccess = scopeAccess?.hasGlobalAccess ?? false;

  function buildReportQuery(filters: ReportFilterState) {
    const params = new URLSearchParams();
    const year = Number(filters.year);
    if (Number.isInteger(year)) {
      params.set('year', String(year));
    }
    const month = Number(filters.month);
    if (Number.isInteger(month) && month >= 1 && month <= 12) {
      params.set('month', String(month));
    }
    params.set('scopeType', filters.scopeType);
    if (filters.scopeType !== 'global' && filters.scopeId) {
      params.set('scopeId', filters.scopeId);
    }
    return params.toString();
  }

  async function loadOverviewReport(filters: ReportFilterState = reportFilters) {
    setReportLoading(true);
    setReportError(null);
    try {
      const query = buildReportQuery(filters);
      const data = await fetchJson<FinanceReportDTO>(`/finance/reports/overview?${query}`, {
        token: authToken,
      });
      setReportData(data);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to load report.');
    } finally {
      setReportLoading(false);
    }
  }

  async function downloadOverviewReport() {
    setReportDownloading(true);
    setReportError(null);
    try {
      const query = buildReportQuery(reportFilters);
      const response = await fetch(`${API_BASE_URL}/finance/reports/overview/export?${query}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? 'attachment; filename="finance-overview-report.csv"';
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : 'finance-overview-report.csv';
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to download report.');
    } finally {
      setReportDownloading(false);
    }
  }

  async function loadScopeAccessData() {
    setScopeAccessError(null);
    try {
      const access = await fetchJson<FinanceReportScopeAccessDTO>('/finance/reports/scopes', {
        token: authToken,
      });
      const scopedAccess = lockScopeAccess(access, activeScopeType, activeScopeId);
      setScopeAccess(scopedAccess);
      setScopeOptions({ branches: scopedAccess.branches, classes: scopedAccess.classes });
      setScopeLoadError(null);

      const normalizedScoped = normalizeScopeSelection(
        scopedAccess,
        scopedFilters.scopeType,
        scopedFilters.scopeId,
      );
      const nextScopedFilters: ReportFilterState = {
        ...scopedFilters,
        scopeType: normalizedScoped.scopeType,
        scopeId: normalizedScoped.scopeId,
      };
      setScopedFilters(nextScopedFilters);
      void loadScopedReport(nextScopedFilters);

      const normalizedOverview = normalizeScopeSelection(
        scopedAccess,
        reportFilters.scopeType,
        reportFilters.scopeId,
      );
      const nextOverviewFilters: ReportFilterState = {
        ...reportFilters,
        scopeType: normalizedOverview.scopeType,
        scopeId: normalizedOverview.scopeId,
      };
      setReportFilters(nextOverviewFilters);
      if (scopedAccess.hasGlobalAccess) {
        void loadOverviewReport(nextOverviewFilters);
      } else {
        setReportData(null);
        setReportError(null);
      }

      setSchemeForm((prev) => ({ ...prev, ...normalizeScopeSelection(scopedAccess, prev.scopeType, prev.scopeId) }));
      setProjectForm((prev) => ({ ...prev, ...normalizeScopeSelection(scopedAccess, prev.scopeType, prev.scopeId) }));
      setExpenseForm((prev) => ({ ...prev, ...normalizeScopeSelection(scopedAccess, prev.scopeType, prev.scopeId), projectId: '' }));
      setProjectEditForm((prev) => ({ ...prev, ...normalizeScopeSelection(scopedAccess, prev.scopeType, prev.scopeId) }));
      setExpenseEditForm((prev) => ({
        ...prev,
        ...normalizeScopeSelection(scopedAccess, prev.scopeType, prev.scopeId),
        projectId: '',
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load scoped access.';
      setScopeAccessError(message);
      setScopeLoadError(message);
    }
  }

  async function loadScopedReport(filters: ReportFilterState = scopedFilters) {
    setScopedLoading(true);
    setScopedError(null);
    try {
      const query = buildReportQuery(filters);
      const data = await fetchJson<FinanceReportDTO>(`/finance/reports/scoped?${query}`, {
        token: authToken,
      });
      setScopedReport(data);
    } catch (err) {
      setScopedError(err instanceof Error ? err.message : 'Failed to load scoped report.');
    } finally {
      setScopedLoading(false);
    }
  }

  async function downloadScopedReport() {
    setScopedDownloading(true);
    setScopedError(null);
    try {
      const query = buildReportQuery(scopedFilters);
      const response = await fetch(`${API_BASE_URL}/finance/reports/scoped/export?${query}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? 'attachment; filename="finance-scoped-report.csv"';
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : 'finance-scoped-report.csv';
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setScopedError(err instanceof Error ? err.message : 'Failed to download scoped report.');
    } finally {
      setScopedDownloading(false);
    }
  }

  async function loadSnapshots() {
    setSnapshotsLoading(true);
    setSnapshotsError(null);
    try {
      const data = await fetchJson<FinanceReportSnapshotDTO[]>('/finance/reports/snapshots?limit=24', {
        token: authToken,
      });
      setSnapshots(data);
    } catch (err) {
      setSnapshotsError(err instanceof Error ? err.message : 'Failed to load snapshots.');
    } finally {
      setSnapshotsLoading(false);
    }
  }

  async function captureSnapshots() {
    setSnapshotCaptureBusy(true);
    setSnapshotsError(null);
    try {
      await fetchJson('/finance/reports/snapshots/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: Number(snapshotCapture.year),
          month: Number(snapshotCapture.month),
        }),
        token: authToken,
      });
      await loadSnapshots();
      setStatus('Monthly snapshots captured.');
    } catch (err) {
      setSnapshotsError(err instanceof Error ? err.message : 'Failed to capture snapshots.');
    } finally {
      setSnapshotCaptureBusy(false);
    }
  }

  useEffect(() => {
    void loadScopeAccessData();
    void loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScopeId, activeScopeType, authToken]);

  function handleMemberChange(memberId: string, optionLabel?: string) {
    setPaymentState((prev) => ({
      ...prev,
      memberId,
      invoiceId: '',
      amount: '',
    }));
    if (optionLabel !== undefined) {
      setPaymentMemberInput(optionLabel);
    }
  }

  function handleMemberInputChange(value: string) {
    setPaymentMemberInput(value);
    const normalizedValue = value.trim().toLowerCase();
    const exactMatch = invoiceMembers.find(
      (entry) => entry.optionLabel.trim().toLowerCase() === normalizedValue,
    );
    const matchedMembers = exactMatch
      ? [exactMatch]
      : normalizedValue
        ? invoiceMembers.filter((entry) => entry.optionLabel.toLowerCase().includes(normalizedValue))
        : [];
    const matchedMember = matchedMembers.length === 1 ? matchedMembers[0] : exactMatch;
    if (matchedMember) {
      handleMemberChange(matchedMember.userId, matchedMember.optionLabel);
      return;
    }
    setPaymentState((prev) => ({
      ...prev,
      memberId: '',
      invoiceId: '',
      amount: '',
    }));
  }

  function handleInvoiceChange(invoiceId: string) {
    const duesBucket = selectedMemberDuesBuckets.find((item) => item.anchorInvoiceId === invoiceId);
    setPaymentState((prev) => ({
      ...prev,
      invoiceId,
      amount: duesBucket ? String(Number(duesBucket.totalOutstanding.toFixed(2))) : prev.amount,
    }));
  }

  function resetSchemeForm() {
    const normalized = normalizeScopeSelection(scopeAccess, schemeForm.scopeType, schemeForm.scopeId);
    setSchemeForm({
      title: '',
      amount: '',
      currency: 'NGN',
      frequency: 'annual',
      oneOffYear: String(currentYear),
      scopeType: normalized.scopeType,
      scopeId: normalized.scopeId,
    });
  }

  function handleReportFiltersSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadOverviewReport(reportFilters);
  }

  function handleScopedReportFiltersSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadScopedReport(scopedFilters);
  }

  async function createScheme(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSchemeBusy(true);
    setError(null);
    setStatus(null);

    const amount = Number(schemeForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Scheme amount must be greater than zero.');
      setSchemeBusy(false);
      return;
    }
    if (schemeForm.scopeType !== 'global' && !schemeForm.scopeId) {
      setError('Select a scope for class/branch schemes.');
      setSchemeBusy(false);
      return;
    }
    const oneOffYear =
      schemeForm.frequency === 'one_off'
        ? Number(schemeForm.oneOffYear)
        : undefined;
    if (
      schemeForm.frequency === 'one_off' &&
      (!Number.isInteger(oneOffYear) || oneOffYear < 2000 || oneOffYear > 2100)
    ) {
      setError('Provide a valid one-off year between 2000 and 2100.');
      setSchemeBusy(false);
      return;
    }

    try {
      await fetchJson<DuesSchemeDTO>('/finance/schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: schemeForm.title,
          amount,
          currency: schemeForm.currency || 'NGN',
          frequency: schemeForm.frequency,
          oneOffYear,
          scopeType: schemeForm.scopeType,
          scopeId: schemeForm.scopeType === 'global' ? undefined : schemeForm.scopeId,
        }),
        token: authToken,
      });
      setStatus('Scheme created.');
      resetSchemeForm();
      setDuesViewTab('manage');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scheme.');
    } finally {
      setSchemeBusy(false);
    }
  }

  async function toggleSchemeStatus(scheme: DuesSchemeDTO) {
    const nextStatus = scheme.status === 'active' ? 'inactive' : 'active';
    const prompt =
      nextStatus === 'active'
        ? `Activate scheme "${scheme.title}"?`
        : `Deactivate scheme "${scheme.title}"?`;
    if (!window.confirm(prompt)) {
      return;
    }
    setSchemeActionId(scheme.id);
    setError(null);
    setStatus(null);
    try {
      await fetchJson<DuesSchemeDTO>(`/finance/schemes/${scheme.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
        token: authToken,
      });
      setStatus(`Scheme ${nextStatus}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update scheme.');
    } finally {
      setSchemeActionId(null);
    }
  }

  async function generateInvoices(scheme: DuesSchemeDTO) {
    setSchemeActionId(scheme.id);
    setError(null);
    setStatus(null);
    try {
      const response = await fetchJson<{ created: number; skipped: number }>(`/finance/schemes/${scheme.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: scheme.frequency === 'one_off' ? scheme.oneOffYear ?? currentYear : currentYear }),
        token: authToken,
      });
      setStatus(`Generated ${response.created} invoice(s), skipped ${response.skipped}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoices.');
    } finally {
      setSchemeActionId(null);
    }
  }

  async function deleteScheme(scheme: DuesSchemeDTO) {
    if (!window.confirm(`Delete scheme \"${scheme.title}\"?`)) {
      return;
    }

    setSchemeActionId(scheme.id);
    setError(null);
    setStatus(null);
    try {
      await fetchJson<{ success: boolean }>(`/finance/schemes/${scheme.id}`, {
        method: 'DELETE',
        token: authToken,
      });
      setStatus('Scheme deleted.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete scheme.');
    } finally {
      setSchemeActionId(null);
    }
  }

  function resetProjectForm() {
    const normalized = normalizeScopeSelection(scopeAccess, projectForm.scopeType, projectForm.scopeId);
    setProjectForm({
      name: '',
      scopeType: normalized.scopeType,
      scopeId: normalized.scopeId,
      budget: '',
      startDate: '',
      endDate: '',
      status: 'planning',
    });
  }

  function resetExpenseForm() {
    const normalized = normalizeScopeSelection(scopeAccess, expenseForm.scopeType, expenseForm.scopeId);
    setExpenseForm({
      scopeType: normalized.scopeType,
      scopeId: normalized.scopeId,
      projectId: '',
      title: '',
      description: '',
      amount: '',
      currency: 'NGN',
      notes: '',
    });
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProjectBusy(true);
    setError(null);
    setStatus(null);

    const budget = projectForm.budget ? Number(projectForm.budget) : 0;
    if (!Number.isFinite(budget) || budget < 0) {
      setError('Project budget must be zero or greater.');
      setProjectBusy(false);
      return;
    }
    if (projectForm.scopeType !== 'global' && !projectForm.scopeId) {
      setError('Select a scope for class/branch projects.');
      setProjectBusy(false);
      return;
    }

    try {
      await fetchJson<ProjectDTO>('/finance/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectForm.name,
          scopeType: projectForm.scopeType,
          scopeId: projectForm.scopeType === 'global' ? undefined : projectForm.scopeId,
          budget,
          status: projectForm.status,
          startDate: projectForm.startDate || undefined,
          endDate: projectForm.endDate || undefined,
        }),
        token: authToken,
      });
      setStatus('Project created.');
      resetProjectForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project.');
    } finally {
      setProjectBusy(false);
    }
  }

  async function deleteProject(project: ProjectDTO) {
    if (!window.confirm(`Delete project \"${project.name}\"?`)) {
      return;
    }
    setProjectActionId(project.id);
    setError(null);
    setStatus(null);
    try {
      await fetchJson<{ success: boolean }>(`/finance/projects/${project.id}`, {
        method: 'DELETE',
        token: authToken,
      });
      setStatus('Project deleted.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project.');
    } finally {
      setProjectActionId(null);
    }
  }

  function toDateInput(value?: string | null) {
    if (!value) {
      return '';
    }
    return value.slice(0, 10);
  }

  function startProjectEdit(project: ProjectDTO) {
    setEditingProjectId(project.id);
    setProjectEditForm({
      name: project.name,
      scopeType: project.scopeType,
      scopeId: project.scopeId ?? '',
      budget: String(project.budget ?? 0),
      startDate: toDateInput(project.startDate),
      endDate: toDateInput(project.endDate),
      status: project.status,
    });
  }

  function cancelProjectEdit() {
    setEditingProjectId(null);
  }

  async function saveProjectEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProjectId) {
      return;
    }
    const budget = projectEditForm.budget ? Number(projectEditForm.budget) : 0;
    if (!Number.isFinite(budget) || budget < 0) {
      setError('Project budget must be zero or greater.');
      return;
    }
    if (projectEditForm.scopeType !== 'global' && !projectEditForm.scopeId) {
      setError('Select a scope for class/branch projects.');
      return;
    }

    setProjectEditBusy(true);
    setError(null);
    setStatus(null);
    try {
      await fetchJson<ProjectDTO>(`/finance/projects/${editingProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectEditForm.name,
          scopeType: projectEditForm.scopeType,
          scopeId: projectEditForm.scopeType === 'global' ? undefined : projectEditForm.scopeId,
          budget,
          status: projectEditForm.status,
          startDate: projectEditForm.startDate || null,
          endDate: projectEditForm.endDate || null,
        }),
        token: authToken,
      });
      setStatus('Project updated.');
      setEditingProjectId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project.');
    } finally {
      setProjectEditBusy(false);
    }
  }

  async function createExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExpenseBusy(true);
    setError(null);
    setStatus(null);

    const amount = Number(expenseForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Expense amount must be greater than zero.');
      setExpenseBusy(false);
      return;
    }
    if (expenseForm.scopeType !== 'global' && !expenseForm.scopeId) {
      setError('Select a scope for class/branch expenses.');
      setExpenseBusy(false);
      return;
    }

    try {
      await fetchJson<ExpenseDTO>('/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeType: expenseForm.scopeType,
          scopeId: expenseForm.scopeType === 'global' ? undefined : expenseForm.scopeId,
          projectId: expenseForm.projectId || undefined,
          title: expenseForm.title,
          description: expenseForm.description || undefined,
          notes: expenseForm.notes || undefined,
          amount,
          currency: expenseForm.currency || 'NGN',
        }),
        token: authToken,
      });
      setStatus('Expense submitted.');
      resetExpenseForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit expense.');
    } finally {
      setExpenseBusy(false);
    }
  }

  async function runExpenseAction(
    expenseId: string,
    endpoint: 'approve-first' | 'approve-final' | 'reject',
    successMessage: string,
  ) {
    const confirmMessage =
      endpoint === 'approve-first'
        ? 'Confirm first-stage approval for this expense?'
        : endpoint === 'approve-final'
          ? 'Confirm final approval for this expense?'
          : 'Confirm rejection of this expense?';
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setExpenseActionId(expenseId);
    setError(null);
    setStatus(null);
    try {
      await fetchJson<ExpenseDTO>(`/finance/expenses/${expenseId}/${endpoint}`, {
        method: 'POST',
        token: authToken,
      });
      setStatus(successMessage);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense.');
    } finally {
      setExpenseActionId(null);
    }
  }

  function startExpenseEdit(expense: ExpenseDTO) {
    if (expense.approvalStage === 'approved' || expense.approvalStage === 'rejected') {
      setError('Finalized expenses cannot be edited.');
      return;
    }
    setEditingExpenseId(expense.id);
    setExpenseEditForm({
      scopeType: expense.scopeType,
      scopeId: expense.scopeId ?? '',
      projectId: expense.projectId ?? '',
      title: expense.title,
      description: expense.description ?? '',
      amount: String(expense.amount),
      currency: expense.currency,
      notes: expense.notes ?? '',
    });
  }

  function cancelExpenseEdit() {
    setEditingExpenseId(null);
  }

  async function saveExpenseEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingExpenseId) {
      return;
    }
    const amount = Number(expenseEditForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Expense amount must be greater than zero.');
      return;
    }
    if (expenseEditForm.scopeType !== 'global' && !expenseEditForm.scopeId) {
      setError('Select a scope for class/branch expenses.');
      return;
    }

    setExpenseEditBusy(true);
    setError(null);
    setStatus(null);
    try {
      await fetchJson<ExpenseDTO>(`/finance/expenses/${editingExpenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeType: expenseEditForm.scopeType,
          scopeId: expenseEditForm.scopeType === 'global' ? undefined : expenseEditForm.scopeId,
          projectId: expenseEditForm.projectId || null,
          title: expenseEditForm.title,
          description: expenseEditForm.description || null,
          amount,
          currency: expenseEditForm.currency,
          notes: expenseEditForm.notes || null,
        }),
        token: authToken,
      });
      setStatus('Expense updated.');
      setEditingExpenseId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense.');
    } finally {
      setExpenseEditBusy(false);
    }
  }

  async function deleteExpense(expense: ExpenseDTO) {
    if (!window.confirm(`Delete expense \"${expense.title}\"?`)) {
      return;
    }
    setExpenseActionId(expense.id);
    setError(null);
    setStatus(null);
    try {
      await fetchJson<{ success: boolean }>(`/finance/expenses/${expense.id}`, {
        method: 'DELETE',
        token: authToken,
      });
      setStatus('Expense deleted.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense.');
    } finally {
      setExpenseActionId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setStatus(null);

    if (paymentState.paymentType !== 'dues') {
      setError('Only dues payments are currently supported.');
      setSubmitting(false);
      return;
    }

    if (!paymentState.memberId) {
      setError('Select the member for this payment.');
      setSubmitting(false);
      return;
    }

    const invoice = selectedMemberInvoices.find((item) => item.id === paymentState.invoiceId);
    if (!invoice) {
      setError('Please select the dues item to credit.');
      setSubmitting(false);
      return;
    }

    const amountNumber = Number(paymentState.amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError('Enter a valid payment amount.');
      setSubmitting(false);
      return;
    }

    try {
      await fetchJson('/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payerUserId: paymentState.memberId,
          amount: amountNumber,
          channel: paymentState.channel || 'manual',
          reference: paymentState.reference || undefined,
          notes: paymentState.notes || undefined,
          paidAt: paymentState.paidAt || undefined,
          invoiceId: invoice.id,
          invoiceApplications: [{ invoiceId: invoice.id, amount: amountNumber }],
        }),
        token: authToken,
      });
      setPaymentState({
        paymentType: 'dues',
        memberId: '',
        invoiceId: '',
        amount: '',
        channel: 'manual',
        reference: '',
        notes: '',
        paidAt: nowLocalDateTimeValue(),
      });
      setPaymentMemberInput('');
      setStatus('Payment recorded successfully.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {renderSectionTabs && (
        <section className="rounded-xl border border-red-100 bg-red-50/70 p-2 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {visibleSections.map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setActiveSection(section)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  activeSection === section
                    ? 'border-red-300 bg-red-600 text-white shadow-sm'
                    : 'border-red-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
                }`}
              >
                {FINANCE_SECTION_LABELS[section]}
              </button>
            ))}
          </div>
        </section>
      )}

      {(error || status) && (
        <div
          className={`status-banner text-sm ${
            error
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {error ?? status}
        </div>
      )}

      {activeSection === 'reports' && (
        <>
      {hasGlobalScopeAccess ? (
      <section className="surface-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Finance overview report</h2>
          <button
            type="button"
            className="btn-secondary disabled:opacity-50"
            onClick={downloadOverviewReport}
            disabled={reportDownloading}
          >
            {reportDownloading ? 'Preparing CSV...' : 'Export CSV'}
          </button>
        </div>

        <form onSubmit={handleReportFiltersSubmit} className="mt-4 grid gap-4 md:grid-cols-6">
          <label className="text-sm text-slate-600">
            Year
            <input
              type="number"
              min="2000"
              max="2100"
              className="field-input"
              value={reportFilters.year}
              onChange={(event) => setReportFilters((prev) => ({ ...prev, year: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Month
            <input
              type="number"
              min="1"
              max="12"
              placeholder="All"
              className="field-input"
              value={reportFilters.month}
              onChange={(event) => setReportFilters((prev) => ({ ...prev, month: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Scope
            <select
              className="field-input"
              value={reportFilters.scopeType}
              onChange={(event) =>
                setReportFilters((prev) => {
                  const nextScopeType = event.target.value as ReportFilterState['scopeType'];
                  return {
                    ...prev,
                    scopeType: nextScopeType,
                    scopeId: defaultScopeIdForType(scopeAccess, nextScopeType),
                  };
                })
              }
            >
              {scopeTypeChoices.map((option) => (
                <option key={option} value={option}>
                  {option === 'global' ? 'Global' : option === 'branch' ? 'Branch' : 'Class'}
                </option>
              ))}
            </select>
          </label>

          {reportFilters.scopeType !== 'global' && (
            <label className="text-sm text-slate-600 md:col-span-2">
              {reportFilters.scopeType === 'branch' ? 'Branch' : 'Class'}
              <select
                className="field-input"
                value={reportFilters.scopeId}
                onChange={(event) => setReportFilters((prev) => ({ ...prev, scopeId: event.target.value }))}
                required
              >
                <option value="">Select</option>
                {(reportFilters.scopeType === 'branch' ? scopeOptions.branches : scopeOptions.classes).map((item) => (
                  <option key={item.id} value={item.id}>
                    {'entryYear' in item ? `${item.entryYear} - ${item.label}` : item.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="self-end">
            <button
              type="submit"
              className="btn-primary disabled:opacity-50"
              disabled={reportLoading}
            >
              {reportLoading ? 'Loading...' : 'Run report'}
            </button>
          </div>
        </form>

        {reportError && <p className="mt-3 text-sm text-rose-600">{reportError}</p>}

        {reportData && (
          <>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {Object.entries(reportData.totalsByCurrency).map(([currency, totals]) => (
                <div key={currency} className="surface-muted p-4">
                  <p className="text-xs uppercase text-slate-500">{currency}</p>
                  <p className="text-sm text-slate-600">Billed: {totals.billed.toLocaleString()}</p>
                  <p className="text-sm text-red-700">Paid: {totals.paid.toLocaleString()}</p>
                  <p className="text-sm text-rose-700">Outstanding: {totals.outstanding.toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-xs text-slate-500">
                Search overview rows
                <input
                  className="field-input text-sm"
                  placeholder="Search member name or alumni number"
                  value={reportQuery}
                  onChange={(event) => {
                    setReportQuery(event.target.value);
                    setReportPage(1);
                  }}
                />
              </label>
              <p className="text-xs text-slate-500 md:pt-6">{filteredReportRows.length} record(s)</p>
            </div>
            <div className="table-wrap">
              <table className="table-base">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Member</th>
                    <th className="py-2">Currency</th>
                    <th className="py-2">Invoices</th>
                    <th className="py-2">Payments</th>
                    <th className="py-2">Billed</th>
                    <th className="py-2">Paid</th>
                    <th className="py-2">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedReportRows.map((row) => (
                    <tr key={`${row.userId}-${row.currency}`} className="table-row">
                      <td className="py-2">
                        <p className="font-medium text-slate-900">{formatMemberIdentity(row.userName, row.userAlumniNumber)}</p>
                        {row.userName && row.userAlumniNumber && (
                          <p className="text-xs text-slate-500">{row.userName}</p>
                        )}
                      </td>
                      <td className="py-2">{row.currency}</td>
                      <td className="py-2">{row.invoices}</td>
                      <td className="py-2">{row.payments}</td>
                      <td className="py-2">{row.billed.toLocaleString()}</td>
                      <td className="py-2">{row.paid.toLocaleString()}</td>
                      <td className="py-2 font-semibold text-rose-700">{row.outstanding.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={reportCurrentPage}
              pageSize={reportPageSize}
              total={filteredReportRows.length}
              onPageChange={setReportPage}
              onPageSizeChange={(value) => {
                setReportPageSize(value);
                setReportPage(1);
              }}
            />
          </>
        )}
      </section>
      ) : (
        <section className="surface-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Finance overview report</h2>
          <p className="mt-2 text-sm text-slate-500">
            Global finance overview is available to global executives only. Use the scoped dashboard below.
          </p>
        </section>
      )}

      <section className="surface-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Scoped finance dashboard</h2>
          <button
            type="button"
            className="btn-secondary disabled:opacity-50"
            onClick={downloadScopedReport}
            disabled={scopedDownloading}
          >
            {scopedDownloading ? 'Preparing CSV...' : 'Export scoped CSV'}
          </button>
        </div>

        {scopeAccessError && <p className="mt-3 text-sm text-rose-600">{scopeAccessError}</p>}

        {scopeAccess && (
          <form onSubmit={handleScopedReportFiltersSubmit} className="mt-4 grid gap-4 md:grid-cols-6">
            <label className="text-sm text-slate-600">
              Year
              <input
                type="number"
                min="2000"
                max="2100"
                className="field-input"
                value={scopedFilters.year}
                onChange={(event) => setScopedFilters((prev) => ({ ...prev, year: event.target.value }))}
              />
            </label>
            <label className="text-sm text-slate-600">
              Month
              <input
                type="number"
                min="1"
                max="12"
                placeholder="All"
                className="field-input"
                value={scopedFilters.month}
                onChange={(event) => setScopedFilters((prev) => ({ ...prev, month: event.target.value }))}
              />
            </label>
            <label className="text-sm text-slate-600">
              Scope
              <select
                className="field-input"
                value={scopedFilters.scopeType}
                onChange={(event) => {
                  const nextScopeType = event.target.value as ReportFilterState['scopeType'];
                  const defaultScopeId =
                    nextScopeType === 'branch'
                      ? scopeAccess.branches[0]?.id || ''
                      : nextScopeType === 'class'
                        ? scopeAccess.classes[0]?.id || ''
                        : '';
                  setScopedFilters((prev) => ({
                    ...prev,
                    scopeType: nextScopeType,
                    scopeId: defaultScopeId,
                  }));
                }}
              >
                {scopeTypeChoices.map((option) => (
                  <option key={option} value={option}>
                    {option === 'global' ? 'Global' : option === 'branch' ? 'Branch' : 'Class'}
                  </option>
                ))}
              </select>
            </label>

            {scopedFilters.scopeType !== 'global' && (
              <label className="text-sm text-slate-600 md:col-span-2">
                {scopedFilters.scopeType === 'branch' ? 'Branch' : 'Class'}
                <select
                  className="field-input"
                  value={scopedFilters.scopeId}
                  onChange={(event) => setScopedFilters((prev) => ({ ...prev, scopeId: event.target.value }))}
                  required
                >
                  <option value="">Select</option>
                  {(scopedFilters.scopeType === 'branch' ? scopeAccess.branches : scopeAccess.classes).map((item) => (
                    <option key={item.id} value={item.id}>
                      {'entryYear' in item ? `${item.entryYear} - ${item.label}` : item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="self-end">
              <button
                type="submit"
                className="btn-primary disabled:opacity-50"
                disabled={scopedLoading}
              >
                {scopedLoading ? 'Loading...' : 'Run scoped report'}
              </button>
            </div>
          </form>
        )}

        {scopedError && <p className="mt-3 text-sm text-rose-600">{scopedError}</p>}

        {scopedReport && (
          <>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {Object.entries(scopedReport.totalsByCurrency).map(([currency, totals]) => (
                <div key={currency} className="surface-muted p-4">
                  <p className="text-xs uppercase text-slate-500">{currency}</p>
                  <p className="text-sm text-slate-600">Billed: {totals.billed.toLocaleString()}</p>
                  <p className="text-sm text-red-700">Paid: {totals.paid.toLocaleString()}</p>
                  <p className="text-sm text-rose-700">Outstanding: {totals.outstanding.toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-xs text-slate-500">
                Search scoped rows
                <input
                  className="field-input text-sm"
                  placeholder="Search member name or alumni number"
                  value={scopedQuery}
                  onChange={(event) => {
                    setScopedQuery(event.target.value);
                    setScopedPage(1);
                  }}
                />
              </label>
              <p className="text-xs text-slate-500 md:pt-6">{filteredScopedRows.length} record(s)</p>
            </div>
            <div className="table-wrap">
              <table className="table-base">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Member</th>
                    <th className="py-2">Currency</th>
                    <th className="py-2">Invoices</th>
                    <th className="py-2">Payments</th>
                    <th className="py-2">Billed</th>
                    <th className="py-2">Paid</th>
                    <th className="py-2">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedScopedRows.map((row) => (
                    <tr key={`${row.userId}-${row.currency}`} className="table-row">
                      <td className="py-2">
                        <p className="font-medium text-slate-900">{formatMemberIdentity(row.userName, row.userAlumniNumber)}</p>
                        {row.userName && row.userAlumniNumber && (
                          <p className="text-xs text-slate-500">{row.userName}</p>
                        )}
                      </td>
                      <td className="py-2">{row.currency}</td>
                      <td className="py-2">{row.invoices}</td>
                      <td className="py-2">{row.payments}</td>
                      <td className="py-2">{row.billed.toLocaleString()}</td>
                      <td className="py-2">{row.paid.toLocaleString()}</td>
                      <td className="py-2 font-semibold text-rose-700">{row.outstanding.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={scopedCurrentPage}
              pageSize={scopedPageSize}
              total={filteredScopedRows.length}
              onPageChange={setScopedPage}
              onPageSizeChange={(value) => {
                setScopedPageSize(value);
                setScopedPage(1);
              }}
            />
          </>
        )}
      </section>
      </>
      )}

      {activeSection === 'dues' && (
        <>
      <section className="surface-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Monthly finance snapshots</h2>
          <button
            type="button"
            className="btn-secondary disabled:opacity-50"
            onClick={() => void loadSnapshots()}
            disabled={snapshotsLoading}
          >
            Refresh
          </button>
        </div>

        {scopeAccess?.hasGlobalAccess && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm text-slate-600">
              Year
              <input
                type="number"
                min="2000"
                max="2100"
                className="mt-1 rounded-lg border border-slate-200 px-3 py-2"
                value={snapshotCapture.year}
                onChange={(event) => setSnapshotCapture((prev) => ({ ...prev, year: event.target.value }))}
              />
            </label>
            <label className="text-sm text-slate-600">
              Month
              <input
                type="number"
                min="1"
                max="12"
                className="mt-1 rounded-lg border border-slate-200 px-3 py-2"
                value={snapshotCapture.month}
                onChange={(event) => setSnapshotCapture((prev) => ({ ...prev, month: event.target.value }))}
              />
            </label>
            <button
              type="button"
              className="btn-primary disabled:opacity-50"
              onClick={() => void captureSnapshots()}
              disabled={snapshotCaptureBusy}
            >
              {snapshotCaptureBusy ? 'Capturing...' : 'Capture snapshots'}
            </button>
          </div>
        )}

        {snapshotsError && <p className="mt-3 text-sm text-rose-600">{snapshotsError}</p>}
        {snapshotsLoading && <p className="mt-3 text-sm text-slate-500">Loading snapshots...</p>}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-500">
            Search snapshots
            <input
              className="field-input text-sm"
              placeholder="Search period or scope"
              value={snapshotQuery}
              onChange={(event) => {
                setSnapshotQuery(event.target.value);
                setSnapshotPage(1);
              }}
            />
          </label>
          <p className="text-xs text-slate-500 md:pt-6">{filteredSnapshots.length} record(s)</p>
        </div>
        {!snapshotsLoading && filteredSnapshots.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No snapshots yet.</p>
        )}
        {filteredSnapshots.length > 0 && (
          <>
          <div className="table-wrap">
            <table className="table-base">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Period</th>
                  <th className="py-2">Scope</th>
                  <th className="py-2">Rows</th>
                  <th className="py-2">Currencies</th>
                  <th className="py-2">Generated</th>
                </tr>
              </thead>
              <tbody>
                {pagedSnapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="table-row">
                    <td className="py-2">{snapshot.period}</td>
                    <td className="py-2">
                      {snapshot.scopeType}
                      {snapshot.scopeId ? ` (${scopeLabelById.get(snapshot.scopeId) ?? snapshot.scopeId})` : ''}
                    </td>
                    <td className="py-2">{snapshot.rowCount}</td>
                    <td className="py-2">
                      {Object.entries(snapshot.totalsByCurrency)
                        .map(([currency, totals]) => `${currency}: ${totals.outstanding.toLocaleString()}`)
                        .join(' | ')}
                    </td>
                    <td className="py-2 text-xs text-slate-500">{new Date(snapshot.generatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={snapshotCurrentPage}
            pageSize={snapshotPageSize}
            total={filteredSnapshots.length}
            onPageChange={setSnapshotPage}
            onPageSizeChange={(value) => {
              setSnapshotPageSize(value);
              setSnapshotPage(1);
            }}
          />
          </>
        )}
      </section>

      <section className="surface-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Dues schemes</h2>
          <span className="text-sm text-slate-500">{summary.schemes.length} scheme(s)</span>
        </div>
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50/70 p-2">
          <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              duesViewTab === 'manage'
                ? 'border-red-300 bg-red-600 text-white shadow-sm'
                : 'border-red-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
            }`}
            onClick={() => setDuesViewTab('manage')}
          >
            Manage dues
          </button>
          <button
            type="button"
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              duesViewTab === 'create'
                ? 'border-red-300 bg-red-600 text-white shadow-sm'
                : 'border-red-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
            }`}
            onClick={() => setDuesViewTab('create')}
          >
            Create dues
          </button>
          </div>
        </div>

        {duesViewTab === 'create' && (
        <form onSubmit={createScheme} className="mt-4 grid gap-4 md:grid-cols-6">
          <label className="text-sm text-slate-600 md:col-span-2">
            Title
            <input
              className="field-input"
              value={schemeForm.title}
              onChange={(event) => setSchemeForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </label>
          <label className="text-sm text-slate-600">
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              className="field-input"
              value={schemeForm.amount}
              onChange={(event) => setSchemeForm((prev) => ({ ...prev, amount: event.target.value }))}
              required
            />
          </label>
          <label className="text-sm text-slate-600">
            Currency
            <input
              className="field-input uppercase"
              value={schemeForm.currency}
              maxLength={3}
              onChange={(event) =>
                setSchemeForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))
              }
              required
            />
          </label>
          <label className="text-sm text-slate-600">
            Frequency
            <select
              className="field-input"
              value={schemeForm.frequency}
              onChange={(event) =>
                setSchemeForm((prev) => ({
                  ...prev,
                  frequency: event.target.value as SchemeFormState['frequency'],
                  oneOffYear:
                    event.target.value === 'one_off' && !prev.oneOffYear
                      ? String(currentYear)
                      : prev.oneOffYear,
                }))
              }
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
              <option value="one_off">One-off</option>
            </select>
          </label>
          {schemeForm.frequency === 'one_off' && (
            <label className="text-sm text-slate-600">
              One-off year
              <input
                type="number"
                min="2000"
                max="2100"
                className="field-input"
                value={schemeForm.oneOffYear}
                onChange={(event) => setSchemeForm((prev) => ({ ...prev, oneOffYear: event.target.value }))}
                required
              />
            </label>
          )}
          <label className="text-sm text-slate-600">
            Scope
            <select
              className="field-input"
              value={schemeForm.scopeType}
              onChange={(event) =>
                setSchemeForm((prev) => {
                  const nextScopeType = event.target.value as SchemeFormState['scopeType'];
                  return {
                    ...prev,
                    scopeType: nextScopeType,
                    scopeId: defaultScopeIdForType(scopeAccess, nextScopeType),
                  };
                })
              }
            >
              {scopeTypeChoices.map((option) => (
                <option key={option} value={option}>
                  {option === 'global' ? 'Global' : option === 'branch' ? 'Branch' : 'Class'}
                </option>
              ))}
            </select>
          </label>

          {schemeForm.scopeType !== 'global' && (
            <label className="text-sm text-slate-600 md:col-span-2">
              {schemeForm.scopeType === 'branch' ? 'Branch' : 'Class'}
              <select
                className="field-input"
                value={schemeForm.scopeId}
                onChange={(event) => setSchemeForm((prev) => ({ ...prev, scopeId: event.target.value }))}
                required
              >
                <option value="">Select</option>
                {(schemeForm.scopeType === 'branch' ? scopeOptions.branches : scopeOptions.classes).map((item) => (
                  <option key={item.id} value={item.id}>
                    {'entryYear' in item ? `${item.entryYear} - ${item.label}` : item.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="md:col-span-6">
            <button
              type="submit"
              className="btn-primary disabled:opacity-50"
              disabled={schemeBusy}
            >
              {schemeBusy ? 'Saving...' : 'Create scheme'}
            </button>
            {scopeLoadError && <p className="mt-2 text-xs text-rose-600">{scopeLoadError}</p>}
          </div>
        </form>
        )}

        {editingProjectId && (
          <form onSubmit={saveProjectEdit} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Edit project</p>
            <div className="mt-3 grid gap-4 md:grid-cols-6">
              <label className="text-sm text-slate-600 md:col-span-2">
                Name
                <input
                  className="field-input"
                  value={projectEditForm.name}
                  onChange={(event) => setProjectEditForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label className="text-sm text-slate-600">
                Budget
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="field-input"
                  value={projectEditForm.budget}
                  onChange={(event) => setProjectEditForm((prev) => ({ ...prev, budget: event.target.value }))}
                />
              </label>
              <label className="text-sm text-slate-600">
                Status
                <select
                  className="field-input"
                  value={projectEditForm.status}
                  onChange={(event) =>
                    setProjectEditForm((prev) => ({
                      ...prev,
                      status: event.target.value as ProjectFormState['status'],
                    }))
                  }
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Scope
                <select
                  className="field-input"
                  value={projectEditForm.scopeType}
                  onChange={(event) =>
                    setProjectEditForm((prev) => {
                      const nextScopeType = event.target.value as ProjectFormState['scopeType'];
                      return {
                        ...prev,
                        scopeType: nextScopeType,
                        scopeId: defaultScopeIdForType(scopeAccess, nextScopeType),
                      };
                    })
                  }
                >
                  {scopeTypeChoices.map((option) => (
                    <option key={option} value={option}>
                      {option === 'global' ? 'Global' : option === 'branch' ? 'Branch' : 'Class'}
                    </option>
                  ))}
                </select>
              </label>
              {projectEditForm.scopeType !== 'global' && (
                <label className="text-sm text-slate-600 md:col-span-2">
                  {projectEditForm.scopeType === 'branch' ? 'Branch' : 'Class'}
                  <select
                    className="field-input"
                    value={projectEditForm.scopeId}
                    onChange={(event) => setProjectEditForm((prev) => ({ ...prev, scopeId: event.target.value }))}
                    required
                  >
                    <option value="">Select</option>
                    {(projectEditForm.scopeType === 'branch' ? scopeOptions.branches : scopeOptions.classes).map((item) => (
                      <option key={item.id} value={item.id}>
                        {'entryYear' in item ? `${item.entryYear} - ${item.label}` : item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="text-sm text-slate-600">
                Start date
                <input
                  type="date"
                  className="field-input"
                  value={projectEditForm.startDate}
                  onChange={(event) => setProjectEditForm((prev) => ({ ...prev, startDate: event.target.value }))}
                />
              </label>
              <label className="text-sm text-slate-600">
                End date
                <input
                  type="date"
                  className="field-input"
                  value={projectEditForm.endDate}
                  onChange={(event) => setProjectEditForm((prev) => ({ ...prev, endDate: event.target.value }))}
                />
              </label>
              <div className="md:col-span-6 flex gap-2">
                <button
                  type="submit"
                  className="btn-primary disabled:opacity-50"
                  disabled={projectEditBusy}
                >
                  {projectEditBusy ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={cancelProjectEdit}
                  disabled={projectEditBusy}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-500">
            Search schemes
            <input
              className="field-input text-sm"
              placeholder="Search title, scope, status, or frequency"
              value={schemeQuery}
              onChange={(event) => setSchemeQuery(event.target.value)}
            />
          </label>
          <p className="text-xs text-slate-500 md:pt-6">{filteredSchemes.length} record(s)</p>
        </div>
        <div className="table-wrap">
          <table className="table-base">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Title</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Frequency</th>
                <th className="py-2">Scope</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedSchemes.map((scheme) => (
                <tr key={scheme.id} className="table-row">
                  <td className="py-2">{scheme.title}</td>
                  <td className="py-2">
                    {scheme.amount.toLocaleString()} {scheme.currency}
                  </td>
                  <td className="py-2 text-xs uppercase text-slate-500">
                    {scheme.frequency}
                    {scheme.frequency === 'one_off' && scheme.oneOffYear ? ` (${scheme.oneOffYear})` : ''}
                  </td>
                  <td className="py-2 text-xs text-slate-600">
                    {scheme.scopeType}
                    {scheme.scopeId ? ` (${scopeLabelById.get(scheme.scopeId) ?? scheme.scopeId})` : ''}
                  </td>
                  <td className="py-2 text-xs uppercase">{scheme.status}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                        onClick={() => toggleSchemeStatus(scheme)}
                        disabled={schemeActionId === scheme.id}
                      >
                        {scheme.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700"
                        onClick={() => generateInvoices(scheme)}
                        disabled={schemeActionId === scheme.id || scheme.status !== 'active'}
                      >
                        Generate {scheme.frequency === 'one_off' && scheme.oneOffYear ? scheme.oneOffYear : currentYear}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700"
                        onClick={() => deleteScheme(scheme)}
                        disabled={schemeActionId === scheme.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={schemeCurrentPage}
          pageSize={schemePageSize}
          total={filteredSchemes.length}
          onPageChange={setSchemePage}
          onPageSizeChange={(value) => {
            setSchemePageSize(value);
            setSchemePage(1);
          }}
        />
      </section>
      <InvoiceTable invoices={summary.invoices} />
      </>
      )}

      {activeSection === 'projects' && (
      <section className="surface-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
          <span className="text-sm text-slate-500">{filteredProjects.length} project(s)</span>
        </div>

        <form onSubmit={createProject} className="mt-4 grid gap-4 md:grid-cols-6">
          <label className="text-sm text-slate-600 md:col-span-2">
            Name
            <input
              className="field-input"
              value={projectForm.name}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label className="text-sm text-slate-600">
            Budget
            <input
              type="number"
              min="0"
              step="0.01"
              className="field-input"
              value={projectForm.budget}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, budget: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Status
            <select
              className="field-input"
              value={projectForm.status}
              onChange={(event) =>
                setProjectForm((prev) => ({
                  ...prev,
                  status: event.target.value as ProjectFormState['status'],
                }))
              }
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Scope
            <select
              className="field-input"
              value={projectForm.scopeType}
              onChange={(event) =>
                setProjectForm((prev) => {
                  const nextScopeType = event.target.value as ProjectFormState['scopeType'];
                  return {
                    ...prev,
                    scopeType: nextScopeType,
                    scopeId: defaultScopeIdForType(scopeAccess, nextScopeType),
                  };
                })
              }
            >
              {scopeTypeChoices.map((option) => (
                <option key={option} value={option}>
                  {option === 'global' ? 'Global' : option === 'branch' ? 'Branch' : 'Class'}
                </option>
              ))}
            </select>
          </label>

          {projectForm.scopeType !== 'global' && (
            <label className="text-sm text-slate-600 md:col-span-2">
              {projectForm.scopeType === 'branch' ? 'Branch' : 'Class'}
              <select
                className="field-input"
                value={projectForm.scopeId}
                onChange={(event) => setProjectForm((prev) => ({ ...prev, scopeId: event.target.value }))}
                required
              >
                <option value="">Select</option>
                {(projectForm.scopeType === 'branch' ? scopeOptions.branches : scopeOptions.classes).map((item) => (
                  <option key={item.id} value={item.id}>
                    {'entryYear' in item ? `${item.entryYear} - ${item.label}` : item.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="text-sm text-slate-600">
            Start date
            <input
              type="date"
              className="field-input"
              value={projectForm.startDate}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            End date
            <input
              type="date"
              className="field-input"
              value={projectForm.endDate}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </label>
          <div className="md:col-span-6">
            <button
              type="submit"
              className="btn-primary disabled:opacity-50"
              disabled={projectBusy}
            >
              {projectBusy ? 'Saving...' : 'Create project'}
            </button>
          </div>
        </form>

        {editingExpenseId && (
          <form onSubmit={saveExpenseEdit} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Edit expense</p>
            <div className="mt-3 grid gap-4 md:grid-cols-6">
              <label className="text-sm text-slate-600">
                Scope
                <select
                  className="field-input"
                  value={expenseEditForm.scopeType}
                  onChange={(event) =>
                    setExpenseEditForm((prev) => {
                      const nextScopeType = event.target.value as ExpenseFormState['scopeType'];
                      return {
                        ...prev,
                        scopeType: nextScopeType,
                        scopeId: defaultScopeIdForType(scopeAccess, nextScopeType),
                        projectId: '',
                      };
                    })
                  }
                >
                  {scopeTypeChoices.map((option) => (
                    <option key={option} value={option}>
                      {option === 'global' ? 'Global' : option === 'branch' ? 'Branch' : 'Class'}
                    </option>
                  ))}
                </select>
              </label>
              {expenseEditForm.scopeType !== 'global' && (
                <label className="text-sm text-slate-600 md:col-span-2">
                  {expenseEditForm.scopeType === 'branch' ? 'Branch' : 'Class'}
                  <select
                    className="field-input"
                    value={expenseEditForm.scopeId}
                    onChange={(event) =>
                      setExpenseEditForm((prev) => ({
                        ...prev,
                        scopeId: event.target.value,
                        projectId: '',
                      }))
                    }
                    required
                  >
                    <option value="">Select</option>
                    {(expenseEditForm.scopeType === 'branch' ? scopeOptions.branches : scopeOptions.classes).map((item) => (
                      <option key={item.id} value={item.id}>
                        {'entryYear' in item ? `${item.entryYear} - ${item.label}` : item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="text-sm text-slate-600 md:col-span-2">
                Project (optional)
                <select
                  className="field-input"
                  value={expenseEditForm.projectId}
                  onChange={(event) => setExpenseEditForm((prev) => ({ ...prev, projectId: event.target.value }))}
                >
                  <option value="">None</option>
                  {projectOptionsForExpenseEdit.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-600 md:col-span-3">
                Title
                <input
                  className="field-input"
                  value={expenseEditForm.title}
                  onChange={(event) => setExpenseEditForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </label>
              <label className="text-sm text-slate-600">
                Amount
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="field-input"
                  value={expenseEditForm.amount}
                  onChange={(event) => setExpenseEditForm((prev) => ({ ...prev, amount: event.target.value }))}
                  required
                />
              </label>
              <label className="text-sm text-slate-600">
                Currency
                <input
                  className="field-input uppercase"
                  value={expenseEditForm.currency}
                  maxLength={3}
                  onChange={(event) =>
                    setExpenseEditForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))
                  }
                  required
                />
              </label>
              <label className="text-sm text-slate-600 md:col-span-3">
                Description
                <textarea
                  className="field-input"
                  rows={2}
                  value={expenseEditForm.description}
                  onChange={(event) => setExpenseEditForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <label className="text-sm text-slate-600 md:col-span-3">
                Notes
                <textarea
                  className="field-input"
                  rows={2}
                  value={expenseEditForm.notes}
                  onChange={(event) => setExpenseEditForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </label>
              <div className="md:col-span-6 flex gap-2">
                <button
                  type="submit"
                  className="btn-primary disabled:opacity-50"
                  disabled={expenseEditBusy}
                >
                  {expenseEditBusy ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={cancelExpenseEdit}
                  disabled={expenseEditBusy}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-500">
            Search projects
            <input
              className="field-input text-sm"
              placeholder="Search name, scope, or status"
              value={projectQuery}
              onChange={(event) => setProjectQuery(event.target.value)}
            />
          </label>
          <p className="text-xs text-slate-500 md:pt-6">{filteredProjects.length} record(s)</p>
        </div>
        <div className="table-wrap">
          <table className="table-base">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Scope</th>
                <th className="py-2">Budget</th>
                <th className="py-2">Actual</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedProjects.map((project) => (
                <tr key={project.id} className="table-row">
                  <td className="py-2">
                    <div className="font-medium text-slate-900">{project.name}</div>
                    <div className="text-xs text-slate-500">
                      {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}
                      {' -> '}
                      {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
                    </div>
                  </td>
                  <td className="py-2 text-xs text-slate-600">
                    {project.scopeType}
                    {project.scopeId ? ` (${scopeLabelById.get(project.scopeId) ?? project.scopeId})` : ''}
                  </td>
                  <td className="py-2">{(project.budget ?? 0).toLocaleString()}</td>
                  <td className="py-2">{(project.actualSpend ?? 0).toLocaleString()}</td>
                  <td className="py-2 text-xs uppercase text-slate-500">{project.status}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
                        onClick={() => startProjectEdit(project)}
                        disabled={projectActionId === project.id || projectEditBusy}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700 disabled:opacity-50"
                        onClick={() => deleteProject(project)}
                        disabled={projectActionId === project.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={projectCurrentPage}
          pageSize={projectPageSize}
          total={filteredProjects.length}
          onPageChange={setProjectPage}
          onPageSizeChange={(value) => {
            setProjectPageSize(value);
            setProjectPage(1);
          }}
        />
      </section>
      )}

      {activeSection === 'expenses' && (
      <section className="surface-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Expenses</h2>
          <span className="text-sm text-slate-500">{filteredExpenses.length} expense(s)</span>
        </div>

        <form onSubmit={createExpense} className="mt-4 grid gap-4 md:grid-cols-6">
          <label className="text-sm text-slate-600">
            Scope
            <select
              className="field-input"
              value={expenseForm.scopeType}
              onChange={(event) =>
                setExpenseForm((prev) => {
                  const nextScopeType = event.target.value as ExpenseFormState['scopeType'];
                  return {
                    ...prev,
                    scopeType: nextScopeType,
                    scopeId: defaultScopeIdForType(scopeAccess, nextScopeType),
                    projectId: '',
                  };
                })
              }
            >
              {scopeTypeChoices.map((option) => (
                <option key={option} value={option}>
                  {option === 'global' ? 'Global' : option === 'branch' ? 'Branch' : 'Class'}
                </option>
              ))}
            </select>
          </label>
          {expenseForm.scopeType !== 'global' && (
            <label className="text-sm text-slate-600 md:col-span-2">
              {expenseForm.scopeType === 'branch' ? 'Branch' : 'Class'}
              <select
                className="field-input"
                value={expenseForm.scopeId}
                onChange={(event) => setExpenseForm((prev) => ({ ...prev, scopeId: event.target.value, projectId: '' }))}
                required
              >
                <option value="">Select</option>
                {(expenseForm.scopeType === 'branch' ? scopeOptions.branches : scopeOptions.classes).map((item) => (
                  <option key={item.id} value={item.id}>
                    {'entryYear' in item ? `${item.entryYear} - ${item.label}` : item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm text-slate-600 md:col-span-2">
            Project (optional)
            <select
              className="field-input"
              value={expenseForm.projectId}
              onChange={(event) => setExpenseForm((prev) => ({ ...prev, projectId: event.target.value }))}
            >
              <option value="">None</option>
              {projectOptionsForExpense.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600 md:col-span-3">
            Title
            <input
              className="field-input"
              value={expenseForm.title}
              onChange={(event) => setExpenseForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </label>
          <label className="text-sm text-slate-600">
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="field-input"
              value={expenseForm.amount}
              onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))}
              required
            />
          </label>
          <label className="text-sm text-slate-600">
            Currency
            <input
              className="field-input uppercase"
              value={expenseForm.currency}
              maxLength={3}
              onChange={(event) => setExpenseForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
              required
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-3">
            Description
            <textarea
              className="field-input"
              rows={2}
              value={expenseForm.description}
              onChange={(event) => setExpenseForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-3">
            Notes
            <textarea
              className="field-input"
              rows={2}
              value={expenseForm.notes}
              onChange={(event) => setExpenseForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>

          <div className="md:col-span-6">
            <button
              type="submit"
              className="btn-primary disabled:opacity-50"
              disabled={expenseBusy}
            >
              {expenseBusy ? 'Saving...' : 'Submit expense'}
            </button>
          </div>
        </form>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-500">
            Search expenses
            <input
              className="field-input text-sm"
              placeholder="Search title, project, scope, approval, or status"
              value={expenseQuery}
              onChange={(event) => setExpenseQuery(event.target.value)}
            />
          </label>
          <p className="text-xs text-slate-500 md:pt-6">{filteredExpenses.length} record(s)</p>
        </div>
        <div className="table-wrap">
          <table className="table-base">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Title</th>
                <th className="py-2">Scope</th>
                <th className="py-2">Project</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Approval</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedExpenses.map((expense) => (
                <tr key={expense.id} className="table-row">
                  <td className="py-2">
                    <div className="font-medium text-slate-900">{expense.title}</div>
                    <div className="text-xs text-slate-500">{expense.submittedByName ?? expense.submittedBy ?? '-'}</div>
                  </td>
                  <td className="py-2 text-xs text-slate-600">
                    {expense.scopeType}
                    {expense.scopeId ? ` (${scopeLabelById.get(expense.scopeId) ?? expense.scopeId})` : ''}
                  </td>
                  <td className="py-2 text-xs text-slate-600">{expense.projectName ?? '-'}</td>
                  <td className="py-2">
                    {expense.amount.toLocaleString()} {expense.currency}
                  </td>
                  <td className="py-2 text-xs uppercase text-slate-500">{expense.approvalStage}</td>
                  <td className="py-2 text-xs uppercase text-slate-500">{expense.status}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {expense.approvalStage === 'pending' && (
                        <button
                          type="button"
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 disabled:opacity-50"
                          onClick={() => runExpenseAction(expense.id, 'approve-first', 'Expense first approval completed.')}
                          disabled={expenseActionId === expense.id}
                        >
                          Finance approve
                        </button>
                      )}
                      {expense.approvalStage === 'finance_approved' && (
                        <button
                          type="button"
                          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 disabled:opacity-50"
                          onClick={() => runExpenseAction(expense.id, 'approve-final', 'Expense final approval completed.')}
                          disabled={expenseActionId === expense.id}
                        >
                          Final approve
                        </button>
                      )}
                      {expense.approvalStage !== 'approved' && expense.approvalStage !== 'rejected' && (
                        <button
                          type="button"
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700 disabled:opacity-50"
                          onClick={() => runExpenseAction(expense.id, 'reject', 'Expense rejected.')}
                          disabled={expenseActionId === expense.id}
                        >
                          Reject
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
                        onClick={() => startExpenseEdit(expense)}
                        disabled={
                          expenseActionId === expense.id ||
                          expenseEditBusy ||
                          expense.approvalStage === 'approved' ||
                          expense.approvalStage === 'rejected'
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700 disabled:opacity-50"
                        onClick={() => deleteExpense(expense)}
                        disabled={expenseActionId === expense.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={expenseCurrentPage}
          pageSize={expensePageSize}
          total={filteredExpenses.length}
          onPageChange={setExpensePage}
          onPageSizeChange={(value) => {
            setExpensePageSize(value);
            setExpensePage(1);
          }}
        />
      </section>
      )}

      {activeSection === 'payments' && (
        <>
      <section className="surface-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Post a payment</h2>
          <label className="text-sm text-slate-600 md:min-w-[420px]">
            Select a member
            <input
              className="field-input"
              placeholder="Type name, alumni number, or member ID"
              list="finance-payment-member-options"
              value={paymentMemberInput}
              onChange={(event) => handleMemberInputChange(event.target.value)}
            />
            <datalist id="finance-payment-member-options">
              {invoiceMembers.map((member) => (
                <option key={member.userId} value={member.optionLabel} />
              ))}
            </datalist>
          </label>
        </div>
        {outstandingInvoices.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            All invoices are settled. New payments will appear here once members incur balances.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-1">
              <label className="text-sm text-slate-600">
                Payment type
                <select
                  className="field-input"
                  value={paymentState.paymentType}
                  onChange={(event) =>
                    setPaymentState((prev) => ({
                      ...prev,
                      paymentType: event.target.value as PaymentType,
                    }))
                  }
                >
                  <option value="dues">Dues</option>
                </select>
              </label>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {selectedPaymentMember ? (
                <span>
                  Selected member: <span className="font-semibold text-slate-900">{selectedPaymentMember.memberLabel}</span> |{' '}
                  Total invoices: {selectedPaymentMember.invoiceCount} | Outstanding invoices:{' '}
                  {selectedPaymentMember.outstandingInvoiceCount} | Outstanding amount:{' '}
                  {selectedPaymentMember.totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              ) : (
                <span>Select a member above to load dues invoice groups.</span>
              )}
            </div>

            <label className="text-sm text-slate-600">
              Dues invoice group
              <select
                className="field-input"
                value={paymentState.invoiceId}
                onChange={(event) => handleInvoiceChange(event.target.value)}
                disabled={!paymentState.memberId}
                required
              >
                <option value="">{paymentState.memberId ? 'Select dues invoice group' : 'Select member first'}</option>
                {selectedMemberDuesBuckets.map((bucket) => (
                  <option key={bucket.anchorInvoiceId} value={bucket.anchorInvoiceId}>
                    {bucket.schemeTitle} - {bucket.invoiceCount} invoice(s), outstanding{' '}
                    {bucket.totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })} {bucket.currency}
                  </option>
                ))}
              </select>
            </label>
            {paymentState.memberId && selectedMemberDuesBuckets.length === 0 && (
              <p className="text-xs text-slate-500">The selected member has no outstanding dues invoices.</p>
            )}
            {paymentAllocationPreview && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">Allocation preview</p>
                <p>
                  Current outstanding: {paymentAllocationPreview.totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                  | This posting applies: {paymentAllocationPreview.applied.toLocaleString(undefined, { maximumFractionDigits: 2 })} across{' '}
                  {paymentAllocationPreview.coveredInvoices} invoice(s).
                </p>
                <p>
                  Remaining outstanding after posting:{' '}
                  {paymentAllocationPreview.remainingOutstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  {paymentAllocationPreview.unapplied > 0
                    ? ` | Unapplied credit: ${paymentAllocationPreview.unapplied.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    : ''}
                </p>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Dues payments auto-allocate from the oldest outstanding invoices in the selected dues group. Partial postings
              keep the remaining balance outstanding.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm text-slate-600">
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="field-input"
                  value={paymentState.amount}
                  onChange={(event) => setPaymentState((prev) => ({ ...prev, amount: event.target.value }))}
                  required
                />
              </label>
              <label className="text-sm text-slate-600">
                Channel
                <select
                  className="field-input"
                  value={paymentState.channel}
                  onChange={(event) => setPaymentState((prev) => ({ ...prev, channel: event.target.value }))}
                >
                  <option value="manual">Manual</option>
                  <option value="transfer">Bank Transfer</option>
                  <option value="pos">POS</option>
                  <option value="cash">Cash</option>
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Posting date/time
                <input
                  type="datetime-local"
                  className="field-input"
                  value={paymentState.paidAt}
                  onChange={(event) => setPaymentState((prev) => ({ ...prev, paidAt: event.target.value }))}
                />
              </label>
            </div>

            <label className="text-sm text-slate-600">
              Reference (optional)
              <input
                className="field-input"
                value={paymentState.reference}
                onChange={(event) => setPaymentState((prev) => ({ ...prev, reference: event.target.value }))}
              />
            </label>

            <label className="text-sm text-slate-600">
              Notes
              <textarea
                className="field-input"
                rows={3}
                value={paymentState.notes}
                onChange={(event) => setPaymentState((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>

            <button
              type="submit"
              className="btn-primary disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Record payment'}
            </button>
          </form>
        )}
      </section>
      <PaymentTable payments={summary.payments} authToken={authToken} />
      </>
      )}
    </div>
  );
}

function invoiceOutstandingBalance(invoice: DuesInvoiceDTO) {
  const paidAmount = Number(invoice.paidAmount ?? 0);
  const amount = Number(invoice.amount ?? 0);
  const directBalance = Number(invoice.balance ?? NaN);
  if (Number.isFinite(directBalance)) {
    return Number(Math.max(directBalance, 0).toFixed(2));
  }
  return Number(Math.max(amount - paidAmount, 0).toFixed(2));
}

function formatMemberIdentity(name?: string, alumniNumber?: string | null, fallbackId?: string) {
  if (alumniNumber && alumniNumber.trim()) {
    return alumniNumber.trim();
  }
  if (name && name.trim()) {
    return name.trim();
  }
  return fallbackId ?? 'Member';
}

function InvoiceTable({ invoices }: { invoices: DuesInvoiceDTO[] }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'part_paid' | 'paid'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (statusFilter !== 'all' && invoice.status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return (
        (invoice.userName ?? '').toLowerCase().includes(normalizedQuery) ||
        (invoice.userAlumniNumber ?? '').toLowerCase().includes(normalizedQuery) ||
        invoice.userId.toLowerCase().includes(normalizedQuery) ||
        (invoice.scheme?.title ?? 'dues').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [invoices, query, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pagedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [currentPage, filteredInvoices, pageSize]);

  return (
    <section className="surface-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
        <span className="text-sm text-slate-500">{filteredInvoices.length} record(s)</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs text-slate-500">
          Search invoices
          <input
            className="field-input text-sm"
            placeholder="Search member or scheme"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="text-xs text-slate-500">
          Status
          <select
            className="field-input text-sm"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as 'all' | 'unpaid' | 'part_paid' | 'paid');
              setPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="part_paid">Part paid</option>
            <option value="paid">Paid</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table className="table-base">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Member</th>
              <th className="py-2">Scheme</th>
              <th className="py-2">Status</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Paid</th>
              <th className="py-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            {pagedInvoices.length === 0 && (
              <tr>
                <td colSpan={6} className="py-3 text-sm text-slate-500">
                  No invoices found for the selected filters.
                </td>
              </tr>
            )}
            {pagedInvoices.map((invoice) => (
              <tr key={invoice.id} className="table-row">
                <td className="py-2">
                  <div className="font-medium text-slate-900">
                    {formatMemberIdentity(invoice.userName, invoice.userAlumniNumber, invoice.userId)}
                  </div>
                  <div className="text-xs text-slate-500">{invoice.periodStart ? new Date(invoice.periodStart).toLocaleDateString() : '-'}</div>
                </td>
                <td className="py-2">{invoice.scheme?.title ?? 'Dues'}</td>
                <td className="py-2 text-xs uppercase text-slate-500">{invoice.status}</td>
                <td className="py-2">{invoice.amount.toLocaleString()}</td>
                <td className="py-2">{(invoice.paidAmount ?? 0).toLocaleString()}</td>
                <td className="py-2">{(invoice.balance ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationControls
        page={currentPage}
        pageSize={pageSize}
        total={filteredInvoices.length}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
      />
    </section>
  );
}

function PaymentTable({ payments, authToken }: { payments: PaymentDTO[]; authToken: string }) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'manual' | 'transfer' | 'pos' | 'cash'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filteredPayments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
      return payments.filter((payment) => {
      if (channelFilter !== 'all' && payment.channel !== channelFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
        return (
          (payment.payerName ?? '').toLowerCase().includes(normalizedQuery) ||
          (payment.payerAlumniNumber ?? '').toLowerCase().includes(normalizedQuery) ||
          payment.payerUserId.toLowerCase().includes(normalizedQuery) ||
          (payment.reference ?? '').toLowerCase().includes(normalizedQuery) ||
          payment.channel.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [channelFilter, payments, query]);
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const pagedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [currentPage, filteredPayments, pageSize]);

  async function handleDownload(paymentId: string) {
    setDownloading(paymentId);
    setDownloadError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/finance/payments/${paymentId}/receipt/download`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? 'attachment; filename="receipt.txt"';
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : 'receipt.txt';
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Failed to download receipt.');
    } finally {
      setDownloading(null);
    }
  }

  if (payments.length === 0) {
    return (
      <section className="surface-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Payments</h2>
        <p className="text-sm text-slate-500">No payments recorded yet.</p>
      </section>
    );
  }

  return (
    <section className="surface-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Recent payments</h2>
        <span className="text-sm text-slate-500">{filteredPayments.length} record(s)</span>
      </div>
      {downloadError && <p className="mt-2 text-sm text-rose-600">{downloadError}</p>}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs text-slate-500">
          Search payments
          <input
            className="field-input text-sm"
            placeholder="Search member, channel, or reference"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="text-xs text-slate-500">
          Channel
          <select
            className="field-input text-sm"
            value={channelFilter}
            onChange={(event) =>
              {
                setChannelFilter(event.target.value as 'all' | 'manual' | 'transfer' | 'pos' | 'cash');
                setPage(1);
              }
            }
          >
            <option value="all">All</option>
            <option value="manual">Manual</option>
            <option value="transfer">Transfer</option>
            <option value="pos">POS</option>
            <option value="cash">Cash</option>
          </select>
        </label>
      </div>
      {filteredPayments.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No payments found for the selected filters.</p>
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Member</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Applied</th>
                <th className="py-2">Unapplied</th>
                <th className="py-2">Channel</th>
                <th className="py-2">Reference</th>
                <th className="py-2">Date</th>
                <th className="py-2">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {pagedPayments.map((payment) => {
                const applied = payment.applications.reduce((sum, application) => sum + application.amount, 0);
                const unapplied = Math.max(payment.amount - applied, 0);

                return (
                  <tr key={payment.id} className="table-row">
                    <td className="py-2">
                      {formatMemberIdentity(payment.payerName, payment.payerAlumniNumber, payment.payerUserId)}
                    </td>
                    <td className="py-2">{payment.amount.toLocaleString()} {payment.currency}</td>
                    <td className="py-2">{applied.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className={`py-2 ${unapplied > 0.01 ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
                      {unapplied.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-xs uppercase text-slate-500">{payment.channel}</td>
                    <td className="py-2 text-xs text-slate-500">{payment.reference ?? '-'}</td>
                    <td className="py-2 text-xs text-slate-500">{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '-'}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="btn-pill disabled:opacity-50"
                        onClick={() => handleDownload(payment.id)}
                        disabled={downloading === payment.id}
                      >
                        {downloading === payment.id ? 'Preparing...' : 'Download'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <PaginationControls
        page={currentPage}
        pageSize={pageSize}
        total={filteredPayments.length}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
      />
    </section>
  );
}




