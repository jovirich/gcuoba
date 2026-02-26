import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Res,
    StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import { FinanceService } from './finance.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import {
    CreateDuesSchemeDto,
    GenerateSchemeInvoicesDto,
    UpdateDuesSchemeDto,
} from './dto/dues-scheme.dto';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { RequireActive } from '../../auth/require-active.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';

@Controller('finance')
@RequireActive()
export class FinanceController {
    constructor(
        private readonly financeService: FinanceService,
        private readonly roleAssignmentsService: RoleAssignmentsService,
    ) {}

    @Get('schemes')
    listSchemes(
        @CurrentUser() user: AuthenticatedUser,
        @Query('status') status?: string,
    ) {
        const includeInactive = status === 'all';
        return this.financeService.listSchemes(user.id, !includeInactive);
    }

    @Post('schemes')
    async createScheme(
        @Body() dto: CreateDuesSchemeDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.financeService.createScheme(user.id, dto);
    }

    @Patch('schemes/:schemeId')
    async updateScheme(
        @Param('schemeId') schemeId: string,
        @Body() dto: UpdateDuesSchemeDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.financeService.updateScheme(user.id, schemeId, dto);
    }

    @Delete('schemes/:schemeId')
    async deleteScheme(
        @Param('schemeId') schemeId: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        await this.financeService.deleteScheme(user.id, schemeId);
        return { success: true };
    }

    @Post('schemes/:schemeId/generate')
    async generateScheme(
        @Param('schemeId') schemeId: string,
        @Body() dto: GenerateSchemeInvoicesDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.financeService.generateSchemeInvoices(
            user.id,
            schemeId,
            dto.year,
        );
    }

    @Get('invoices/:userId')
    invoices(
        @Param('userId') userId: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        this.ensureSelf(user, userId);
        return this.financeService.listInvoices(userId);
    }

    @Get('admin/summary')
    async adminSummary(@CurrentUser() user: AuthenticatedUser) {
        return this.financeService.getAdminSummary(user.id);
    }

    @Get('projects')
    listProjects(@CurrentUser() user: AuthenticatedUser) {
        return this.financeService.listProjects(user.id);
    }

    @Post('projects')
    createProject(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateProjectDto,
    ) {
        return this.financeService.createProject(user.id, dto);
    }

    @Patch('projects/:projectId')
    updateProject(
        @CurrentUser() user: AuthenticatedUser,
        @Param('projectId') projectId: string,
        @Body() dto: UpdateProjectDto,
    ) {
        return this.financeService.updateProject(user.id, projectId, dto);
    }

    @Delete('projects/:projectId')
    async deleteProject(
        @CurrentUser() user: AuthenticatedUser,
        @Param('projectId') projectId: string,
    ) {
        await this.financeService.deleteProject(user.id, projectId);
        return { success: true };
    }

    @Get('expenses')
    listExpenses(@CurrentUser() user: AuthenticatedUser) {
        return this.financeService.listExpenses(user.id);
    }

    @Post('expenses')
    createExpense(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateExpenseDto,
    ) {
        return this.financeService.createExpense(user.id, dto);
    }

    @Patch('expenses/:expenseId')
    updateExpense(
        @CurrentUser() user: AuthenticatedUser,
        @Param('expenseId') expenseId: string,
        @Body() dto: UpdateExpenseDto,
    ) {
        return this.financeService.updateExpense(user.id, expenseId, dto);
    }

    @Post('expenses/:expenseId/approve-first')
    approveExpenseFirst(
        @CurrentUser() user: AuthenticatedUser,
        @Param('expenseId') expenseId: string,
    ) {
        return this.financeService.approveExpenseFirst(user.id, expenseId);
    }

    @Post('expenses/:expenseId/approve-final')
    approveExpenseFinal(
        @CurrentUser() user: AuthenticatedUser,
        @Param('expenseId') expenseId: string,
    ) {
        return this.financeService.approveExpenseFinal(user.id, expenseId);
    }

