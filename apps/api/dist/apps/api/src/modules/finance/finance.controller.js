"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const node_stream_1 = require("node:stream");
const finance_service_1 = require("./finance.service");
const invoice_dto_1 = require("./dto/invoice.dto");
const record_payment_dto_1 = require("./dto/record-payment.dto");
const dues_scheme_dto_1 = require("./dto/dues-scheme.dto");
const project_dto_1 = require("./dto/project.dto");
const expense_dto_1 = require("./dto/expense.dto");
const require_active_decorator_1 = require("../../auth/require-active.decorator");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
let FinanceController = class FinanceController {
    financeService;
    roleAssignmentsService;
    constructor(financeService, roleAssignmentsService) {
        this.financeService = financeService;
        this.roleAssignmentsService = roleAssignmentsService;
    }
    listSchemes(user, status) {
        const includeInactive = status === 'all';
        return this.financeService.listSchemes(user.id, !includeInactive);
    }
    async createScheme(dto, user) {
        return this.financeService.createScheme(user.id, dto);
    }
    async updateScheme(schemeId, dto, user) {
        return this.financeService.updateScheme(user.id, schemeId, dto);
    }
    async deleteScheme(schemeId, user) {
        await this.financeService.deleteScheme(user.id, schemeId);
        return { success: true };
    }
    async generateScheme(schemeId, dto, user) {
        return this.financeService.generateSchemeInvoices(user.id, schemeId, dto.year);
    }
    invoices(userId, user) {
        this.ensureSelf(user, userId);
        return this.financeService.listInvoices(userId);
    }
    async adminSummary(user) {
        return this.financeService.getAdminSummary(user.id);
    }
    listProjects(user) {
        return this.financeService.listProjects(user.id);
    }
    createProject(user, dto) {
        return this.financeService.createProject(user.id, dto);
    }
    updateProject(user, projectId, dto) {
        return this.financeService.updateProject(user.id, projectId, dto);
    }
    async deleteProject(user, projectId) {
        await this.financeService.deleteProject(user.id, projectId);
        return { success: true };
    }
    listExpenses(user) {
        return this.financeService.listExpenses(user.id);
    }
    createExpense(user, dto) {
        return this.financeService.createExpense(user.id, dto);
    }
    updateExpense(user, expenseId, dto) {
        return this.financeService.updateExpense(user.id, expenseId, dto);
    }
    approveExpenseFirst(user, expenseId) {
        return this.financeService.approveExpenseFirst(user.id, expenseId);
    }
    approveExpenseFinal(user, expenseId) {
        return this.financeService.approveExpenseFinal(user.id, expenseId);
    }
    rejectExpense(user, expenseId) {
        return this.financeService.rejectExpense(user.id, expenseId);
    }
    async deleteExpense(user, expenseId) {
        await this.financeService.deleteExpense(user.id, expenseId);
        return { success: true };
    }
    async overviewReport(user, year, month, scopeType, scopeId) {
        await this.ensureGlobal(user);
        return this.financeService.getOverviewReport({
            year: this.parseYear(year),
            month: this.parseMonth(month),
            scopeType: this.parseScopeType(scopeType),
            scopeId: scopeId ?? null,
        });
    }
    async exportOverviewReport(user, year, month, scopeType, scopeId, response) {
        await this.ensureGlobal(user);
        const file = await this.financeService.exportOverviewReportCsv({
            year: this.parseYear(year),
            month: this.parseMonth(month),
            scopeType: this.parseScopeType(scopeType),
            scopeId: scopeId ?? null,
        });
        response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        response.setHeader('Content-Type', 'text/csv; charset=utf-8');
        const stream = node_stream_1.Readable.from([file.content]);
        return new common_1.StreamableFile(stream);
    }
    scopedReportScopes(user) {
        return this.financeService.getReportScopeAccess(user.id);
    }
    scopedOverviewReport(user, year, month, scopeType, scopeId) {
        return this.financeService.getScopedOverviewReport(user.id, {
            year: this.parseYear(year),
            month: this.parseMonth(month),
            scopeType: this.parseScopeType(scopeType),
            scopeId: scopeId ?? null,
        });
    }
    async exportScopedOverviewReport(user, year, month, scopeType, scopeId, response) {
        const file = await this.financeService.exportScopedOverviewReportCsv(user.id, {
            year: this.parseYear(year),
            month: this.parseMonth(month),
            scopeType: this.parseScopeType(scopeType),
            scopeId: scopeId ?? null,
        });
        response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        response.setHeader('Content-Type', 'text/csv; charset=utf-8');
        const stream = node_stream_1.Readable.from([file.content]);
        return new common_1.StreamableFile(stream);
    }
    async captureSnapshots(user, body) {
        return this.financeService.captureMonthlySnapshots(user.id, body.year, body.month);
    }
    listSnapshots(user, scopeType, scopeId, limit) {
        const parsedLimit = limit ? Number(limit) : undefined;
        return this.financeService.listReportSnapshots(user.id, {
            scopeType: this.parseScopeType(scopeType),
            scopeId: scopeId ?? null,
            limit: Number.isInteger(parsedLimit) ? parsedLimit : undefined,
        });
    }
    outstanding(userId, user) {
        this.ensureSelf(user, userId);
        return this.financeService.listOutstandingInvoices(userId);
    }
    async createInvoice(dto, user) {
        return this.financeService.createInvoice(user.id, dto);
    }
    async listPayments(user) {
        return this.financeService.listPayments(user.id);
    }
    async recordPayment(dto, user) {
        return this.financeService.recordPayment(user.id, dto);
    }
    getReceipt(user, paymentId) {
        return this.financeService.getPaymentReceipt(user.id, paymentId);
    }
    async downloadReceipt(user, paymentId, response) {
        const file = await this.financeService.getPaymentReceiptFile(user.id, paymentId);
        response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        response.setHeader('Content-Type', 'text/plain');
        const stream = node_stream_1.Readable.from([file.content]);
        return new common_1.StreamableFile(stream);
    }
    memberLedger(user, memberId) {
        return this.financeService.getMemberLedger(user.id, memberId);
    }
    classLedger(user, classId, year) {
        const parsedYear = year ? Number(year) : undefined;
        return this.financeService.getClassLedger(user.id, classId, parsedYear);
    }
    async ensureGlobal(user) {
        if (!user) {
            throw new common_1.ForbiddenException('Not authorized');
        }
        const hasAccess = await this.roleAssignmentsService.hasGlobalAccess(user.id);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Not authorized');
        }
    }
    ensureSelf(user, userId) {
        if (!user || user.id !== userId) {
            throw new common_1.ForbiddenException('Cannot view invoices for another member');
        }
    }
    parseYear(year) {
        if (!year) {
            return undefined;
        }
        const parsed = Number(year);
        if (!Number.isInteger(parsed)) {
            throw new common_1.BadRequestException('Invalid year');
        }
        return parsed;
    }
    parseMonth(month) {
        if (!month) {
            return undefined;
        }
        const parsed = Number(month);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
            throw new common_1.BadRequestException('Invalid month');
        }
        return parsed;
    }
    parseScopeType(scopeType) {
        if (!scopeType) {
            return undefined;
        }
        if (scopeType === 'global' ||
            scopeType === 'branch' ||
            scopeType === 'class') {
            return scopeType;
        }
        throw new common_1.BadRequestException('Invalid scopeType');
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Get)('schemes'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "listSchemes", null);
__decorate([
    (0, common_1.Post)('schemes'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dues_scheme_dto_1.CreateDuesSchemeDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createScheme", null);
__decorate([
    (0, common_1.Patch)('schemes/:schemeId'),
    __param(0, (0, common_1.Param)('schemeId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dues_scheme_dto_1.UpdateDuesSchemeDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "updateScheme", null);
__decorate([
    (0, common_1.Delete)('schemes/:schemeId'),
    __param(0, (0, common_1.Param)('schemeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "deleteScheme", null);
__decorate([
    (0, common_1.Post)('schemes/:schemeId/generate'),
    __param(0, (0, common_1.Param)('schemeId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dues_scheme_dto_1.GenerateSchemeInvoicesDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "generateScheme", null);
__decorate([
    (0, common_1.Get)('invoices/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "invoices", null);
__decorate([
    (0, common_1.Get)('admin/summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "adminSummary", null);
__decorate([
    (0, common_1.Get)('projects'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "listProjects", null);
__decorate([
    (0, common_1.Post)('projects'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, project_dto_1.CreateProjectDto]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "createProject", null);
__decorate([
    (0, common_1.Patch)('projects/:projectId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, project_dto_1.UpdateProjectDto]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "updateProject", null);
__decorate([
    (0, common_1.Delete)('projects/:projectId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "deleteProject", null);
__decorate([
    (0, common_1.Get)('expenses'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "listExpenses", null);
__decorate([
    (0, common_1.Post)('expenses'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, expense_dto_1.CreateExpenseDto]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "createExpense", null);
__decorate([
    (0, common_1.Patch)('expenses/:expenseId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('expenseId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, expense_dto_1.UpdateExpenseDto]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "updateExpense", null);
__decorate([
    (0, common_1.Post)('expenses/:expenseId/approve-first'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('expenseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "approveExpenseFirst", null);
__decorate([
    (0, common_1.Post)('expenses/:expenseId/approve-final'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('expenseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "approveExpenseFinal", null);
__decorate([
    (0, common_1.Post)('expenses/:expenseId/reject'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('expenseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "rejectExpense", null);
__decorate([
    (0, common_1.Delete)('expenses/:expenseId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('expenseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "deleteExpense", null);
__decorate([
    (0, common_1.Get)('reports/overview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __param(3, (0, common_1.Query)('scopeType')),
    __param(4, (0, common_1.Query)('scopeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "overviewReport", null);
__decorate([
    (0, common_1.Get)('reports/overview/export'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __param(3, (0, common_1.Query)('scopeType')),
    __param(4, (0, common_1.Query)('scopeId')),
    __param(5, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "exportOverviewReport", null);
__decorate([
    (0, common_1.Get)('reports/scopes'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "scopedReportScopes", null);
__decorate([
    (0, common_1.Get)('reports/scoped'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __param(3, (0, common_1.Query)('scopeType')),
    __param(4, (0, common_1.Query)('scopeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "scopedOverviewReport", null);
__decorate([
    (0, common_1.Get)('reports/scoped/export'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __param(3, (0, common_1.Query)('scopeType')),
    __param(4, (0, common_1.Query)('scopeId')),
    __param(5, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "exportScopedOverviewReport", null);
__decorate([
    (0, common_1.Post)('reports/snapshots/capture'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "captureSnapshots", null);
__decorate([
    (0, common_1.Get)('reports/snapshots'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('scopeType')),
    __param(2, (0, common_1.Query)('scopeId')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "listSnapshots", null);
__decorate([
    (0, common_1.Get)('outstanding/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "outstanding", null);
__decorate([
    (0, common_1.Post)('invoices'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invoice_dto_1.CreateInvoiceDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.Get)('payments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "listPayments", null);
__decorate([
    (0, common_1.Post)('payments'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [record_payment_dto_1.RecordPaymentDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.Get)('payments/:paymentId/receipt'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('paymentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "getReceipt", null);
__decorate([
    (0, common_1.Get)('payments/:paymentId/receipt/download'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('paymentId')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "downloadReceipt", null);
__decorate([
    (0, common_1.Get)('ledger/members/:memberId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('memberId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "memberLedger", null);
__decorate([
    (0, common_1.Get)('ledger/classes/:classId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('classId')),
    __param(2, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "classLedger", null);
exports.FinanceController = FinanceController = __decorate([
    (0, common_1.Controller)('finance'),
    (0, require_active_decorator_1.RequireActive)(),
    __metadata("design:paramtypes", [finance_service_1.FinanceService,
        role_assignments_service_1.RoleAssignmentsService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map