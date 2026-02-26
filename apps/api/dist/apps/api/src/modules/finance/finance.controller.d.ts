import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { FinanceService } from './finance.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { CreateDuesSchemeDto, GenerateSchemeInvoicesDto, UpdateDuesSchemeDto } from './dto/dues-scheme.dto';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
export declare class FinanceController {
    private readonly financeService;
    private readonly roleAssignmentsService;
    constructor(financeService: FinanceService, roleAssignmentsService: RoleAssignmentsService);
    listSchemes(user: AuthenticatedUser, status?: string): Promise<import("@gcuoba/types").DuesSchemeDTO[]>;
    createScheme(dto: CreateDuesSchemeDto, user: AuthenticatedUser): Promise<import("@gcuoba/types").DuesSchemeDTO>;
    updateScheme(schemeId: string, dto: UpdateDuesSchemeDto, user: AuthenticatedUser): Promise<import("@gcuoba/types").DuesSchemeDTO>;
    deleteScheme(schemeId: string, user: AuthenticatedUser): Promise<{
        success: boolean;
    }>;
    generateScheme(schemeId: string, dto: GenerateSchemeInvoicesDto, user: AuthenticatedUser): Promise<{
        schemeId: string;
        year: number;
        members: number;
        periods: number;
        created: number;
        skipped: number;
    }>;
    invoices(userId: string, user: AuthenticatedUser): Promise<import("@gcuoba/types").DuesInvoiceDTO[]>;
    adminSummary(user: AuthenticatedUser): Promise<import("@gcuoba/types").FinanceAdminSummaryDTO>;
    listProjects(user: AuthenticatedUser): Promise<import("@gcuoba/types").ProjectDTO[]>;
    createProject(user: AuthenticatedUser, dto: CreateProjectDto): Promise<import("@gcuoba/types").ProjectDTO>;
    updateProject(user: AuthenticatedUser, projectId: string, dto: UpdateProjectDto): Promise<import("@gcuoba/types").ProjectDTO>;
    deleteProject(user: AuthenticatedUser, projectId: string): Promise<{
        success: boolean;
    }>;
    listExpenses(user: AuthenticatedUser): Promise<import("@gcuoba/types").ExpenseDTO[]>;
    createExpense(user: AuthenticatedUser, dto: CreateExpenseDto): Promise<import("@gcuoba/types").ExpenseDTO>;
    updateExpense(user: AuthenticatedUser, expenseId: string, dto: UpdateExpenseDto): Promise<import("@gcuoba/types").ExpenseDTO>;
    approveExpenseFirst(user: AuthenticatedUser, expenseId: string): Promise<import("@gcuoba/types").ExpenseDTO>;
    approveExpenseFinal(user: AuthenticatedUser, expenseId: string): Promise<import("@gcuoba/types").ExpenseDTO>;
    rejectExpense(user: AuthenticatedUser, expenseId: string): Promise<import("@gcuoba/types").ExpenseDTO>;
    deleteExpense(user: AuthenticatedUser, expenseId: string): Promise<{
        success: boolean;
    }>;
    overviewReport(user: AuthenticatedUser, year?: string, month?: string, scopeType?: string, scopeId?: string): Promise<import("@gcuoba/types").FinanceReportDTO>;
    exportOverviewReport(user: AuthenticatedUser, year: string | undefined, month: string | undefined, scopeType: string | undefined, scopeId: string | undefined, response: Response): Promise<StreamableFile>;
    scopedReportScopes(user: AuthenticatedUser): Promise<import("@gcuoba/types").FinanceReportScopeAccessDTO>;
    scopedOverviewReport(user: AuthenticatedUser, year?: string, month?: string, scopeType?: string, scopeId?: string): Promise<import("@gcuoba/types").FinanceReportDTO>;
    exportScopedOverviewReport(user: AuthenticatedUser, year: string | undefined, month: string | undefined, scopeType: string | undefined, scopeId: string | undefined, response: Response): Promise<StreamableFile>;
    captureSnapshots(user: AuthenticatedUser, body: {
        year?: number;
        month?: number;
    }): Promise<import("@gcuoba/types").FinanceReportSnapshotCaptureDTO>;
    listSnapshots(user: AuthenticatedUser, scopeType?: string, scopeId?: string, limit?: string): Promise<import("@gcuoba/types").FinanceReportSnapshotDTO[]>;
    outstanding(userId: string, user: AuthenticatedUser): Promise<import("@gcuoba/types").DuesInvoiceDTO[]>;
    createInvoice(dto: CreateInvoiceDto, user: AuthenticatedUser): Promise<import("@gcuoba/types").DuesInvoiceDTO>;
    listPayments(user: AuthenticatedUser): Promise<import("@gcuoba/types").PaymentDTO[]>;
    recordPayment(dto: RecordPaymentDto, user: AuthenticatedUser): Promise<import("@gcuoba/types").PaymentDTO>;
    getReceipt(user: AuthenticatedUser, paymentId: string): Promise<import("@gcuoba/types").PaymentReceiptDTO>;
    downloadReceipt(user: AuthenticatedUser, paymentId: string, response: Response): Promise<StreamableFile>;
    memberLedger(user: AuthenticatedUser, memberId: string): Promise<import("@gcuoba/types").MemberLedgerDTO>;
    classLedger(user: AuthenticatedUser, classId: string, year?: string): Promise<import("@gcuoba/types").ClassLedgerDTO>;
    private ensureGlobal;
    private ensureSelf;
    private parseYear;
    private parseMonth;
    private parseScopeType;
}