    @Post('expenses/:expenseId/reject')
    rejectExpense(
        @CurrentUser() user: AuthenticatedUser,
        @Param('expenseId') expenseId: string,
    ) {
        return this.financeService.rejectExpense(user.id, expenseId);
    }

    @Delete('expenses/:expenseId')
    async deleteExpense(
        @CurrentUser() user: AuthenticatedUser,
        @Param('expenseId') expenseId: string,
    ) {
        await this.financeService.deleteExpense(user.id, expenseId);
        return { success: true };
    }

    @Get('reports/overview')
    async overviewReport(
        @CurrentUser() user: AuthenticatedUser,
        @Query('year') year?: string,
        @Query('month') month?: string,
        @Query('scopeType') scopeType?: string,
        @Query('scopeId') scopeId?: string,
    ) {
        await this.ensureGlobal(user);
        return this.financeService.getOverviewReport({
            year: this.parseYear(year),
            month: this.parseMonth(month),
            scopeType: this.parseScopeType(scopeType),
            scopeId: scopeId ?? null,
        });
    }

    @Get('reports/overview/export')
    async exportOverviewReport(
        @CurrentUser() user: AuthenticatedUser,
        @Query('year') year: string | undefined,
        @Query('month') month: string | undefined,
        @Query('scopeType') scopeType: string | undefined,
        @Query('scopeId') scopeId: string | undefined,
        @Res({ passthrough: true }) response: Response,
    ): Promise<StreamableFile> {
        await this.ensureGlobal(user);
        const file = await this.financeService.exportOverviewReportCsv({
            year: this.parseYear(year),
            month: this.parseMonth(month),
            scopeType: this.parseScopeType(scopeType),
            scopeId: scopeId ?? null,
        });
        response.setHeader(
            'Content-Disposition',
            `attachment; filename="${file.filename}"`,
        );
        response.setHeader('Content-Type', 'text/csv; charset=utf-8');
        const stream = Readable.from([file.content]);
        return new StreamableFile(stream);
    }

    @Get('reports/scopes')
    scopedReportScopes(@CurrentUser() user: AuthenticatedUser) {
        return this.financeService.getReportScopeAccess(user.id);
    }

    @Get('reports/scoped')
    scopedOverviewReport(
        @CurrentUser() user: AuthenticatedUser,
        @Query('year') year?: string,
        @Query('month') month?: string,
        @Query('scopeType') scopeType?: string,
        @Query('scopeId') scopeId?: string,
    ) {
        return this.financeService.getScopedOverviewReport(user.id, {
            year: this.parseYear(year),
            month: this.parseMonth(month),
            scopeType: this.parseScopeType(scopeType),
            scopeId: scopeId ?? null,
        });
    }

    @Get('reports/scoped/export')
    async exportScopedOverviewReport(
        @CurrentUser() user: AuthenticatedUser,
        @Query('year') year: string | undefined,
        @Query('month') month: string | undefined,
        @Query('scopeType') scopeType: string | undefined,
        @Query('scopeId') scopeId: string | undefined,
        @Res({ passthrough: true }) response: Response,
    ): Promise<StreamableFile> {
        const file = await this.financeService.exportScopedOverviewReportCsv(
            user.id,
            {
                year: this.parseYear(year),
                month: this.parseMonth(month),
                scopeType: this.parseScopeType(scopeType),
                scopeId: scopeId ?? null,
            },
        );
        response.setHeader(
            'Content-Disposition',
            `attachment; filename="${file.filename}"`,
        );
        response.setHeader('Content-Type', 'text/csv; charset=utf-8');
        const stream = Readable.from([file.content]);
        return new StreamableFile(stream);
    }

    @Post('reports/snapshots/capture')
    async captureSnapshots(
        @CurrentUser() user: AuthenticatedUser,
        @Body() body: { year?: number; month?: number },
    ) {
        return this.financeService.captureMonthlySnapshots(
            user.id,
            body.year,
            body.month,
        );
    }

