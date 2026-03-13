'use client';

import type {
  BranchDTO,
  ClassSetDTO,
  UserDTO,
  WelfareCaseDTO,
  WelfareCaseDetailDTO,
  WelfareCategoryDTO,
  WelfareOutstandingInvoiceDTO,
  WelfareQueueItemDTO,
} from '@gcuoba/types';
import { fetchJson } from '@/lib/api';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { buildScopeParams } from '@/lib/scope-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type WelfarePanelProps = {
  cases: WelfareCaseDTO[];
  initialCase: WelfareCaseDetailDTO | null;
  authToken: string;
  activeScopeType?: 'global' | 'branch' | 'class';
  activeScopeId?: string | null;
};

type CaseState = {
  data: WelfareCaseDetailDTO | null;
  loading: boolean;
  error: string | null;
};

type ContributionFormState = {
  contributorUserId: string;
  contributorQuery: string;
  amount: string;
  notes: string;
  paidAt: string;
};

type PayoutFormState = {
  amount: string;
  channel: string;
  reference: string;
  notes: string;
  disbursedAt: string;
  retainerMode: 'none' | 'percentage' | 'fixed';
  retainerPercentage: string;
  retainerAmount: string;
};

type PayoutDeductionFormState = {
  id: string;
  type: 'dues_invoice' | 'liability' | 'custom';
  label: string;
  amount: string;
  invoiceId: string;
};

type DuesDeductionGroup = {
  key: string;
  label: string;
  currency: string;
  amount: number;
  outstanding: number;
  invoiceIds: string[];
  count: number;
};

type CreateCaseFormState = {
  title: string;
  description: string;
  categoryId: string;
  scopeType: 'global' | 'branch' | 'class';
  scopeId: string;
  targetAmount: string;
  currency: string;
  beneficiaryType: 'member' | 'external';
  beneficiaryUserId: string;
  beneficiaryQuery: string;
  externalBeneficiaryName: string;
  externalBeneficiaryDetails: string;
  attendanceRequired: boolean;
  attendanceEventTitle: string;
  attendanceEventDescription: string;
  attendanceEventStartAt: string;
  attendanceEventEndAt: string;
  attendanceEventLocation: string;
};

type EditCaseFormState = {
  title: string;
  description: string;
  categoryId: string;
  targetAmount: string;
  currency: string;
  beneficiaryType: 'member' | 'external';
  beneficiaryUserId: string;
  beneficiaryQuery: string;
  externalBeneficiaryName: string;
  externalBeneficiaryDetails: string;
  attendanceRequired: boolean;
  attendanceEventTitle: string;
  attendanceEventDescription: string;
  attendanceEventStartAt: string;
  attendanceEventEndAt: string;
  attendanceEventLocation: string;
};

type CaseStatus = 'open' | 'closed';
type WelfareTab = 'create' | 'manage';
type WelfareCaseTimelineTab = 'current' | 'past';
type WelfareCaseDetailTab = 'contributors' | 'post' | 'payout';

function nowLocalDateTimeValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function normalizeDuesTypeLabel(title: string) {
  const cleaned = title
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[-:|/]\s*$/, '')
    .trim();
  return cleaned || title;
}

