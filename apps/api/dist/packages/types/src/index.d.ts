export type MemberStatus = 'pending' | 'active' | 'suspended';
export type BranchMembershipStatus = 'requested' | 'approved' | 'rejected' | 'ended';
export type PrivacyLevel = 'public' | 'public_to_members' | 'private';
export interface BranchSummary {
    id: string;
    name: string;
    country?: string;
}
export interface ClassSummary {
    id: string;
    label: string;
    entryYear: number;
}
export interface ClassSetDTO extends ClassSummary {
    status: 'active' | 'inactive';
}
export interface UserDTO {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    alumniNumber?: string | null;
    status: MemberStatus;
}
export interface ProfileDTO {
    id: string;
    userId: string;
    title?: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    dobDay?: number | null;
    dobMonth?: number | null;
    dobYear?: number | null;
    sex?: string | null;
    stateOfOrigin?: string | null;
    lgaOfOrigin?: string | null;
    residence?: {
        houseNo?: string | null;
        street?: string | null;
        area?: string | null;
        city?: string | null;
        country?: string | null;
    };
    occupation?: string | null;
    photoUrl?: string | null;
    houseId?: string | null;
    privacyLevel: PrivacyLevel;
}
export interface ClassMembershipDTO {
    id: string;
    userId: string;
    classId: string;
    joinedAt?: string;
}
export interface BranchMembershipDTO {
    id: string;
    userId: string;
    branchId: string;
    status: BranchMembershipStatus;
    requestedAt?: string;
    approvedBy?: string | null;
    approvedAt?: string | null;
    endedAt?: string | null;
    note?: string | null;
    memberName?: string;
    memberEmail?: string;
}
export interface BranchDTO extends BranchSummary {
}
export interface CountryDTO {
    id: string;
    name: string;
    isoCode?: string | null;
}
export interface HouseDTO {
    id: string;
    name: string;
    motto?: string | null;
}
export interface AnnouncementDTO {
    id: string;
    title: string;
    body: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    publishedAt?: string;
    status: 'draft' | 'published';
}
export interface EventDTO {
    id: string;
    title: string;
    description?: string | null;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    location?: string | null;
    startAt?: string;
    endAt?: string;
    status?: 'draft' | 'published' | 'cancelled';
    attendeeCount?: number;
    contributionTotal?: number;
    myRsvp?: 'none' | 'interested' | 'attending' | 'not_attending';
    myContributionAmount?: number;
}
export interface EventParticipationDTO {
    id: string;
    eventId: string;
    userId: string;
    status: 'interested' | 'attending' | 'not_attending';
    contributionAmount: number;
    contributionCurrency: string;
    contributionNote?: string | null;
    contributedAt?: string | null;
}
export interface LedgerTotalsDTO {
    billed: number;
    paid: number;
    outstanding: number;
    welfareReceived?: number;
    welfareContributed?: number;
}
export interface LedgerTransactionDTO {
    id: string;
    date?: string;
    type: string;
    description?: string;
    debit: number;
    credit: number;
    balance: number;
}
export interface MemberLedgerDTO {
    memberId: string;
    totals: LedgerTotalsDTO;
    invoices: DuesInvoiceDTO[];
    payments: PaymentDTO[];
    transactions: LedgerTransactionDTO[];
}
export interface ClassLedgerDTO {
    classId: string;
    year?: number | null;
    totals: LedgerTotalsDTO;
    invoices: DuesInvoiceDTO[];
    payments: PaymentDTO[];
}
export interface RoleAssignmentDTO {
    id: string;
    userId: string;
    roleId?: string;
    roleCode?: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    startDate?: string;
    endDate?: string | null;
}
export interface AdminMemberDTO {
    user: UserDTO;
    profile: ProfileDTO | null;
    classMembership: ClassMembershipDTO | null;
    branchMemberships: BranchMembershipDTO[];
    roleAssignments: RoleAssignmentDTO[];
}
export interface RoleDTO {
    id: string;
    code: string;
    name: string;
    scope: 'global' | 'branch' | 'class';
}
export interface RoleFeatureDTO {
    id: string;
    roleId: string;
    moduleKey: string;
    allowed: boolean;
}
export interface DuesSchemeDTO {
    id: string;
    title: string;
    amount: number;
    currency: string;
    frequency: 'monthly' | 'quarterly' | 'annual' | 'one_off';
    oneOffYear?: number | null;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    status: 'active' | 'inactive';
}
export interface DuesInvoiceDTO {
    id: string;
    userId: string;
    userName?: string;
    userAlumniNumber?: string | null;
    amount: number;
    currency: string;
    status: 'unpaid' | 'part_paid' | 'paid';
    periodStart?: string;
    scheme?: {
        id: string;
        title: string;
    };
    paidAmount?: number;
    balance?: number;
}
export interface PaymentApplicationDTO {
    invoiceId: string;
    amount: number;
}
export interface PaymentDTO {
    id: string;
    payerUserId: string;
    payerName?: string;
    payerAlumniNumber?: string | null;
    amount: number;
    currency: string;
    channel: string;
    reference?: string;
    scopeType?: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    notes?: string;
    status: 'pending' | 'completed';
    paidAt?: string;
    applications: PaymentApplicationDTO[];
}
export interface PaymentReceiptDTO {
    id: string;
    paymentId: string;
    receiptNo: string;
    issuedAt: string;
    amount: number;
    payerUserId: string;
    downloadUrl: string;
    payerName?: string;
}
export interface ProjectDTO {
    id: string;
    name: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    budget?: number | null;
    actualSpend: number;
    startDate?: string | null;
    endDate?: string | null;
    status: 'planning' | 'active' | 'completed';
    ownerId?: string | null;
    ownerName?: string;
}
export interface ExpenseDTO {
    id: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    projectId?: string | null;
    projectName?: string;
    title: string;
    description?: string | null;
    notes?: string | null;
    amount: number;
    currency: string;
    status: 'pending' | 'approved' | 'rejected';
    approvalStage: 'pending' | 'finance_approved' | 'approved' | 'rejected';
    submittedBy?: string | null;
    submittedByName?: string;
    approvedBy?: string | null;
    approvedAt?: string | null;
    firstApprovedBy?: string | null;
    firstApprovedAt?: string | null;
    secondApprovedBy?: string | null;
    secondApprovedAt?: string | null;
    rejectedBy?: string | null;
    rejectedAt?: string | null;
    createdAt?: string;
}
export interface WelfareCaseDTO {
    id: string;
    title: string;
    description: string;
    categoryId?: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    targetAmount: number;
    currency: string;
    status: 'open' | 'closed';
    totalRaised?: number;
    totalDisbursed?: number;
    beneficiaryName?: string;
    beneficiaryUserId?: string;
}
export interface WelfareContributionDTO {
    id: string;
    caseId: string;
    contributorName: string;
    contributorEmail?: string;
    contributorUserId?: string;
    amount: number;
    currency: string;
    notes?: string;
    paidAt?: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    reviewNote?: string | null;
}
export interface WelfarePayoutDTO {
    id: string;
    caseId: string;
    beneficiaryUserId?: string;
    amount: number;
    grossAmount?: number;
    totalDeductions?: number;
    netAmount?: number;
    currency: string;
    channel: string;
    reference?: string;
    notes?: string;
    deductions?: WelfarePayoutDeductionDTO[];
    disbursedAt?: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    reviewNote?: string | null;
}
export interface WelfarePayoutDeductionDTO {
    type: 'standard_percentage' | 'dues_invoice' | 'liability' | 'custom';
    label: string;
    amount: number;
    percentage?: number | null;
    invoiceId?: string | null;
}
export interface WelfareOutstandingInvoiceDTO {
    id: string;
    title: string;
    amount: number;
    paidAmount: number;
    balance: number;
    currency: string;
    status: 'unpaid' | 'part_paid' | 'paid';
    periodStart?: string;
}
export interface WelfareCaseDetailDTO extends WelfareCaseDTO {
    contributions: WelfareContributionDTO[];
    payouts: WelfarePayoutDTO[];
    beneficiaryOutstandingInvoices?: WelfareOutstandingInvoiceDTO[];
}
export interface WelfareCategoryDTO {
    id: string;
    name: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    status: 'active' | 'inactive';
}
export interface WelfareQueueItemDTO {
    id: string;
    kind: 'contribution' | 'payout';
    caseId: string;
    caseTitle: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    amount: number;
    currency: string;
    submittedAt?: string;
    submittedBy?: string;
    status: 'pending' | 'approved' | 'rejected';
}
export interface NotificationDTO {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'action_required';
    read: boolean;
    createdAt: string;
    readAt?: string | null;
    metadata?: Record<string, unknown> | null;
}
export interface NotificationEmailJobDTO {
    id: string;
    notificationId?: string | null;
    userId: string;
    toEmail: string;
    subject: string;
    body: string;
    status: 'pending' | 'sent' | 'failed';
    attempts: number;
    lastError?: string | null;
    createdAt: string;
    sentAt?: string | null;
    nextAttemptAt?: string | null;
}
export interface NotificationEmailQueueStatsDTO {
    pending: number;
    failed: number;
    sent: number;
}
export interface NotificationEmailQueueProcessResultDTO {
    processed: number;
    sent: number;
    failed: number;
    skipped: number;
}
export interface NotificationEmailWorkerStatusDTO {
    enabled: boolean;
    running: boolean;
    pollSeconds: number;
    batchSize: number;
    lastRunAt?: string | null;
    lastResult?: NotificationEmailQueueProcessResultDTO | null;
}
export interface DocumentRecordDTO {
    id: string;
    ownerUserId: string;
    scopeType: 'global' | 'branch' | 'class' | 'private';
    scopeId?: string | null;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    visibility: 'private' | 'scope' | 'public';
    uploadedAt: string;
}
export interface AuditLogDTO {
    id: string;
    actorUserId: string;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    scopeType?: 'global' | 'branch' | 'class' | 'private' | null;
    scopeId?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
}
export interface AuthResponse {
    user: UserDTO;
    token: string;
}
export interface DashboardSummaryDTO {
    user: UserDTO | null;
    classMembership: ClassMembershipDTO | null;
    branchMemberships: BranchMembershipDTO[];
    outstandingInvoices: DuesInvoiceDTO[];
    branches: BranchDTO[];
    welfareCases: WelfareCaseDTO[];
    announcements: AnnouncementDTO[];
    events: EventDTO[];
    duesSummary: DuesSummaryDTO;
}
export interface BranchExecutiveBranchDTO extends BranchDTO {
    pendingRequests: BranchMembershipDTO[];
}
export interface BranchExecutiveRoleOptionDTO {
    id: string;
    code: string;
    name: string;
}
export interface BranchExecutiveMemberOptionDTO {
    id: string;
    name: string;
    email: string;
    branchIds: string[];
}
export interface BranchExecutiveSummaryDTO {
    branches: BranchExecutiveBranchDTO[];
    branchRoles: BranchExecutiveRoleOptionDTO[];
    branchMembers: BranchExecutiveMemberOptionDTO[];
}
export interface DuesSchemeSummaryDTO {
    schemeId?: string | null;
    label: string;
    frequency: 'monthly' | 'quarterly' | 'annual' | 'one_off' | 'custom';
    scope: string;
    currency: string;
    due: number;
    paid: number;
    balance: number;
}
export interface CurrencyTotalsDTO {
    due: number;
    paid: number;
    balance: number;
}
export interface DuesSummaryDTO {
    year: number;
    schemes: DuesSchemeSummaryDTO[];
    totalsByCurrency: Record<string, CurrencyTotalsDTO>;
    primaryCurrency: string;
    hasData: boolean;
    priorOutstandingByCurrency: Record<string, CurrencyTotalsDTO>;
    hasPriorOutstanding: boolean;
}
export interface FinanceAdminSummaryDTO {
    invoices: DuesInvoiceDTO[];
    payments: PaymentDTO[];
    schemes: DuesSchemeDTO[];
    projects: ProjectDTO[];
    expenses: ExpenseDTO[];
}
export interface FinanceReportFiltersDTO {
    year?: number;
    month?: number;
    scopeType?: 'global' | 'branch' | 'class';
    scopeId?: string | null;
}
export interface FinanceReportRowDTO {
    userId: string;
    userName?: string;
    userAlumniNumber?: string | null;
    currency: string;
    invoices: number;
    payments: number;
    billed: number;
    paid: number;
    outstanding: number;
}
export interface FinanceReportTotalsDTO {
    billed: number;
    paid: number;
    outstanding: number;
}
export interface FinanceReportDTO {
    generatedAt: string;
    filters: FinanceReportFiltersDTO;
    totalsByCurrency: Record<string, FinanceReportTotalsDTO>;
    rows: FinanceReportRowDTO[];
}
export interface FinanceReportScopeAccessDTO {
    hasGlobalAccess: boolean;
    branches: BranchDTO[];
    classes: ClassSetDTO[];
}
export type DuesBroadsheetStatus = 'clear' | 'owing_current' | 'outstanding_prior';
export interface DuesBroadsheetRowDTO {
    userId: string;
    memberName: string;
    alumniNumber?: string | null;
    joinedAt?: string | null;
    currentYearDues: number;
    paidSoFar: number;
    currentYearBalance: number;
    priorOutstanding: number;
    balanceOwing: number;
    currency: string;
    status: DuesBroadsheetStatus;
}
export interface DuesBroadsheetTotalsDTO {
    members: number;
    currentYearDues: number;
    paidSoFar: number;
    currentYearBalance: number;
    priorOutstanding: number;
    balanceOwing: number;
}
export interface DuesBroadsheetDTO {
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    year: number;
    currency: string;
    query?: string;
    status?: DuesBroadsheetStatus;
    rows: DuesBroadsheetRowDTO[];
    totals: DuesBroadsheetTotalsDTO;
}
export interface FinanceReportSnapshotDTO {
    id: string;
    period: string;
    year: number;
    month: number;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    totalsByCurrency: Record<string, FinanceReportTotalsDTO>;
    rowCount: number;
    generatedAt: string;
}
export interface FinanceReportSnapshotCaptureDTO {
    period: string;
    snapshots: FinanceReportSnapshotDTO[];
}