    @Get('reports/snapshots')
    listSnapshots(
        @CurrentUser() user: AuthenticatedUser,
        @Query('scopeType') scopeType?: string,
        @Query('scopeId') scopeId?: string,
        @Query('limit') limit?: string,
    ) {
        const parsedLimit = limit ? Number(limit) : undefined;
        return this.financeService.listReportSnapshots(user.id, {
            scopeType: this.parseScopeType(scopeType),
            scopeId: scopeId ?? null,
            limit: Number.isInteger(parsedLimit) ? parsedLimit : undefined,
        });
    }

    @Get('outstanding/:userId')
    outstanding(
        @Param('userId') userId: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        this.ensureSelf(user, userId);
        return this.financeService.listOutstandingInvoices(userId);
    }

    @Post('invoices')
    async createInvoice(
        @Body() dto: CreateInvoiceDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.financeService.createInvoice(user.id, dto);
    }

    @Get('payments')
    async listPayments(@CurrentUser() user: AuthenticatedUser) {
        return this.financeService.listPayments(user.id);
    }

    @Post('payments')
    async recordPayment(
        @Body() dto: RecordPaymentDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.financeService.recordPayment(user.id, dto);
    }

    @Get('payments/:paymentId/receipt')
    getReceipt(
        @CurrentUser() user: AuthenticatedUser,
        @Param('paymentId') paymentId: string,
    ) {
        return this.financeService.getPaymentReceipt(user.id, paymentId);
    }

    @Get('payments/:paymentId/receipt/download')
    async downloadReceipt(
        @CurrentUser() user: AuthenticatedUser,
        @Param('paymentId') paymentId: string,
        @Res({ passthrough: true }) response: Response,
    ): Promise<StreamableFile> {
        const file = await this.financeService.getPaymentReceiptFile(
            user.id,
            paymentId,
        );
        response.setHeader(
            'Content-Disposition',
            `attachment; filename="${file.filename}"`,
        );
        response.setHeader('Content-Type', 'text/plain');
        const stream = Readable.from([file.content]);
        return new StreamableFile(stream);
    }

    @Get('ledger/members/:memberId')
    memberLedger(
        @CurrentUser() user: AuthenticatedUser,
        @Param('memberId') memberId: string,
    ) {
        return this.financeService.getMemberLedger(user.id, memberId);
    }

    @Get('ledger/classes/:classId')
    classLedger(
        @CurrentUser() user: AuthenticatedUser,
        @Param('classId') classId: string,
        @Query('year') year?: string,
    ) {
        const parsedYear = year ? Number(year) : undefined;
        return this.financeService.getClassLedger(user.id, classId, parsedYear);
    }

    private async ensureGlobal(user?: AuthenticatedUser) {
        if (!user) {
            throw new ForbiddenException('Not authorized');
        }
        const hasAccess = await this.roleAssignmentsService.hasGlobalAccess(
            user.id,
        );
        if (!hasAccess) {
            throw new ForbiddenException('Not authorized');
        }
    }

    private ensureSelf(user: AuthenticatedUser | undefined, userId: string) {
        if (!user || user.id !== userId) {
            throw new ForbiddenException(
                'Cannot view invoices for another member',
            );
        }
    }

    private parseYear(year?: string) {
        if (!year) {
            return undefined;
        }
        const parsed = Number(year);
        if (!Number.isInteger(parsed)) {
            throw new BadRequestException('Invalid year');
        }
        return parsed;
    }

    private parseMonth(month?: string) {
        if (!month) {
            return undefined;
        }
        const parsed = Number(month);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
            throw new BadRequestException('Invalid month');
        }
        return parsed;
    }

    private parseScopeType(scopeType?: string) {
        if (!scopeType) {
            return undefined;
        }
        if (
            scopeType === 'global' ||
            scopeType === 'branch' ||
            scopeType === 'class'
        ) {
            return scopeType;
        }
        throw new BadRequestException('Invalid scopeType');
    }
}