function isoToLocalDateTimeValue(value?: string | null) {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function memberSearchLabel(member: UserDTO) {
  return `${member.name} (${member.email})${member.alumniNumber ? ` - ${member.alumniNumber}` : ''}`;
}

export function WelfarePanel({
  cases,
  initialCase,
  authToken,
  activeScopeType,
  activeScopeId,
}: WelfarePanelProps) {
  const router = useRouter();
  const [selectedCaseId, setSelectedCaseId] = useState(initialCase?.id ?? cases[0]?.id ?? '');
  const [caseState, setCaseState] = useState<CaseState>({
    data: initialCase,
    loading: false,
    error: null,
  });
  const hasSkippedInitialCaseFetch = useRef(false);
  const [contributionForm, setContributionForm] = useState<ContributionFormState>({
    contributorUserId: '',
    contributorQuery: '',
    amount: '',
    notes: '',
    paidAt: nowLocalDateTimeValue(),
  });
  const [payoutForm, setPayoutForm] = useState<PayoutFormState>({
    amount: '',
    channel: 'transfer',
    reference: '',
    notes: '',
    disbursedAt: nowLocalDateTimeValue(),
    retainerMode: 'none',
    retainerPercentage: '',
    retainerAmount: '',
  });
  const [payoutDeductions, setPayoutDeductions] = useState<PayoutDeductionFormState[]>([]);
  const [pendingDuesDeduction, setPendingDuesDeduction] = useState<{ groupKey: string; amount: string }>({
    groupKey: '',
    amount: '',
  });
  const [pendingLiabilityDeduction, setPendingLiabilityDeduction] = useState<{ label: string; amount: string }>({
    label: '',
    amount: '',
  });
  const [caseForm, setCaseForm] = useState<CreateCaseFormState>({
    title: '',
    description: '',
    categoryId: '',
    scopeType: 'global',
    scopeId: '',
    targetAmount: '',
    currency: 'NGN',
    beneficiaryType: 'member',
    beneficiaryUserId: '',
    beneficiaryQuery: '',
    externalBeneficiaryName: '',
    externalBeneficiaryDetails: '',
    attendanceRequired: false,
    attendanceEventTitle: '',
    attendanceEventDescription: '',
    attendanceEventStartAt: '',
    attendanceEventEndAt: '',
    attendanceEventLocation: '',
  });
  const [categories, setCategories] = useState<WelfareCategoryDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [classes, setClasses] = useState<ClassSetDTO[]>([]);
  const [members, setMembers] = useState<UserDTO[]>([]);
  const [queue, setQueue] = useState<WelfareQueueItemDTO[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueActionId, setQueueActionId] = useState<string | null>(null);
  const [queueQuery, setQueueQuery] = useState('');
  const [queueKindFilter, setQueueKindFilter] = useState<'all' | WelfareQueueItemDTO['kind']>('all');
  const [queuePage, setQueuePage] = useState(1);
  const [queuePageSize, setQueuePageSize] = useState(10);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [creatingCase, setCreatingCase] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editCaseForm, setEditCaseForm] = useState<EditCaseFormState | null>(null);
  const [savingCaseEdit, setSavingCaseEdit] = useState(false);
  const [caseStatusBusy, setCaseStatusBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<WelfareTab>('manage');
  const [caseTimelineTab, setCaseTimelineTab] = useState<WelfareCaseTimelineTab>('current');
  const [caseDetailTab, setCaseDetailTab] = useState<WelfareCaseDetailTab>('contributors');
  const isScopeLocked = Boolean(activeScopeType);
  const effectiveScopeType = activeScopeType ?? caseForm.scopeType;
  const effectiveScopeId =
    effectiveScopeType === 'global' ? '' : activeScopeId ?? caseForm.scopeId;

  useEffect(() => {
    const setupCategoryParams = new URLSearchParams();
    setupCategoryParams.set('scopeType', activeScopeType ?? 'global');
    if (activeScopeType && activeScopeType !== 'global' && activeScopeId) {
      setupCategoryParams.set('scopeId', activeScopeId);
    }
    const branchPath = (() => {
      if (activeScopeType === 'branch') {
        const params = buildScopeParams({ scopeType: 'branch', scopeId: activeScopeId ?? undefined });
        return `/branches?${params.toString()}`;
      }
      if (activeScopeType === 'class') {
        return '/branches?managedOnly=1';
      }
      if (activeScopeType === 'global') {
        return '/branches?scopeType=global';
      }
      return '/branches?managedOnly=1';
    })();
    const classesPath = (() => {
      if (activeScopeType === 'class') {
        const params = buildScopeParams({ scopeType: 'class', scopeId: activeScopeId ?? undefined });
        return `/classes?${params.toString()}`;
      }
      if (activeScopeType === 'branch') {
        return '/classes?managedOnly=1';
      }
      if (activeScopeType === 'global') {
        return '/classes?scopeType=global';
      }
      return '/classes?managedOnly=1';
    })();
    const userScopeParams = buildScopeParams({
      scopeType: activeScopeType,
      scopeId: activeScopeId ?? undefined,
    });
    const usersPath = userScopeParams.toString() ? `/users?${userScopeParams.toString()}` : '/users';

    Promise.all([
      fetchJson<BranchDTO[]>(branchPath, { token: authToken }),
      fetchJson<ClassSetDTO[]>(classesPath, { token: authToken }),
      fetchJson<UserDTO[]>(usersPath, { token: authToken }),
      fetchJson<WelfareCategoryDTO[]>(`/welfare/categories?${setupCategoryParams.toString()}`, {
        token: authToken,
      }),
    ])
      .then(([branchesData, classesData, membersData, categoriesData]) => {
        const activeMembers = membersData.filter((member) => member.status === 'active');
        setBranches(branchesData);
        setClasses(classesData);
        setMembers(activeMembers);
        setCategories(categoriesData);
        setCaseForm((prev) => {
          const next = {
            ...prev,
            categoryId: prev.categoryId || categoriesData[0]?.id || '',
          };
          if (prev.beneficiaryType !== 'member') {
            return next;
          }
          if (!prev.beneficiaryUserId) {
            const defaultMember = activeMembers[0];
            next.beneficiaryUserId = defaultMember?.id || '';
            next.beneficiaryQuery = defaultMember ? memberSearchLabel(defaultMember) : '';
            return next;
          }
          if (!prev.beneficiaryQuery) {
            const selectedMember = activeMembers.find((member) => member.id === prev.beneficiaryUserId);
            if (selectedMember) {
              next.beneficiaryQuery = memberSearchLabel(selectedMember);
            }
          }
          return next;
        });
      })
      .catch((error) => {
        setSubmissionError(error instanceof Error ? error.message : 'Failed to load welfare setup data.');
      });
  }, [activeScopeId, activeScopeType, authToken]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('scopeType', effectiveScopeType);
    if (effectiveScopeType !== 'global' && effectiveScopeId) {
      params.set('scopeId', effectiveScopeId);
    }

    fetchJson<WelfareCategoryDTO[]>(`/welfare/categories?${params.toString()}`, {
      token: authToken,
    })
      .then((items) => {
        setCategories(items);
        setCaseForm((prev) => ({
          ...prev,
          categoryId: items.some((item) => item.id === prev.categoryId) ? prev.categoryId : items[0]?.id ?? '',
        }));
      })
      .catch((error) => {
        setSubmissionError(error instanceof Error ? error.message : 'Failed to load categories.');
      });
  }, [authToken, effectiveScopeId, effectiveScopeType]);

  useEffect(() => {
    if (!activeScopeType) {
      return;
    }
    setCaseForm((prev) => ({
      ...prev,
      scopeType: activeScopeType,
      scopeId: activeScopeType === 'global' ? '' : activeScopeId ?? prev.scopeId,
    }));
  }, [activeScopeId, activeScopeType]);

  useEffect(() => {
    void loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScopeId, activeScopeType, authToken]);

  useEffect(() => {
    if (!selectedCaseId) {
      setCaseState({ data: null, loading: false, error: null });
      return;
    }

    if (
      initialCase &&
      !hasSkippedInitialCaseFetch.current &&
      initialCase.id === selectedCaseId
    ) {
      hasSkippedInitialCaseFetch.current = true;
      setCaseState({ data: initialCase, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setCaseState((prev) => ({ ...prev, loading: true, error: null }));
    fetchJson<WelfareCaseDetailDTO>(`/welfare/cases/${selectedCaseId}`, { token: authToken })
      .then((detail) => {
        if (!cancelled) {
          setCaseState({ data: detail, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setCaseState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load case.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCaseId, authToken, initialCase]);

  const branchNameById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  );
  const classLabelById = useMemo(
    () => new Map(classes.map((classSet) => [classSet.id, classSet.label])),
    [classes],
  );
  const currentCases = useMemo(
    () => cases.filter((entry) => entry.status === 'open'),
    [cases],
  );
  const pastCases = useMemo(
    () => cases.filter((entry) => entry.status === 'closed'),
    [cases],
  );
  const filteredCases = useMemo(
    () => (caseTimelineTab === 'current' ? currentCases : pastCases),
    [caseTimelineTab, currentCases, pastCases],
  );
  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) ?? null,
    [cases, selectedCaseId],
  );
  const caseForStats = caseState.data ?? selectedCase;
  const beneficiaryOutstandingInvoices = useMemo<WelfareOutstandingInvoiceDTO[]>(
    () => caseState.data?.beneficiaryOutstandingInvoices ?? [],
    [caseState.data?.beneficiaryOutstandingInvoices],
  );
  const duesInvoiceAllocationById = useMemo(() => {
    const allocated = new Map<string, number>();
    payoutDeductions
      .filter((row) => row.type === 'dues_invoice' && row.invoiceId)
      .forEach((row) => {
        const amount = Number(row.amount || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
          return;
        }
        allocated.set(row.invoiceId, Number(((allocated.get(row.invoiceId) ?? 0) + amount).toFixed(2)));
      });
    return allocated;
  }, [payoutDeductions]);
  const duesDeductionGroups = useMemo<DuesDeductionGroup[]>(() => {
    const grouped = new Map<string, DuesDeductionGroup>();
    beneficiaryOutstandingInvoices.forEach((invoice) => {
      const baseType = normalizeDuesTypeLabel(invoice.title || 'Dues invoice');
      const amount = Number(invoice.amount ?? 0);
      const allocated = duesInvoiceAllocationById.get(invoice.id) ?? 0;
      const availableBalance = Number(Math.max(Number(invoice.balance ?? 0) - allocated, 0).toFixed(2));
      if (availableBalance <= 0) {
        return;
      }
      const key = `${baseType.toLowerCase()}::${invoice.currency}::${amount.toFixed(2)}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.outstanding = Number((existing.outstanding + availableBalance).toFixed(2));
        existing.invoiceIds.push(invoice.id);
        existing.count += 1;
        return;
      }
      grouped.set(key, {
        key,
        label: `${baseType} (${amount.toLocaleString()} ${invoice.currency})`,
        currency: invoice.currency,
        amount,
        outstanding: availableBalance,
        invoiceIds: [invoice.id],
        count: 1,
      });
    });
    return Array.from(grouped.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [beneficiaryOutstandingInvoices, duesInvoiceAllocationById]);

  useEffect(() => {
    if (filteredCases.length === 0) {
      if (selectedCaseId) {
        setSelectedCaseId('');
      }
      return;
    }
    const isSelectedVisible = filteredCases.some((entry) => entry.id === selectedCaseId);
    if (!isSelectedVisible) {
      setSelectedCaseId(filteredCases[0].id);
      setCaseState((prev) => ({ ...prev, error: null }));
      setCaseDetailTab('contributors');
    }
  }, [filteredCases, selectedCaseId]);
  const contributorOptions = useMemo(
    () =>
      members.map((member) => ({
        id: member.id,
        name: member.name,
        label: memberSearchLabel(member),
      })),
    [members],
  );
  const beneficiaryOptions = useMemo(
    () =>
      members.map((member) => ({
        id: member.id,
        label: memberSearchLabel(member),
      })),
    [members],
  );
  const selectedBeneficiaryLabel = useMemo(() => {
    if (caseForm.beneficiaryType === 'external') {
      return caseForm.externalBeneficiaryName.trim() || 'External beneficiary not set';
    }
    if (!caseForm.beneficiaryUserId) {
      return 'None selected';
    }
    return (
      beneficiaryOptions.find((member) => member.id === caseForm.beneficiaryUserId)?.label ??
      'None selected'
    );
  }, [
    beneficiaryOptions,
    caseForm.beneficiaryType,
    caseForm.beneficiaryUserId,
    caseForm.externalBeneficiaryName,
  ]);
  const selectedEditBeneficiaryLabel = useMemo(() => {
    if (editCaseForm?.beneficiaryType === 'external') {
      return editCaseForm.externalBeneficiaryName.trim() || 'External beneficiary not set';
    }
    if (!editCaseForm?.beneficiaryUserId) {
      return 'None selected';
    }
    return (
      beneficiaryOptions.find((member) => member.id === editCaseForm.beneficiaryUserId)?.label ??
      'None selected'
    );
  }, [
    beneficiaryOptions,
    editCaseForm?.beneficiaryType,
    editCaseForm?.beneficiaryUserId,
    editCaseForm?.externalBeneficiaryName,
  ]);
  const selectedContributorLabel = useMemo(() => {
    if (!contributionForm.contributorUserId) {
      return 'None selected';
    }
    return (
      contributorOptions.find((member) => member.id === contributionForm.contributorUserId)?.label ??
      'None selected'
    );
  }, [contributionForm.contributorUserId, contributorOptions]);

  const scopeOptions = useMemo(() => {
    if (effectiveScopeType === 'branch') {
      if (activeScopeType === 'branch' && activeScopeId) {
        return branches.filter((item) => item.id === activeScopeId);
      }
      return branches;
    }
    if (activeScopeType === 'class' && activeScopeId) {
      return classes.filter((item) => item.id === activeScopeId);
    }
    return classes;
  }, [activeScopeId, activeScopeType, branches, classes, effectiveScopeType]);

  const payoutAmountRaw = Number(payoutForm.amount || 0);
  const payoutAmountNumber = Number.isFinite(payoutAmountRaw) ? payoutAmountRaw : 0;
  const retainerPercentRaw = Number(payoutForm.retainerPercentage || 0);
  const retainerPercent = Number.isFinite(retainerPercentRaw) ? retainerPercentRaw : 0;
  const retainerFixedRaw = Number(payoutForm.retainerAmount || 0);
  const retainerFixed = Number.isFinite(retainerFixedRaw) ? retainerFixedRaw : 0;
  const retainerDeductionAmount =
    payoutForm.retainerMode === 'percentage'
      ? Number(((payoutAmountNumber * retainerPercent) / 100).toFixed(2))
      : payoutForm.retainerMode === 'fixed'
        ? Number(retainerFixed.toFixed(2))
        : 0;
  const customDeductionsTotal = Number(
    payoutDeductions.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2),
  );
  const payoutTotalDeductions = Number((retainerDeductionAmount + customDeductionsTotal).toFixed(2));
  const payoutNetPreview = Number((Math.max(payoutAmountNumber - payoutTotalDeductions, 0)).toFixed(2));
  const filteredQueue = useMemo(() => {
    const query = queueQuery.trim().toLowerCase();
    return queue.filter((item) => {
      if (queueKindFilter !== 'all' && item.kind !== queueKindFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = `${item.kind} ${item.caseTitle} ${item.submittedBy ?? ''} ${item.currency}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [queue, queueKindFilter, queueQuery]);
  const queueTotalPages = Math.max(1, Math.ceil(filteredQueue.length / queuePageSize));
  const queueCurrentPage = Math.min(queuePage, queueTotalPages);
  const pagedQueue = useMemo(() => {
    const start = (queueCurrentPage - 1) * queuePageSize;
    return filteredQueue.slice(start, start + queuePageSize);
  }, [filteredQueue, queueCurrentPage, queuePageSize]);

  function resolveCaseScopeLabel(caseItem: WelfareCaseDTO) {
    if (caseItem.scopeType === 'branch') {
      return caseItem.scopeId ? branchNameById.get(caseItem.scopeId) ?? 'Branch scope' : 'Branch scope';
    }
    if (caseItem.scopeType === 'class') {
      return caseItem.scopeId ? classLabelById.get(caseItem.scopeId) ?? 'Class scope' : 'Class scope';
    }
    return 'Global scope';
  }

  async function loadQueue() {
    setQueueLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', 'pending');
      if (activeScopeType) {
        params.set('scopeType', activeScopeType);
      }
      if (activeScopeType && activeScopeType !== 'global' && activeScopeId) {
        params.set('scopeId', activeScopeId);
      }
      const pending = await fetchJson<WelfareQueueItemDTO[]>(`/welfare/queue?${params.toString()}`, {
        token: authToken,
      });
      setQueue(pending);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to load workflow queue.');
    } finally {
      setQueueLoading(false);
    }
  }

  async function handleCreateCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingCase(true);
    setSubmissionError(null);
    setSubmissionStatus(null);
    if (caseForm.beneficiaryType === 'member' && !caseForm.beneficiaryUserId) {
      setCreatingCase(false);
      setSubmissionError('Select a beneficiary member from the search suggestions.');
      return;
    }
    if (caseForm.beneficiaryType === 'external' && !caseForm.externalBeneficiaryName.trim()) {
      setCreatingCase(false);
      setSubmissionError('Enter the external beneficiary name.');
      return;
    }

    try {
      await fetchJson<WelfareCaseDTO>('/welfare/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: caseForm.title,
          description: caseForm.description,
          categoryId: caseForm.categoryId,
          scopeType: effectiveScopeType,
          scopeId: effectiveScopeType === 'global' ? undefined : effectiveScopeId,
          targetAmount: Number(caseForm.targetAmount || 0),
          currency: caseForm.currency,
          beneficiaryType: caseForm.beneficiaryType,
          beneficiaryUserId: caseForm.beneficiaryType === 'member' ? caseForm.beneficiaryUserId || undefined : undefined,
          beneficiaryName: caseForm.beneficiaryType === 'external' ? caseForm.externalBeneficiaryName || undefined : undefined,
          beneficiaryExternalDetails:
            caseForm.beneficiaryType === 'external' ? caseForm.externalBeneficiaryDetails || undefined : undefined,
          attendanceRequired: caseForm.attendanceRequired,
          attendanceEventTitle: caseForm.attendanceRequired ? caseForm.attendanceEventTitle || undefined : undefined,
          attendanceEventDescription: caseForm.attendanceRequired
            ? caseForm.attendanceEventDescription || undefined
            : undefined,
          attendanceEventStartAt: caseForm.attendanceRequired
            ? caseForm.attendanceEventStartAt || undefined
            : undefined,
          attendanceEventEndAt: caseForm.attendanceRequired ? caseForm.attendanceEventEndAt || undefined : undefined,
          attendanceEventLocation: caseForm.attendanceRequired
            ? caseForm.attendanceEventLocation || undefined
            : undefined,
        }),
        token: authToken,
      });

      setCaseForm({
        title: '',
        description: '',
        categoryId: categories[0]?.id ?? '',
        scopeType: activeScopeType ?? 'global',
        scopeId:
          activeScopeType === 'branch' || activeScopeType === 'class'
            ? activeScopeId ?? ''
            : '',
        targetAmount: '',
        currency: 'NGN',
        beneficiaryType: 'member',
        beneficiaryUserId: members[0]?.id ?? '',
        beneficiaryQuery: members[0] ? memberSearchLabel(members[0]) : '',
        externalBeneficiaryName: '',
        externalBeneficiaryDetails: '',
        attendanceRequired: false,
        attendanceEventTitle: '',
        attendanceEventDescription: '',
        attendanceEventStartAt: '',
        attendanceEventEndAt: '',
        attendanceEventLocation: '',
      });
      setActiveTab('manage');
      setSubmissionStatus('Welfare case created.');
      router.refresh();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to create welfare case.');
    } finally {
      setCreatingCase(false);
    }
  }

  function beginEditCase(caseItem: WelfareCaseDTO) {
    const beneficiary = members.find((member) => member.id === (caseItem.beneficiaryUserId ?? ''));
    const beneficiaryType = caseItem.beneficiaryType === 'external' ? 'external' : 'member';
    setEditingCaseId(caseItem.id);
    setEditCaseForm({
      title: caseItem.title,
      description: caseItem.description,
      categoryId: caseItem.categoryId ?? categories[0]?.id ?? '',
      targetAmount: String(caseItem.targetAmount ?? 0),
      currency: caseItem.currency ?? 'NGN',
      beneficiaryType,
      beneficiaryUserId: beneficiaryType === 'member' ? caseItem.beneficiaryUserId ?? '' : '',
      beneficiaryQuery: beneficiaryType === 'member' ? (beneficiary ? memberSearchLabel(beneficiary) : '') : '',
      externalBeneficiaryName: beneficiaryType === 'external' ? caseItem.beneficiaryName ?? '' : '',
      externalBeneficiaryDetails: caseItem.beneficiaryExternalDetails ?? '',
      attendanceRequired: Boolean(caseItem.attendanceRequired),
      attendanceEventTitle: caseItem.attendanceEventTitle ?? caseItem.title ?? '',
      attendanceEventDescription: '',
      attendanceEventStartAt: isoToLocalDateTimeValue(caseItem.attendanceEventStartAt),
      attendanceEventEndAt: '',
      attendanceEventLocation: caseItem.attendanceEventLocation ?? '',
    });
    setSubmissionError(null);
    setSubmissionStatus(null);
  }

  function cancelEditCase() {
    setEditingCaseId(null);
    setEditCaseForm(null);
  }

  async function handleEditCaseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCaseId || !editCaseForm) {
      return;
    }
    if (editCaseForm.beneficiaryType === 'member' && !editCaseForm.beneficiaryUserId) {
      setSubmissionError('Select a beneficiary member from the search suggestions.');
      return;
    }
    if (editCaseForm.beneficiaryType === 'external' && !editCaseForm.externalBeneficiaryName.trim()) {
      setSubmissionError('Enter the external beneficiary name.');
      return;
    }

    const proceed = window.confirm('Save these welfare updates?');
    if (!proceed) {
      return;
    }

    setSavingCaseEdit(true);
    setSubmissionError(null);
    setSubmissionStatus(null);
    try {
      await fetchJson<WelfareCaseDTO>(`/welfare/cases/${editingCaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editCaseForm.title,
          description: editCaseForm.description,
          categoryId: editCaseForm.categoryId,
          targetAmount: Number(editCaseForm.targetAmount || 0),
          currency: editCaseForm.currency,
          beneficiaryType: editCaseForm.beneficiaryType,
          beneficiaryUserId:
            editCaseForm.beneficiaryType === 'member' ? editCaseForm.beneficiaryUserId : undefined,
          beneficiaryName:
            editCaseForm.beneficiaryType === 'external'
              ? editCaseForm.externalBeneficiaryName
              : undefined,
          beneficiaryExternalDetails:
            editCaseForm.beneficiaryType === 'external'
              ? editCaseForm.externalBeneficiaryDetails || undefined
              : undefined,
          attendanceRequired: editCaseForm.attendanceRequired,
          attendanceEventTitle: editCaseForm.attendanceRequired
            ? editCaseForm.attendanceEventTitle || undefined
            : undefined,
          attendanceEventDescription: editCaseForm.attendanceRequired
            ? editCaseForm.attendanceEventDescription || undefined
            : undefined,
          attendanceEventStartAt: editCaseForm.attendanceRequired
            ? editCaseForm.attendanceEventStartAt || undefined
            : undefined,
          attendanceEventEndAt: editCaseForm.attendanceRequired
            ? editCaseForm.attendanceEventEndAt || undefined
            : undefined,
          attendanceEventLocation: editCaseForm.attendanceRequired
            ? editCaseForm.attendanceEventLocation || undefined
            : undefined,
        }),
        token: authToken,
      });

      setSubmissionStatus('Welfare case updated.');
      await refreshCase(editingCaseId);
      cancelEditCase();
      router.refresh();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to update welfare case.');
    } finally {
      setSavingCaseEdit(false);
    }
  }

  async function handleCaseStatusChange(status: CaseStatus) {
    if (!selectedCaseId) {
      return;
    }
    const isClosing = status === 'closed';
    const proceed = window.confirm(
      isClosing ? 'Are you sure you want to close this welfare case?' : 'Are you sure you want to re-open this welfare case?',
    );
    if (!proceed) {
      return;
    }
    setCaseStatusBusy(true);
    setSubmissionError(null);
    setSubmissionStatus(null);
    try {
      await fetchJson<WelfareCaseDTO>(`/welfare/cases/${selectedCaseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        token: authToken,
      });
      setSubmissionStatus(`Case marked ${status}.`);
      await refreshCase(selectedCaseId);
      router.refresh();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to update case status.');
    } finally {
      setCaseStatusBusy(false);
    }
  }

  async function handleContributionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCaseId) {
      return;
    }
    const selectedContributor = contributorOptions.find(
      (member) => member.id === contributionForm.contributorUserId,
    );
    if (!selectedContributor) {
      setSubmissionError('Select a contributor from members.');
      return;
    }
    setSubmissionStatus(null);
    setSubmissionError(null);
    try {
      await fetchJson(`/welfare/cases/${selectedCaseId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributorUserId: selectedContributor.id,
          contributorName: selectedContributor.name,
          amount: Number(contributionForm.amount),
          notes: contributionForm.notes || undefined,
          paidAt: contributionForm.paidAt || undefined,
        }),
        token: authToken,
      });
      setContributionForm({
        contributorUserId: '',
        contributorQuery: '',
        amount: '',
        notes: '',
        paidAt: nowLocalDateTimeValue(),
      });
      setSubmissionStatus('Contribution submitted for approval.');
      await refreshCase(selectedCaseId);
      await loadQueue();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to record contribution.');
    }
  }

  function addDuesDeduction() {
    const groupKey = pendingDuesDeduction.groupKey;
    const amountNumber = Number(pendingDuesDeduction.amount);
    const group = duesDeductionGroups.find((row) => row.key === groupKey);
    if (!groupKey || !group) {
      setSubmissionError('Select a beneficiary outstanding dues type/group to deduct.');
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setSubmissionError('Enter a valid dues deduction amount.');
      return;
    }
    if (amountNumber > group.outstanding + 0.01) {
      setSubmissionError('Dues deduction cannot be greater than group outstanding balance.');
      return;
    }

    const groupInvoices = beneficiaryOutstandingInvoices
      .filter((invoice) => group.invoiceIds.includes(invoice.id))
      .sort((a, b) => {
        const aDate = a.periodStart ? new Date(a.periodStart).getTime() : 0;
        const bDate = b.periodStart ? new Date(b.periodStart).getTime() : 0;
        return aDate - bDate;
      });

    let remaining = Number(amountNumber.toFixed(2));
    const allocations: Array<{ invoice: WelfareOutstandingInvoiceDTO; amount: number }> = [];
    for (const invoice of groupInvoices) {
      if (remaining <= 0) {
        break;
      }
      const allocated = duesInvoiceAllocationById.get(invoice.id) ?? 0;
      const available = Number(Math.max(Number(invoice.balance ?? 0) - allocated, 0).toFixed(2));
      if (available <= 0) {
        continue;
      }
      const applied = Number(Math.min(available, remaining).toFixed(2));
      if (applied <= 0) {
        continue;
      }
      allocations.push({ invoice, amount: applied });
      remaining = Number((remaining - applied).toFixed(2));
    }

    if (allocations.length === 0 || remaining > 0.01) {
      setSubmissionError('Unable to allocate deduction across selected dues invoices.');
      return;
    }

    setPayoutDeductions((prev) => {
      const next = [...prev];
      allocations.forEach(({ invoice, amount }) => {
        const existingIndex = next.findIndex(
          (row) => row.type === 'dues_invoice' && row.invoiceId === invoice.id,
        );
        if (existingIndex >= 0) {
          const mergedAmount = Number((Number(next[existingIndex].amount || 0) + amount).toFixed(2));
          next[existingIndex] = {
            ...next[existingIndex],
            amount: mergedAmount.toFixed(2),
          };
          return;
        }
        next.push({
          id: crypto.randomUUID(),
          type: 'dues_invoice',
          label: `Dues: ${invoice.title}`,
          amount: amount.toFixed(2),
          invoiceId: invoice.id,
        });
      });
      return next;
    });
    setPendingDuesDeduction({ groupKey: '', amount: '' });
    setSubmissionError(null);
  }

  function addLiabilityDeduction() {
    const label = pendingLiabilityDeduction.label.trim();
    const amountNumber = Number(pendingLiabilityDeduction.amount);
    if (!label) {
      setSubmissionError('Provide a liability/deduction label.');
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setSubmissionError('Enter a valid liability deduction amount.');
      return;
    }
    setPayoutDeductions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'liability',
        label,
        amount: amountNumber.toFixed(2),
        invoiceId: '',
      },
    ]);
    setPendingLiabilityDeduction({ label: '', amount: '' });
    setSubmissionError(null);
  }

  function removePayoutDeduction(deductionId: string) {
    setPayoutDeductions((prev) => prev.filter((row) => row.id !== deductionId));
  }

  async function handlePayoutSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCaseId) {
      return;
    }
    if (payoutNetPreview <= 0) {
      setSubmissionError('Net payout must be greater than zero after deductions.');
      return;
    }
    setSubmissionStatus(null);
    setSubmissionError(null);
    try {
      await fetchJson(`/welfare/cases/${selectedCaseId}/payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payoutForm.amount),
          channel: payoutForm.channel,
          reference: payoutForm.reference || undefined,
          notes: payoutForm.notes || undefined,
          disbursedAt: payoutForm.disbursedAt || undefined,
          retainerMode: payoutForm.retainerMode,
          retainerPercentage:
            payoutForm.retainerMode === 'percentage' ? Number(payoutForm.retainerPercentage || 0) : undefined,
          retainerAmount:
            payoutForm.retainerMode === 'fixed' ? Number(payoutForm.retainerAmount || 0) : undefined,
          deductions: payoutDeductions.map((row) => ({
            type: row.type,
            label: row.label,
            amount: Number(row.amount),
            invoiceId: row.type === 'dues_invoice' ? row.invoiceId : undefined,
          })),
        }),
        token: authToken,
      });
      setPayoutForm({
        amount: '',
        channel: 'transfer',
        reference: '',
        notes: '',
        disbursedAt: nowLocalDateTimeValue(),
        retainerMode: 'none',
        retainerPercentage: '',
        retainerAmount: '',
      });
      setPayoutDeductions([]);
      setPendingDuesDeduction({ groupKey: '', amount: '' });
      setPendingLiabilityDeduction({ label: '', amount: '' });
      setSubmissionStatus('Payout submitted for approval.');
      await refreshCase(selectedCaseId);
      await loadQueue();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to record payout.');
    }
  }

  async function reviewQueueItem(item: WelfareQueueItemDTO, action: 'approve' | 'reject') {
    const proceed = window.confirm(
      action === 'approve'
        ? `Approve this ${item.kind} request?`
        : `Reject this ${item.kind} request?`,
    );
    if (!proceed) {
      return;
    }
    setQueueActionId(item.id);
    setSubmissionError(null);
    setSubmissionStatus(null);
    try {
      const note = action === 'reject' ? window.prompt('Enter rejection reason:') : window.prompt('Optional approval note:');
      if (action === 'reject' && !note?.trim()) {
        setSubmissionError('Rejection reason is required.');
        setQueueActionId(null);
        return;
      }

      const basePath = item.kind === 'contribution' ? '/welfare/contributions' : '/welfare/payouts';
      await fetchJson(`${basePath}/${item.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note || undefined }),
        token: authToken,
      });

      setSubmissionStatus(`${item.kind} ${action}d.`);
      await loadQueue();
      if (item.caseId === selectedCaseId) {
        await refreshCase(item.caseId);
      }
      router.refresh();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : `Failed to ${action} ${item.kind}.`);
    } finally {
      setQueueActionId(null);
    }
  }

  async function refreshCase(caseId: string) {
    setCaseState((prev) => ({ ...prev, loading: true }));
    const detail = await fetchJson<WelfareCaseDetailDTO>(`/welfare/cases/${caseId}`, { token: authToken });
    setCaseState({ data: detail, loading: false, error: null });
  }

  return (
    <section className="space-y-6">
      {(submissionStatus || submissionError) && (
        <div
          className={`status-banner text-sm ${
            submissionError
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {submissionError ?? submissionStatus}
        </div>
      )}

      <section className="rounded-xl border border-red-100 bg-red-50/70 p-2 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              activeTab === 'manage'
                ? 'border-red-300 bg-red-600 text-white shadow-sm'
                : 'border-red-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
            }`}
            onClick={() => setActiveTab('manage')}
          >
            Manage welfare
          </button>
          <button
            type="button"
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              activeTab === 'create'
                ? 'border-red-300 bg-red-600 text-white shadow-sm'
                : 'border-red-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
            }`}
            onClick={() => setActiveTab('create')}
          >
            Create welfare
          </button>
        </div>
      </section>

      {activeTab === 'create' && (
      <section className="surface-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create welfare case</h2>
        <form onSubmit={handleCreateCase} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            Title
            <input
              required
              className="field-input"
              value={caseForm.title}
              onChange={(event) =>
                setCaseForm((prev) => ({
                  ...prev,
                  title: event.target.value,
                  attendanceEventTitle:
                    prev.attendanceRequired &&
                    (prev.attendanceEventTitle.trim().length === 0 ||
                      prev.attendanceEventTitle.trim() === prev.title.trim())
                      ? event.target.value
                      : prev.attendanceEventTitle,
                }))
              }
            />
          </label>
          <label className="text-sm text-slate-600">
            Category
            <select
              required
              className="field-input"
              value={caseForm.categoryId}
              onChange={(event) => setCaseForm((prev) => ({ ...prev, categoryId: event.target.value }))}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">
            Description
            <textarea
              required
              rows={3}
              className="field-input"
              value={caseForm.description}
              onChange={(event) => setCaseForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Scope
            <select
              className="field-input"
              value={effectiveScopeType}
              disabled={isScopeLocked}
              onChange={(event) =>
                setCaseForm((prev) => ({
                  ...prev,
                  scopeType: event.target.value as CreateCaseFormState['scopeType'],
                  scopeId: '',
                }))
              }
            >
              <option value="global">Global</option>
              <option value="branch">Branch</option>
              <option value="class">Class</option>
            </select>
          </label>
          {effectiveScopeType !== 'global' && (
            <label className="text-sm text-slate-600">
              {effectiveScopeType === 'branch' ? 'Branch' : 'Class'}
              <select
                required
                className="field-input"
                value={effectiveScopeId}
                disabled={isScopeLocked}
                onChange={(event) => setCaseForm((prev) => ({ ...prev, scopeId: event.target.value }))}
              >
                <option value="">Select</option>
                {scopeOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {'entryYear' in item ? `${item.entryYear} - ${item.label}` : item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm text-slate-600">
            Target amount
            <input
              type="number"
              min="0"
              step="0.01"
              className="field-input"
              value={caseForm.targetAmount}
              onChange={(event) => setCaseForm((prev) => ({ ...prev, targetAmount: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Currency
            <input
              className="field-input uppercase"
              maxLength={3}
              value={caseForm.currency}
              onChange={(event) => setCaseForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
            />
          </label>
          <label className="text-sm text-slate-600">
            Beneficiary type
            <select
              className="field-input"
              value={caseForm.beneficiaryType}
              onChange={(event) =>
                setCaseForm((prev) => ({
                  ...prev,
                  beneficiaryType: event.target.value as 'member' | 'external',
                  beneficiaryUserId:
                    event.target.value === 'member'
                      ? prev.beneficiaryUserId || members[0]?.id || ''
                      : '',
                  beneficiaryQuery:
                    event.target.value === 'member'
                      ? prev.beneficiaryQuery || (members[0] ? memberSearchLabel(members[0]) : '')
                      : '',
                  externalBeneficiaryName: event.target.value === 'external' ? prev.externalBeneficiaryName : '',
                  externalBeneficiaryDetails: event.target.value === 'external' ? prev.externalBeneficiaryDetails : '',
                }))
              }
            >
              <option value="member">Member of association</option>
              <option value="external">External/non-member</option>
            </select>
          </label>
          {caseForm.beneficiaryType === 'member' ? (
            <>
              <label className="text-sm text-slate-600">
                Beneficiary member
                <input
                  required
                  list="welfare-beneficiary-members"
                  className="field-input"
                  placeholder="Search by name, email, or alumni number"
                  value={caseForm.beneficiaryQuery}
                  onChange={(event) => {
                    const selected = beneficiaryOptions.find((member) => member.label === event.target.value);
                    setCaseForm((prev) => ({
                      ...prev,
                      beneficiaryQuery: event.target.value,
                      beneficiaryUserId: selected?.id ?? '',
                    }));
                  }}
                />
                <datalist id="welfare-beneficiary-members">
                  {beneficiaryOptions.map((member) => (
                    <option key={member.id} value={member.label} />
                  ))}
                </datalist>
              </label>
              <label className="text-sm text-slate-600">
                Selected beneficiary
                <input className="field-input" disabled value={selectedBeneficiaryLabel} />
              </label>
            </>
          ) : (
            <>
              <label className="text-sm text-slate-600">
                External beneficiary name
                <input
                  required
                  className="field-input"
                  placeholder="e.g. Late Principal John Doe"
                  value={caseForm.externalBeneficiaryName}
                  onChange={(event) =>
                    setCaseForm((prev) => ({ ...prev, externalBeneficiaryName: event.target.value }))
                  }
                />
              </label>
              <label className="text-sm text-slate-600">
                External beneficiary details (optional)
                <input
                  className="field-input"
                  placeholder="Relationship, next-of-kin, or payout context"
                  value={caseForm.externalBeneficiaryDetails}
                  onChange={(event) =>
                    setCaseForm((prev) => ({ ...prev, externalBeneficiaryDetails: event.target.value }))
                  }
                />
              </label>
            </>
          )}
          <label className="text-sm text-slate-600 md:col-span-2">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={caseForm.attendanceRequired}
                onChange={(event) =>
                    setCaseForm((prev) => ({
                      ...prev,
                      attendanceRequired: event.target.checked,
                      attendanceEventTitle: event.target.checked ? prev.attendanceEventTitle || prev.title || '' : '',
                      attendanceEventDescription: event.target.checked ? prev.attendanceEventDescription : '',
                      attendanceEventStartAt: event.target.checked ? prev.attendanceEventStartAt : '',
                      attendanceEventEndAt: event.target.checked ? prev.attendanceEventEndAt : '',
                    attendanceEventLocation: event.target.checked ? prev.attendanceEventLocation : '',
                  }))
                }
              />
              Attendance required for this welfare
            </span>
          </label>
          {caseForm.attendanceRequired && (
            <>
              <label className="text-sm text-slate-600">
                Attendance event title
                <input
                  required
                  className="field-input"
                  value={caseForm.attendanceEventTitle}
                  onChange={(event) =>
                    setCaseForm((prev) => ({ ...prev, attendanceEventTitle: event.target.value }))
                  }
                />
              </label>
              <label className="text-sm text-slate-600">
                Attendance start date/time
                <input
                  required
                  type="datetime-local"
                  className="field-input"
                  value={caseForm.attendanceEventStartAt}
                  onChange={(event) =>
                    setCaseForm((prev) => ({ ...prev, attendanceEventStartAt: event.target.value }))
                  }
                />
              </label>
              <label className="text-sm text-slate-600">
                Attendance end date/time (optional)
                <input
                  type="datetime-local"
                  className="field-input"
                  value={caseForm.attendanceEventEndAt}
                  onChange={(event) =>
                    setCaseForm((prev) => ({ ...prev, attendanceEventEndAt: event.target.value }))
                  }
                />
              </label>
              <label className="text-sm text-slate-600">
                Event location (optional)
                <input
                  className="field-input"
                  value={caseForm.attendanceEventLocation}
                  onChange={(event) =>
                    setCaseForm((prev) => ({ ...prev, attendanceEventLocation: event.target.value }))
                  }
                />
              </label>
              <label className="text-sm text-slate-600 md:col-span-2">
                Event description (optional)
                <textarea
                  rows={2}
                  className="field-input"
                  value={caseForm.attendanceEventDescription}
                  onChange={(event) =>
                    setCaseForm((prev) => ({ ...prev, attendanceEventDescription: event.target.value }))
                  }
                />
              </label>
            </>
          )}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="btn-primary disabled:opacity-50"
              disabled={creatingCase}
            >
              {creatingCase ? 'Creating...' : 'Create case'}
            </button>
          </div>
        </form>
      </section>
      )}

      {activeTab === 'manage' && (
      <>
      <section className="surface-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Approval queue</h2>
          <button
            type="button"
            className="btn-pill"
            onClick={() => void loadQueue()}
            disabled={queueLoading}
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-xs text-slate-500">
            Search queue
            <input
              className="field-input text-sm"
              placeholder="Case, member, or currency"
              value={queueQuery}
              onChange={(event) => {
                setQueueQuery(event.target.value);
                setQueuePage(1);
              }}
            />
          </label>
          <label className="text-xs text-slate-500">
            Type
            <select
              className="field-input text-sm"
              value={queueKindFilter}
              onChange={(event) => {
                setQueueKindFilter(event.target.value as typeof queueKindFilter);
                setQueuePage(1);
              }}
            >
              <option value="all">All</option>
              <option value="contribution">Contributions</option>
              <option value="payout">Payouts</option>
            </select>
          </label>
          <p className="text-xs text-slate-500 md:pt-6">{filteredQueue.length} record(s)</p>
        </div>
        {filteredQueue.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No pending approvals.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table-base">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Type</th>
                    <th className="py-2">Case</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Submitted by</th>
                    <th className="py-2">Submitted at</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedQueue.map((item) => (
                    <tr key={`${item.kind}-${item.id}`} className="table-row">
                      <td className="py-2 capitalize">{item.kind}</td>
                      <td className="py-2">{item.caseTitle}</td>
                      <td className="py-2">
                        {item.amount.toLocaleString()} {item.currency}
                      </td>
                      <td className="py-2">{item.submittedBy ?? '-'}</td>
                      <td className="py-2 text-xs text-slate-500">
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '-'}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn-pill border-red-200 bg-red-50 text-red-700"
                            disabled={queueActionId === item.id}
                            onClick={() => void reviewQueueItem(item, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn-pill border-rose-200 bg-rose-50 text-rose-700"
                            disabled={queueActionId === item.id}
                            onClick={() => void reviewQueueItem(item, 'reject')}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={queueCurrentPage}
              pageSize={queuePageSize}
              total={filteredQueue.length}
              onPageChange={setQueuePage}
              onPageSizeChange={(value) => {
                setQueuePageSize(value);
                setQueuePage(1);
              }}
            />
          </>
        )}
      </section>

      <section className="surface-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Manage welfare cases</h2>
          <div className="rounded-xl border border-red-100 bg-red-50/70 p-2">
            <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                caseTimelineTab === 'current'
                  ? 'border-red-300 bg-red-600 text-white shadow-sm'
                  : 'border-red-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
              }`}
              onClick={() => setCaseTimelineTab('current')}
            >
              Current ({currentCases.length})
            </button>
            <button
              type="button"
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                caseTimelineTab === 'past'
                  ? 'border-red-300 bg-red-600 text-white shadow-sm'
                  : 'border-red-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
              }`}
              onClick={() => setCaseTimelineTab('past')}
            >
              Past ({pastCases.length})
            </button>
            </div>
          </div>
        </div>

        {cases.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No welfare cases available yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredCases.length === 0 ? (
              <p className="text-sm text-slate-500">
                No {caseTimelineTab === 'current' ? 'current' : 'past'} cases found.
              </p>
            ) : (
              filteredCases.map((caseItem) => {
                const isSelected = caseItem.id === selectedCaseId;
                return (
                  <div key={caseItem.id} className="space-y-3">
                    <button
                      key={caseItem.id}
                      type="button"
                      onClick={() => {
                        setSelectedCaseId(caseItem.id);
                        setCaseState((prev) => ({ ...prev, error: null }));
                        setCaseDetailTab('contributors');
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-red-300 bg-red-50/60'
                          : 'border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{caseItem.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Recipient: {caseItem.beneficiaryName || 'Not assigned'}
                            {caseItem.beneficiaryType === 'external' ? ' (External)' : ''}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${
                            caseItem.status === 'open'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {caseItem.status}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <p>
                          Raised: <span className="font-semibold">{(caseItem.totalRaised ?? 0).toLocaleString()} {caseItem.currency}</span>
                        </p>
                        <p>
                          Disbursed: <span className="font-semibold">{(caseItem.totalDisbursed ?? 0).toLocaleString()} {caseItem.currency}</span>
                        </p>
                        <p>
                          Target: <span className="font-semibold">{caseItem.targetAmount.toLocaleString()} {caseItem.currency}</span>
                        </p>
                        <p>
                          Scope: <span className="font-semibold">{resolveCaseScopeLabel(caseItem)}</span>
                        </p>
                        {caseItem.attendanceRequired && (
                          <p className="col-span-2">
                            Attendance event:{' '}
                            <span className="font-semibold">
                              {caseItem.attendanceEventTitle || 'Linked event'}
                              {caseItem.attendanceEventStartAt
                                ? ` (${new Date(caseItem.attendanceEventStartAt).toLocaleString()})`
                                : ''}
                            </span>
                          </p>
                        )}
                      </div>
                    </button>
                    {isSelected && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="space-y-4">
                      {!selectedCase ? (
                        <p className="text-sm text-slate-500">Select a welfare case to view details.</p>
                      ) : (
                        <>
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="text-base font-semibold text-slate-900">{selectedCase.title}</h3>
                                <p className="mt-1 text-xs text-slate-500">
                                  Recipient: {selectedCase.beneficiaryName || 'Not assigned'} | Scope:{' '}
                                  {resolveCaseScopeLabel(selectedCase)}
                                </p>
                                {selectedCase.beneficiaryType === 'external' && selectedCase.beneficiaryExternalDetails && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Beneficiary details: {selectedCase.beneficiaryExternalDetails}
                                  </p>
                                )}
                                {selectedCase.attendanceRequired && (
                                  <p className="mt-1 text-xs text-red-700">
                                    Attendance required:{' '}
                                    {selectedCase.attendanceEventTitle || 'Linked event'}
                                    {selectedCase.attendanceEventStartAt
                                      ? ` on ${new Date(selectedCase.attendanceEventStartAt).toLocaleString()}`
                                      : ''}
                                    {selectedCase.attendanceEventLocation
                                      ? ` at ${selectedCase.attendanceEventLocation}`
                                      : ''}
                                  </p>
                                )}
                              </div>
                              {caseState.data && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="btn-pill"
                                    onClick={() => beginEditCase(selectedCase)}
                                  >
                                    Edit case
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-pill disabled:opacity-50"
                                    onClick={() =>
                                      void handleCaseStatusChange(caseState.data?.status === 'open' ? 'closed' : 'open')
                                    }
                                    disabled={caseStatusBusy}
                                  >
                                    {caseState.data.status === 'open' ? 'Close case' : 'Re-open case'}
                                  </button>
                                </div>
                              )}
                            </div>
        
                            {caseForStats && (
                              <div className="mt-4 grid gap-4 md:grid-cols-4">
                                <StatCard label="Target" value={`${caseForStats.targetAmount.toLocaleString()} ${caseForStats.currency}`} />
                                <StatCard
                                  label="Raised (approved)"
                                  value={`${(caseForStats.totalRaised ?? 0).toLocaleString()} ${caseForStats.currency}`}
                                  tone="positive"
                                />
                                <StatCard
                                  label="Disbursed (approved)"
                                  value={`${(caseForStats.totalDisbursed ?? 0).toLocaleString()} ${caseForStats.currency}`}
                                />
                                <StatCard label="Status" value={caseForStats.status.toUpperCase()} />
                              </div>
                            )}
                          </div>

                          {editingCaseId === selectedCase.id && editCaseForm && (
                            <form onSubmit={handleEditCaseSubmit} className="surface-muted space-y-4 p-4">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-slate-900">Edit welfare case</h3>
                                <button
                                  type="button"
                                  className="btn-pill"
                                  onClick={cancelEditCase}
                                  disabled={savingCaseEdit}
                                >
                                  Cancel
                                </button>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="text-xs text-slate-500">
                                  Title
                                  <input
                                    required
                                    className="field-input"
                                    value={editCaseForm.title}
                                    onChange={(event) =>
                                      setEditCaseForm((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              title: event.target.value,
                                              attendanceEventTitle:
                                                prev.attendanceRequired &&
                                                (prev.attendanceEventTitle.trim().length === 0 ||
                                                  prev.attendanceEventTitle.trim() === prev.title.trim())
                                                  ? event.target.value
                                                  : prev.attendanceEventTitle,
                                            }
                                          : prev,
                                      )
                                    }
                                  />
                                </label>
                                <label className="text-xs text-slate-500">
                                  Category
                                  <select
                                    required
                                    className="field-input"
                                    value={editCaseForm.categoryId}
                                    onChange={(event) =>
                                      setEditCaseForm((prev) =>
                                        prev ? { ...prev, categoryId: event.target.value } : prev,
                                      )
                                    }
                                  >
                                    <option value="">Select category</option>
                                    {categories.map((category) => (
                                      <option key={category.id} value={category.id}>
                                        {category.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="text-xs text-slate-500 md:col-span-2">
                                  Description
                                  <textarea
                                    required
                                    rows={3}
                                    className="field-input"
                                    value={editCaseForm.description}
                                    onChange={(event) =>
                                      setEditCaseForm((prev) =>
                                        prev ? { ...prev, description: event.target.value } : prev,
                                      )
                                    }
                                  />
                                </label>
                                <label className="text-xs text-slate-500">
                                  Target amount
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="field-input"
                                    value={editCaseForm.targetAmount}
                                    onChange={(event) =>
                                      setEditCaseForm((prev) =>
                                        prev ? { ...prev, targetAmount: event.target.value } : prev,
                                      )
                                    }
                                  />
                                </label>
                                <label className="text-xs text-slate-500">
                                  Currency
                                  <input
                                    className="field-input uppercase"
                                    maxLength={3}
                                    value={editCaseForm.currency}
                                    onChange={(event) =>
                                      setEditCaseForm((prev) =>
                                        prev
                                          ? { ...prev, currency: event.target.value.toUpperCase() }
                                          : prev,
                                      )
                                    }
                                  />
                                </label>
                                <label className="text-xs text-slate-500">
                                  Beneficiary type
                                  <select
                                    className="field-input"
                                    value={editCaseForm.beneficiaryType}
                                    onChange={(event) =>
                                      setEditCaseForm((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              beneficiaryType: event.target.value as 'member' | 'external',
                                              beneficiaryUserId:
                                                event.target.value === 'member'
                                                  ? prev.beneficiaryUserId || members[0]?.id || ''
                                                  : '',
                                              beneficiaryQuery:
                                                event.target.value === 'member'
                                                  ? prev.beneficiaryQuery || (members[0] ? memberSearchLabel(members[0]) : '')
                                                  : '',
                                              externalBeneficiaryName:
                                                event.target.value === 'external'
                                                  ? prev.externalBeneficiaryName
                                                  : '',
                                              externalBeneficiaryDetails:
                                                event.target.value === 'external'
                                                  ? prev.externalBeneficiaryDetails
                                                  : '',
                                            }
                                          : prev,
                                      )
                                    }
                                  >
                                    <option value="member">Member of association</option>
                                    <option value="external">External/non-member</option>
                                  </select>
                                </label>
                                {editCaseForm.beneficiaryType === 'member' ? (
                                  <>
                                    <label className="text-xs text-slate-500">
                                      Beneficiary member
                                      <input
                                        required
                                        list="welfare-edit-beneficiary-members"
                                        className="field-input"
                                        placeholder="Search by name, email, or alumni number"
                                        value={editCaseForm.beneficiaryQuery}
                                        onChange={(event) => {
                                          const selected = beneficiaryOptions.find(
                                            (member) => member.label === event.target.value,
                                          );
                                          setEditCaseForm((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  beneficiaryQuery: event.target.value,
                                                  beneficiaryUserId: selected?.id ?? '',
                                                }
                                              : prev,
                                          );
                                        }}
                                      />
                                      <datalist id="welfare-edit-beneficiary-members">
                                        {beneficiaryOptions.map((member) => (
                                          <option key={member.id} value={member.label} />
                                        ))}
                                      </datalist>
                                    </label>
                                    <label className="text-xs text-slate-500">
                                      Selected beneficiary
                                      <input className="field-input" disabled value={selectedEditBeneficiaryLabel} />
                                    </label>
                                  </>
                                ) : (
                                  <>
                                    <label className="text-xs text-slate-500">
                                      External beneficiary name
                                      <input
                                        required
                                        className="field-input"
                                        placeholder="e.g. Late Principal John Doe"
                                        value={editCaseForm.externalBeneficiaryName}
                                        onChange={(event) =>
                                          setEditCaseForm((prev) =>
                                            prev
                                              ? { ...prev, externalBeneficiaryName: event.target.value }
                                              : prev,
                                          )
                                        }
                                      />
                                    </label>
                                    <label className="text-xs text-slate-500">
                                      External beneficiary details (optional)
                                      <input
                                        className="field-input"
                                        placeholder="Relationship, next-of-kin, or payout context"
                                        value={editCaseForm.externalBeneficiaryDetails}
                                        onChange={(event) =>
                                          setEditCaseForm((prev) =>
                                            prev
                                              ? { ...prev, externalBeneficiaryDetails: event.target.value }
                                              : prev,
                                          )
                                        }
                                      />
                                    </label>
                                  </>
                                )}
                                <label className="text-xs text-slate-500 md:col-span-2">
                                  <span className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={editCaseForm.attendanceRequired}
                                      onChange={(event) =>
                                        setEditCaseForm((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                attendanceRequired: event.target.checked,
                                                attendanceEventTitle: event.target.checked
                                                  ? prev.attendanceEventTitle || prev.title
                                                  : '',
                                                attendanceEventDescription: event.target.checked
                                                  ? prev.attendanceEventDescription
                                                  : '',
                                                attendanceEventStartAt: event.target.checked
                                                  ? prev.attendanceEventStartAt
                                                  : '',
                                                attendanceEventEndAt: event.target.checked
                                                  ? prev.attendanceEventEndAt
                                                  : '',
                                                attendanceEventLocation: event.target.checked
                                                  ? prev.attendanceEventLocation
                                                  : '',
                                              }
                                            : prev,
                                        )
                                      }
                                    />
                                    Attendance required for this welfare
                                  </span>
                                </label>
                                {editCaseForm.attendanceRequired && (
                                  <>
                                    <label className="text-xs text-slate-500">
                                      Attendance event title
                                      <input
                                        required
                                        className="field-input"
                                        value={editCaseForm.attendanceEventTitle}
                                        onChange={(event) =>
                                          setEditCaseForm((prev) =>
                                            prev
                                              ? { ...prev, attendanceEventTitle: event.target.value }
                                              : prev,
                                          )
                                        }
                                      />
                                    </label>
                                    <label className="text-xs text-slate-500">
                                      Attendance start date/time
                                      <input
                                        required
                                        type="datetime-local"
                                        className="field-input"
                                        value={editCaseForm.attendanceEventStartAt}
                                        onChange={(event) =>
                                          setEditCaseForm((prev) =>
                                            prev
                                              ? { ...prev, attendanceEventStartAt: event.target.value }
                                              : prev,
                                          )
                                        }
                                      />
                                    </label>
                                    <label className="text-xs text-slate-500">
                                      Attendance end date/time (optional)
                                      <input
                                        type="datetime-local"
                                        className="field-input"
                                        value={editCaseForm.attendanceEventEndAt}
                                        onChange={(event) =>
                                          setEditCaseForm((prev) =>
                                            prev
                                              ? { ...prev, attendanceEventEndAt: event.target.value }
                                              : prev,
                                          )
                                        }
                                      />
                                    </label>
                                    <label className="text-xs text-slate-500">
                                      Event location (optional)
                                      <input
                                        className="field-input"
                                        value={editCaseForm.attendanceEventLocation}
                                        onChange={(event) =>
                                          setEditCaseForm((prev) =>
                                            prev
                                              ? { ...prev, attendanceEventLocation: event.target.value }
                                              : prev,
                                          )
                                        }
                                      />
                                    </label>
                                    <label className="text-xs text-slate-500 md:col-span-2">
                                      Event description (optional)
                                      <textarea
                                        rows={2}
                                        className="field-input"
                                        value={editCaseForm.attendanceEventDescription}
                                        onChange={(event) =>
                                          setEditCaseForm((prev) =>
                                            prev
                                              ? { ...prev, attendanceEventDescription: event.target.value }
                                              : prev,
                                          )
                                        }
                                      />
                                    </label>
                                  </>
                                )}
                              </div>
                              <div>
                                <button
                                  type="submit"
                                  className="btn-primary disabled:opacity-50"
                                  disabled={savingCaseEdit}
                                >
                                  {savingCaseEdit ? 'Saving...' : 'Save changes'}
                                </button>
                              </div>
                            </form>
                          )}
        
                          {caseState.loading && <p className="text-sm text-slate-500">Loading case...</p>}
                          {caseState.error && <p className="text-sm text-rose-600">{caseState.error}</p>}
        
                          {caseState.data && (
                            <div className="space-y-4">
                              <div className="rounded-xl border border-red-100 bg-red-50/70 p-2 shadow-sm">
                                <div className="grid gap-2 sm:grid-cols-3">
                                  <button
                                    type="button"
                                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                                      caseDetailTab === 'contributors'
                                        ? 'border-red-300 bg-red-600 text-white shadow-sm'
                                        : 'border-red-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
                                    }`}
                                    onClick={() => setCaseDetailTab('contributors')}
                                  >
                                    Contributors
                                  </button>
                                  <button
                                    type="button"
                                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                                      caseDetailTab === 'post'
                                        ? 'border-red-300 bg-red-600 text-white shadow-sm'
                                        : 'border-red-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
                                    }`}
                                    onClick={() => setCaseDetailTab('post')}
                                  >
                                    Post
                                  </button>
                                  <button
                                    type="button"
                                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                                      caseDetailTab === 'payout'
                                        ? 'border-red-300 bg-red-600 text-white shadow-sm'
                                        : 'border-red-100 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50'
                                    }`}
                                    onClick={() => setCaseDetailTab('payout')}
                                  >
                                    Payout
                                  </button>
                                </div>
                              </div>
        
                              {caseDetailTab === 'contributors' && (
                              <DataTable
                                title="Contributions"
                                emptyLabel="No contributions yet."
                                headers={['Contributor', 'Amount', 'Evidence', 'Status', 'Date']}
                                rows={caseState.data.contributions.map((contribution) => [
                                  contribution.contributorName,
                                  `${contribution.amount.toLocaleString()} ${contribution.currency}`,
                                  contribution.paymentEvidenceUrl ? (
                                    <a
                                      href={contribution.paymentEvidenceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-red-700 underline"
                                    >
                                      {contribution.paymentEvidenceName || 'View evidence'}
                                    </a>
                                  ) : (
                                    'None'
                                  ),
                                  contribution.status,
                                  contribution.paidAt ? new Date(contribution.paidAt).toLocaleString() : '-',
                                ])}
                              />
                              )}
        
                              {caseDetailTab === 'post' && (
                                <form onSubmit={handleContributionSubmit} className="space-y-3 surface-muted p-4">
                                  <h3 className="text-sm font-semibold text-slate-900">Record contribution</h3>
                                  <label className="text-xs text-slate-500">
                                    Contributor member
                                    <input
                                      required
                                      list="welfare-contributor-members"
                                      className="field-input"
                                      placeholder="Search member by name or email"
                                      value={contributionForm.contributorQuery}
                                      onChange={(event) => {
                                        const selected = contributorOptions.find(
                                          (member) => member.label === event.target.value,
                                        );
                                        setContributionForm((prev) => ({
                                          ...prev,
                                          contributorQuery: event.target.value,
                                          contributorUserId: selected?.id ?? '',
                                        }));
                                      }}
                                    />
                                    <datalist id="welfare-contributor-members">
                                      {contributorOptions.map((member) => (
                                        <option key={member.id} value={member.label} />
                                      ))}
                                    </datalist>
                                  </label>
                                  <label className="text-xs text-slate-500">
                                    Selected member
                                    <input className="field-input" value={selectedContributorLabel} disabled />
                                  </label>
                                  <label className="text-xs text-slate-500">
                                    Amount ({caseState.data.currency})
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      required
                                      className="field-input"
                                      value={contributionForm.amount}
                                      onChange={(event) =>
                                        setContributionForm((prev) => ({ ...prev, amount: event.target.value }))
                                      }
                                    />
                                  </label>
                                  <label className="text-xs text-slate-500">
                                    Notes
                                    <textarea
                                      className="field-input"
                                      rows={3}
                                      value={contributionForm.notes}
                                      onChange={(event) =>
                                        setContributionForm((prev) => ({ ...prev, notes: event.target.value }))
                                      }
                                    />
                                  </label>
                                  <label className="text-xs text-slate-500">
                                    Posting date/time
                                    <input
                                      type="datetime-local"
                                      className="field-input"
                                      value={contributionForm.paidAt}
                                      onChange={(event) =>
                                        setContributionForm((prev) => ({ ...prev, paidAt: event.target.value }))
                                      }
                                    />
                                  </label>
                                  <button type="submit" className="btn-primary">
                                    Submit contribution
                                  </button>
                                </form>
                              )}
        
                              {caseDetailTab === 'payout' && (
                                <div className="space-y-4">
                                <form onSubmit={handlePayoutSubmit} className="space-y-3 surface-muted p-4">
                                  <h3 className="text-sm font-semibold text-slate-900">Record payout</h3>
                                  <label className="text-xs text-slate-500">
                                    Gross amount ({caseState.data.currency})
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      required
                                      className="field-input"
                                      value={payoutForm.amount}
                                      onChange={(event) =>
                                        setPayoutForm((prev) => ({ ...prev, amount: event.target.value }))
                                      }
                                    />
                                  </label>
                                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <p className="text-xs font-semibold uppercase text-slate-500">Retainer configuration (optional)</p>
                                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                                      <label className="text-xs text-slate-500">
                                        Mode
                                        <select
                                          className="field-input"
                                          value={payoutForm.retainerMode}
                                          onChange={(event) =>
                                            setPayoutForm((prev) => ({
                                              ...prev,
                                              retainerMode: event.target.value as PayoutFormState['retainerMode'],
                                            }))
                                          }
                                        >
                                          <option value="none">No retainer</option>
                                          <option value="percentage">Percentage</option>
                                          <option value="fixed">Fixed amount</option>
                                        </select>
                                      </label>
                                      {payoutForm.retainerMode === 'percentage' && (
                                        <label className="text-xs text-slate-500">
                                          Retainer percentage (%)
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            className="field-input"
                                            value={payoutForm.retainerPercentage}
                                            onChange={(event) =>
                                              setPayoutForm((prev) => ({ ...prev, retainerPercentage: event.target.value }))
                                            }
                                          />
                                        </label>
                                      )}
                                      {payoutForm.retainerMode === 'fixed' && (
                                        <label className="text-xs text-slate-500">
                                          Retainer amount ({caseState.data.currency})
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="field-input"
                                            value={payoutForm.retainerAmount}
                                            onChange={(event) =>
                                              setPayoutForm((prev) => ({ ...prev, retainerAmount: event.target.value }))
                                            }
                                          />
                                        </label>
                                      )}
                                    </div>
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <p className="text-xs font-semibold uppercase text-slate-500">Add dues deduction</p>
                                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                                      <select
                                        className="field-input md:col-span-2"
                                        value={pendingDuesDeduction.groupKey}
                                        onChange={(event) =>
                                          setPendingDuesDeduction((prev) => ({ ...prev, groupKey: event.target.value }))
                                        }
                                      >
                                        <option value="">Select dues type/group</option>
                                        {duesDeductionGroups.map((group) => (
                                          <option key={group.key} value={group.key}>
                                            {group.label} - Outstanding {group.outstanding.toLocaleString()} {group.currency} ({group.count} invoice{group.count > 1 ? 's' : ''})
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="field-input"
                                        placeholder="Amount"
                                        value={pendingDuesDeduction.amount}
                                        onChange={(event) =>
                                          setPendingDuesDeduction((prev) => ({ ...prev, amount: event.target.value }))
                                        }
                                      />
                                    </div>
                                    <button type="button" className="mt-2 btn-pill" onClick={addDuesDeduction}>
                                      Add dues deduction
                                    </button>
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <p className="text-xs font-semibold uppercase text-slate-500">Add liability deduction</p>
                                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                                      <input
                                        className="field-input md:col-span-2"
                                        placeholder="Label (e.g., prior liabilities)"
                                        value={pendingLiabilityDeduction.label}
                                        onChange={(event) =>
                                          setPendingLiabilityDeduction((prev) => ({ ...prev, label: event.target.value }))
                                        }
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="field-input"
                                        placeholder="Amount"
                                        value={pendingLiabilityDeduction.amount}
                                        onChange={(event) =>
                                          setPendingLiabilityDeduction((prev) => ({ ...prev, amount: event.target.value }))
                                        }
                                      />
                                    </div>
                                    <button type="button" className="mt-2 btn-pill" onClick={addLiabilityDeduction}>
                                      Add liability deduction
                                    </button>
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                                    <p>
                                      Retainer deduction:{' '}
                                      <span className="font-semibold">
                                        {retainerDeductionAmount.toLocaleString()} {caseState.data.currency}
                                      </span>
                                    </p>
                                    <p>
                                      Extra deductions:{' '}
                                      <span className="font-semibold">
                                        {customDeductionsTotal.toLocaleString()} {caseState.data.currency}
                                      </span>
                                    </p>
                                    <p>
                                      Total deductions:{' '}
                                      <span className="font-semibold">
                                        {payoutTotalDeductions.toLocaleString()} {caseState.data.currency}
                                      </span>
                                    </p>
                                    <p>
                                      Net payout to beneficiary:{' '}
                                      <span className="font-semibold">
                                        {payoutNetPreview.toLocaleString()} {caseState.data.currency}
                                      </span>
                                    </p>
                                  </div>
                                  {payoutDeductions.length > 0 && (
                                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                                      <p className="text-xs font-semibold uppercase text-slate-500">Queued deductions</p>
                                      <ul className="mt-2 space-y-2 text-xs text-slate-700">
                                        {payoutDeductions.map((row) => (
                                          <li
                                            key={row.id}
                                            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1"
                                          >
                                            <span>
                                              {row.label} - {Number(row.amount).toLocaleString()} {caseState.data.currency}
                                            </span>
                                            <button type="button" className="btn-pill" onClick={() => removePayoutDeduction(row.id)}>
                                              Remove
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  <label className="text-xs text-slate-500">
                                    Channel
                                    <select
                                      required
                                      className="field-input"
                                      value={payoutForm.channel}
                                      onChange={(event) =>
                                        setPayoutForm((prev) => ({ ...prev, channel: event.target.value }))
                                      }
                                    >
                                      <option value="transfer">Transfer</option>
                                      <option value="cash">Cash</option>
                                      <option value="cheque">Cheque</option>
                                      <option value="card">Card/POS</option>
                                      <option value="wallet">Wallet</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </label>
                                  <label className="text-xs text-slate-500">
                                    Reference
                                    <input
                                      className="field-input"
                                      value={payoutForm.reference}
                                      onChange={(event) =>
                                        setPayoutForm((prev) => ({ ...prev, reference: event.target.value }))
                                      }
                                    />
                                  </label>
                                  <label className="text-xs text-slate-500">
                                    Notes
                                    <textarea
                                      className="field-input"
                                      rows={3}
                                      value={payoutForm.notes}
                                      onChange={(event) =>
                                        setPayoutForm((prev) => ({ ...prev, notes: event.target.value }))
                                      }
                                    />
                                  </label>
                                  <label className="text-xs text-slate-500">
                                    Posting date/time
                                    <input
                                      type="datetime-local"
                                      className="field-input"
                                      value={payoutForm.disbursedAt}
                                      onChange={(event) =>
                                        setPayoutForm((prev) => ({ ...prev, disbursedAt: event.target.value }))
                                      }
                                    />
                                  </label>
                                  <button type="submit" className="btn-secondary">
                                    Submit payout
                                  </button>
                                </form>
                                <DataTable
                                  title="Payouts"
                                  emptyLabel="No payouts yet."
                                  headers={['Gross', 'Deductions', 'Net', 'Channel', 'Status', 'Date']}
                                  rows={caseState.data.payouts.map((payout) => [
                                    `${(payout.grossAmount ?? payout.amount).toLocaleString()} ${payout.currency}`,
                                    `${(payout.totalDeductions ?? 0).toLocaleString()} ${payout.currency}`,
                                    `${(payout.netAmount ?? payout.amount).toLocaleString()} ${payout.currency}`,
                                    payout.channel,
                                    payout.status,
                                    payout.disbursedAt ? new Date(payout.disbursedAt).toLocaleString() : '-',
                                  ])}
                                />
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
      </>
      )}
    </section>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'positive' }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className={`text-xl font-semibold ${tone === 'positive' ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function DataTable({
  title,
  headers,
  rows,
  emptyLabel,
}: {
  title: string;
  headers: string[];
  rows: React.ReactNode[][];
  emptyLabel: string;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return rows;
    }
    return rows.filter((row) =>
      row.some((cell) => String(cell).toLowerCase().includes(needle)),
    );
  }, [query, rows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, filteredRows, pageSize]);

  return (
    <section className="surface-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{filteredRows.length} record(s)</p>
      </div>
      <label className="mt-3 block text-xs text-slate-500">
        Search {title.toLowerCase()}
        <input
          className="field-input text-sm"
          placeholder="Filter rows"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
      </label>
      {filteredRows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table-base">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  {headers.map((header) => (
                    <th key={header} className="py-2">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row, index) => (
                  <tr key={`${title}-${currentPage}-${index}`} className="table-row">
                    {row.map((cell, cellIndex) => (
                      <td key={`${title}-${currentPage}-${index}-${cellIndex}`} className="py-2 pr-4 text-slate-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={currentPage}
            pageSize={pageSize}
            total={filteredRows.length}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        </>
      )}
    </section>
  );
}




