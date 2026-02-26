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
exports.FinanceService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const dues_scheme_schema_1 = require("./schemas/dues-scheme.schema");
const dues_invoice_schema_1 = require("./schemas/dues-invoice.schema");
const payment_schema_1 = require("./schemas/payment.schema");
const payment_receipt_schema_1 = require("./schemas/payment-receipt.schema");
const finance_report_snapshot_schema_1 = require("./schemas/finance-report-snapshot.schema");
const project_schema_1 = require("./schemas/project.schema");
const expense_schema_1 = require("./schemas/expense.schema");
const users_service_1 = require("../users/users.service");
const memberships_service_1 = require("../memberships/memberships.service");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
const branches_service_1 = require("../branches/branches.service");
const classes_service_1 = require("../classes/classes.service");
const roles_service_1 = require("../roles/roles.service");
const welfare_contribution_schema_1 = require("../welfare/schemas/welfare-contribution.schema");
const welfare_payout_schema_1 = require("../welfare/schemas/welfare-payout.schema");
const notifications_service_1 = require("../notifications/notifications.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
let FinanceService = class FinanceService {
    schemeModel;
    invoiceModel;
    paymentModel;
    receiptModel;
    snapshotModel;
    projectModel;
    expenseModel;
    welfareContributionModel;
    welfarePayoutModel;
    usersService;
    membershipsService;
    roleAssignmentsService;
    branchesService;
    classesService;
    rolesService;
    notificationsService;
    auditLogsService;
    constructor(schemeModel, invoiceModel, paymentModel, receiptModel, snapshotModel, projectModel, expenseModel, welfareContributionModel, welfarePayoutModel, usersService, membershipsService, roleAssignmentsService, branchesService, classesService, rolesService, notificationsService, auditLogsService) {
        this.schemeModel = schemeModel;
        this.invoiceModel = invoiceModel;
        this.paymentModel = paymentModel;
        this.receiptModel = receiptModel;
        this.snapshotModel = snapshotModel;
        this.projectModel = projectModel;
        this.expenseModel = expenseModel;
        this.welfareContributionModel = welfareContributionModel;
        this.welfarePayoutModel = welfarePayoutModel;
        this.usersService = usersService;
        this.membershipsService = membershipsService;
        this.roleAssignmentsService = roleAssignmentsService;
        this.branchesService = branchesService;
        this.classesService = classesService;
        this.rolesService = rolesService;
        this.notificationsService = notificationsService;
        this.auditLogsService = auditLogsService;
    }
    mapSchemeRef(populated) {
        if (populated &&
            typeof populated === 'object' &&
            '_id' in populated &&
            'title' in populated) {
            const record = populated;
            return {
                id: record._id?.toString?.() ?? '',
                title: record.title ?? 'Scheme',
            };
        }
        return undefined;
    }
    getPopulatedScheme(populated) {
        if (populated &&
            typeof populated === 'object' &&
            '_id' in populated &&
            'title' in populated) {
            return populated;
        }
        return null;
    }
    getCreatedAtIso(row) {
        const createdAt = row.createdAt;
        return createdAt?.toISOString();
    }
    toSchemeDto(doc) {
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
    toInvoiceDto(doc, scheme, userName) {
        const paidAmount = doc.paidAmount ?? 0;
        const balance = Math.max(doc.amount - paidAmount, 0);
        return {
            id: doc._id.toString(),
            userId: doc.userId,
            userName,
            amount: doc.amount,
            currency: doc.currency,
            status: doc.status,
            periodStart: doc.periodStart?.toISOString(),
            scheme,
            paidAmount,
            balance,
        };
    }
    async buildUserNameMap(userIds) {
        if (userIds.length === 0) {
            return new Map();
        }
        const users = await this.usersService.findManyByIds(userIds);
        const map = new Map();
        users.forEach((user) => {
            map.set(user.id, user.name);
        });
        return map;
    }
    toPaymentDto(payment) {
        return {
            id: payment._id.toString(),
            payerUserId: payment.payerUserId,
            amount: payment.amount,
            currency: payment.currency,
            channel: payment.channel,
            reference: payment.reference,
            scopeType: payment.scopeType,
            scopeId: payment.scopeId ?? null,
            notes: payment.notes,
            status: payment.status ?? 'completed',
            paidAt: payment.paidAt?.toISOString(),
            applications: payment.applications?.map((application) => ({
                invoiceId: application.invoiceId.toString(),
                amount: application.amount,
            })) ?? [],
        };
    }
    toProjectDto(project, ownerName) {
        return {
            id: project._id.toString(),
            name: project.name,
            scopeType: project.scope_type,
            scopeId: project.scope_id ?? null,
            budget: project.budget ?? null,
            actualSpend: project.actual_spend ?? 0,
            startDate: project.start_date?.toISOString() ?? null,
            endDate: project.end_date?.toISOString() ?? null,
            status: project.status ?? 'planning',
            ownerId: project.owner_id ?? null,
            ownerName,
        };
    }
    toExpenseDto(expense, userNameMap, projectNameMap) {
        const projectId = expense.project_id?.toString() ?? null;
        const submittedBy = expense.submitted_by ?? null;
        const submittedByName = submittedBy
            ? userNameMap.get(submittedBy)
            : undefined;
        return {
            id: expense._id.toString(),
            scopeType: expense.scope_type,
            scopeId: expense.scope_id ?? null,
            projectId,
            projectName: projectId ? projectNameMap.get(projectId) : undefined,
            title: expense.title,
            description: expense.description ?? null,
            notes: expense.notes ?? null,
            amount: expense.amount,
            currency: expense.currency ?? 'NGN',
            status: expense.status ?? 'pending',
            approvalStage: expense.approval_stage ?? 'pending',
            submittedBy,
            submittedByName,
            approvedBy: expense.approved_by ?? null,
            approvedAt: expense.approved_at?.toISOString() ?? null,
            firstApprovedBy: expense.first_approved_by ?? null,
            firstApprovedAt: expense.first_approved_at?.toISOString() ?? null,
            secondApprovedBy: expense.second_approved_by ?? null,
            secondApprovedAt: expense.second_approved_at?.toISOString() ?? null,
            rejectedBy: expense.rejected_by ?? null,
            rejectedAt: expense.rejected_at?.toISOString() ?? null,
            createdAt: expense.createdAt?.toISOString(),
        };
    }
    async listSchemes(actorId, activeOnly = true) {
        await this.ensureModuleFeatureAccess(actorId, 'dues');
        const scope = await this.loadFinanceScopeAccess(actorId);
        const baseQuery = activeOnly ? { status: 'active' } : {};
        const scopedQuery = this.buildScopedFilter(scope, 'scope_type', 'scope_id');
        const query = scope.hasGlobalAccess
            ? baseQuery
            : { ...baseQuery, ...scopedQuery };
        const docs = await this.schemeModel
            .find(query)
            .sort({ title: 1 })
            .exec();
        return docs.map((doc) => this.toSchemeDto(doc));
    }
    async createScheme(actorId, dto) {
        await this.ensureModuleFeatureAccess(actorId, 'dues', dto.scopeType, dto.scopeId ?? null);
        const scope = await this.loadFinanceScopeAccess(actorId);
        this.validateAndEnsureWritableScope(scope, dto.scopeType, dto.scopeId ?? null);
        await this.validateScope(dto.scopeType, dto.scopeId ?? null);
        const created = await this.schemeModel.create({
            title: dto.title,
            amount: dto.amount,
            currency: dto.currency,
            frequency: dto.frequency,
            scope_type: dto.scopeType,
            scope_id: dto.scopeType === 'global' ? null : dto.scopeId,
            status: dto.status ?? 'active',
        });
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_scheme.created',
            resourceType: 'dues_scheme',
            resourceId: created._id.toString(),
            scopeType: created.scope_type,
            scopeId: created.scope_id ?? null,
            metadata: {
                title: created.title,
                amount: created.amount,
                currency: created.currency,
                frequency: created.frequency,
                status: created.status,
            },
        });
        return this.toSchemeDto(created);
    }
    async updateScheme(actorId, schemeId, dto) {
        const scheme = await this.schemeModel.findById(schemeId).exec();
        if (!scheme) {
            throw new common_1.NotFoundException('Dues scheme not found');
        }
        const scope = await this.loadFinanceScopeAccess(actorId);
        this.ensureReadableScope(scope, scheme.scope_type, scheme.scope_id);
        await this.ensureModuleFeatureAccess(actorId, 'dues', scheme.scope_type, scheme.scope_id ?? null);
        const nextScopeType = dto.scopeType ?? scheme.scope_type;
        const nextScopeId = nextScopeType === 'global'
            ? null
            : dto.scopeId !== undefined
                ? dto.scopeId
                : (scheme.scope_id ?? null);
        if (dto.scopeType !== undefined || dto.scopeId !== undefined) {
            this.validateAndEnsureWritableScope(scope, nextScopeType, nextScopeId ?? null);
            await this.validateScope(nextScopeType, nextScopeId ?? null);
        }
        if (dto.title !== undefined) {
            scheme.title = dto.title;
        }
        if (dto.amount !== undefined) {
            scheme.amount = dto.amount;
        }
        if (dto.currency !== undefined) {
            scheme.currency = dto.currency;
        }
        if (dto.frequency !== undefined) {
            scheme.frequency = dto.frequency;
        }
        if (dto.scopeType !== undefined) {
            scheme.scope_type = dto.scopeType;
        }
        if (dto.scopeType === 'global') {
            scheme.scope_id = null;
        }
        else if (dto.scopeId !== undefined) {
            scheme.scope_id = dto.scopeId;
        }
        if (dto.status !== undefined) {
            scheme.status = dto.status;
        }
        await scheme.save();
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_scheme.updated',
            resourceType: 'dues_scheme',
            resourceId: scheme._id.toString(),
            scopeType: scheme.scope_type,
            scopeId: scheme.scope_id ?? null,
            metadata: {
                title: scheme.title,
                amount: scheme.amount,
                currency: scheme.currency,
                frequency: scheme.frequency,
                status: scheme.status,
            },
        });
        return this.toSchemeDto(scheme);
    }
    async deleteScheme(actorId, schemeId) {
        const scheme = await this.schemeModel.findById(schemeId).exec();
        if (!scheme) {
            throw new common_1.NotFoundException('Dues scheme not found');
        }
        const scope = await this.loadFinanceScopeAccess(actorId);
        this.ensureReadableScope(scope, scheme.scope_type, scheme.scope_id);
        await this.ensureModuleFeatureAccess(actorId, 'dues', scheme.scope_type, scheme.scope_id ?? null);
        const deleted = await this.schemeModel
            .findByIdAndDelete(schemeId)
            .exec();
        if (!deleted) {
            throw new common_1.NotFoundException('Dues scheme not found');
        }
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_scheme.deleted',
            resourceType: 'dues_scheme',
            resourceId: deleted._id.toString(),
            scopeType: deleted.scope_type,
            scopeId: deleted.scope_id ?? null,
            metadata: {
                title: deleted.title,
            },
        });
    }
    async generateSchemeInvoices(actorId, schemeId, year) {
        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            throw new common_1.BadRequestException('Invalid year');
        }
        const scheme = await this.schemeModel.findById(schemeId).exec();
        if (!scheme) {
            throw new common_1.NotFoundException('Dues scheme not found');
        }
        const scope = await this.loadFinanceScopeAccess(actorId);
        this.ensureReadableScope(scope, scheme.scope_type, scheme.scope_id);
        await this.ensureModuleFeatureAccess(actorId, 'dues', scheme.scope_type, scheme.scope_id ?? null);
        if (scheme.status !== 'active') {
            throw new common_1.BadRequestException('Only active schemes can generate invoices');
        }
        const userIds = await this.resolveSchemeTargetUserIds(scheme);
        const periods = this.buildSchemePeriods(scheme.frequency, year);
        if (userIds.length === 0 || periods.length === 0) {
            return {
                schemeId,
                year,
                members: userIds.length,
                periods: periods.length,
                created: 0,
                skipped: 0,
            };
        }
        const starts = periods.map((period) => period.start);
        const existing = await this.invoiceModel
            .find({
            schemeId: scheme._id,
            userId: { $in: userIds },
            periodStart: { $in: starts },
        })
            .select('userId periodStart')
            .lean()
            .exec();
        const existingKeys = new Set(existing
            .filter((row) => Boolean(row.periodStart))
            .map((row) => `${row.userId}|${row.periodStart?.toISOString() ?? ''}`));
        const rowsToCreate = [];
        let skipped = 0;
        userIds.forEach((userId) => {
            periods.forEach((period) => {
                const key = `${userId}|${period.start.toISOString()}`;
                if (existingKeys.has(key)) {
                    skipped += 1;
                    return;
                }
                rowsToCreate.push({
                    schemeId: scheme._id,
                    userId,
                    amount: scheme.amount,
                    currency: scheme.currency,
                    periodStart: period.start,
                    periodEnd: period.end,
                    status: 'unpaid',
                    paidAmount: 0,
                });
            });
        });
        if (rowsToCreate.length > 0) {
            await this.invoiceModel.insertMany(rowsToCreate);
            const targetUsers = [
                ...new Set(rowsToCreate.map((row) => row.userId)),
            ];
            await this.notificationsService.createForUsers(targetUsers, {
                title: `New dues invoices for ${year}`,
                message: `Your dues invoices for "${scheme.title}" have been generated.`,
                type: 'action_required',
                metadata: {
                    schemeId: scheme._id.toString(),
                    year,
                    count: rowsToCreate.length,
                },
            });
        }
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_invoices.generated',
            resourceType: 'dues_scheme',
            resourceId: scheme._id.toString(),
            scopeType: scheme.scope_type,
            scopeId: scheme.scope_id ?? null,
            metadata: {
                year,
                members: userIds.length,
                periods: periods.length,
                created: rowsToCreate.length,
                skipped,
            },
        });
        return {
            schemeId,
            year,
            members: userIds.length,
            periods: periods.length,
            created: rowsToCreate.length,
            skipped,
        };
    }
    async validateScope(scopeType, scopeId) {
        if (scopeType === 'global') {
            return;
        }
        if (!scopeId) {
            throw new common_1.BadRequestException(`scopeId is required for ${scopeType} schemes`);
        }
        if (scopeType === 'branch') {
            const exists = await this.branchesService.exists(scopeId);
            if (!exists) {
                throw new common_1.BadRequestException('Branch not found for scopeId');
            }
            return;
        }
        const exists = await this.classesService.exists(scopeId);
        if (!exists) {
            throw new common_1.BadRequestException('Class not found for scopeId');
        }
    }
    async resolveSchemeTargetUserIds(scheme) {
        const activeUserIds = await this.usersService.listActiveUserIds();
        const activeSet = new Set(activeUserIds);
        if (scheme.scope_type === 'global') {
            throw new common_1.BadRequestException('Global dues cannot be generated directly to members. Use branch or class scope.');
        }
        if (!scheme.scope_id) {
            throw new common_1.BadRequestException('Scheme scope is missing scope_id');
        }
        if (scheme.scope_type === 'class') {
            const classUserIds = await this.membershipsService.listUserIdsByClass(scheme.scope_id);
            return classUserIds.filter((id) => activeSet.has(id));
        }
        const branchUserIds = await this.membershipsService.listApprovedUserIdsByBranch(scheme.scope_id);
        return branchUserIds.filter((id) => activeSet.has(id));
    }
    buildSchemePeriods(frequency, year) {
        if (frequency === 'monthly') {
            return Array.from({ length: 12 }, (_, index) => ({
                start: this.utcDate(year, index, 1),
                end: this.utcDate(year, index + 1, 0),
            }));
        }
        if (frequency === 'quarterly') {
            return [0, 3, 6, 9].map((month) => ({
                start: this.utcDate(year, month, 1),
                end: this.utcDate(year, month + 3, 0),
            }));
        }
        if (frequency === 'annual') {
            return [
                {
                    start: this.utcDate(year, 0, 1),
                    end: this.utcDate(year, 11, 31),
                },
            ];
        }
        return [
            {
                start: this.utcDate(year, 0, 1),
                end: this.utcDate(year, 0, 1),
            },
        ];
    }
    utcDate(year, month, day) {
        return new Date(Date.UTC(year, month, day));
    }
    async toInvoicesWithUsers(docs) {
        const userNameMap = await this.buildUserNameMap([
            ...new Set(docs.map((doc) => doc.userId)),
        ]);
        return docs.map((doc) => this.toInvoiceDto(doc, this.mapSchemeRef(doc.schemeId), userNameMap.get(doc.userId)));
    }
    async listInvoices(userId) {
        const docs = await this.invoiceModel
            .find({ userId })
            .populate('schemeId')
            .exec();
        return this.toInvoicesWithUsers(docs);
    }
    async listOutstandingInvoices(userId) {
        const docs = await this.invoiceModel
            .find({ userId, status: { $in: ['unpaid', 'part_paid'] } })
            .populate('schemeId')
            .exec();
        return this.toInvoicesWithUsers(docs);
    }
    async createInvoice(actorId, dto) {
        const scheme = await this.schemeModel.findById(dto.schemeId).exec();
        if (!scheme) {
            throw new common_1.NotFoundException('Dues scheme not found');
        }
        const scope = await this.loadFinanceScopeAccess(actorId);
        this.ensureReadableScope(scope, scheme.scope_type, scheme.scope_id);
        await this.ensureModuleFeatureAccess(actorId, 'dues', scheme.scope_type, scheme.scope_id ?? null);
        if (scheme.scope_type === 'global') {
            throw new common_1.BadRequestException('Global dues cannot be invoiced directly to members.');
        }
        const schemeScopeId = scheme.scope_id ?? null;
        if (!schemeScopeId) {
            throw new common_1.BadRequestException('Scheme scopeId is required for branch/class invoicing.');
        }
        await this.ensureUserBelongsToScope(dto.userId, scheme.scope_type, schemeScopeId);
        const created = await this.invoiceModel.create({
            schemeId: scheme._id,
            userId: dto.userId,
            amount: dto.amount,
            currency: dto.currency ?? scheme.currency ?? 'NGN',
            status: 'unpaid',
            paidAmount: 0,
        });
        await this.notificationsService.createForUser(dto.userId, {
            title: 'New dues invoice created',
            message: `A new invoice of ${created.amount.toLocaleString()} ${created.currency} has been created for you.`,
            type: 'action_required',
            metadata: {
                invoiceId: created._id.toString(),
                schemeId: scheme._id.toString(),
            },
        });
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_invoice.created',
            resourceType: 'dues_invoice',
            resourceId: created._id.toString(),
            scopeType: scheme.scope_type,
            scopeId: scheme.scope_id ?? null,
            metadata: {
                payerUserId: created.userId,
                amount: created.amount,
                currency: created.currency,
                schemeId: scheme._id.toString(),
            },
        });
        return this.toInvoiceDto(created);
    }
    async recordPayment(actorId, dto) {
        const scope = await this.loadFinanceScopeAccess(actorId);
        const paymentScopeType = dto.scopeType ?? 'global';
        const paymentScopeId = dto.scopeId ?? null;
        this.validateAndEnsureWritableScope(scope, paymentScopeType, paymentScopeId);
        await this.ensureModuleFeatureAccess(actorId, 'payments', paymentScopeType, paymentScopeId);
        if (paymentScopeType === 'global') {
            throw new common_1.BadRequestException('Global payments must be recorded through branch or class scope.');
        }
        if (!paymentScopeId) {
            throw new common_1.BadRequestException('scopeId is required for branch/class payments');
        }
        if (dto.invoiceApplications.length === 0) {
            throw new common_1.BadRequestException('At least one invoice application is required');
        }
        await this.ensureUserBelongsToScope(dto.payerUserId, paymentScopeType, paymentScopeId);
        const invoiceIds = dto.invoiceApplications.map((application) => application.invoiceId);
        const uniqueIds = [...new Set(invoiceIds)];
        const objectIds = uniqueIds.map((id) => new mongoose_2.Types.ObjectId(id));
        const invoices = await this.invoiceModel
            .find({ _id: { $in: objectIds } })
            .exec();
        if (invoices.length !== uniqueIds.length) {
            throw new common_1.NotFoundException('One or more invoices not found');
        }
        const schemeIdStrings = Array.from(new Set(invoices.map((invoice) => invoice.schemeId.toString())));
        const schemes = await this.schemeModel
            .find({
            _id: {
                $in: schemeIdStrings.map((schemeId) => new mongoose_2.Types.ObjectId(schemeId)),
            },
        })
            .exec();
        if (schemes.length !== schemeIdStrings.length) {
            throw new common_1.NotFoundException('One or more invoice schemes not found');
        }
        const schemeMap = new Map(schemes.map((scheme) => [scheme._id.toString(), scheme]));
        const totalApplied = dto.invoiceApplications.reduce((sum, application) => sum + application.amount, 0);
        if (totalApplied - dto.amount > 0.01) {
            throw new common_1.BadRequestException('Applied amount cannot exceed total payment amount');
        }
        const appliedMap = new Map();
        dto.invoiceApplications.forEach((application) => {
            const current = appliedMap.get(application.invoiceId) ?? 0;
            appliedMap.set(application.invoiceId, current + application.amount);
        });
        for (const invoice of invoices) {
            if (invoice.userId !== dto.payerUserId) {
                throw new common_1.BadRequestException('Payment invoices must belong to the selected payer');
            }
            const scheme = schemeMap.get(invoice.schemeId.toString());
            if (!scheme) {
                throw new common_1.NotFoundException('Invoice scheme not found');
            }
            if (scheme.scope_type !== paymentScopeType ||
                (scheme.scope_id ?? null) !== paymentScopeId) {
                throw new common_1.BadRequestException('All payment invoices must match the selected payment scope');
            }
            const applied = appliedMap.get(invoice._id.toString()) ?? 0;
            if (applied <= 0) {
                continue;
            }
            const outstanding = Math.max((invoice.amount ?? 0) - (invoice.paidAmount ?? 0), 0);
            if (applied - outstanding > 0.01) {
                throw new common_1.BadRequestException('Applied amount exceeds invoice outstanding balance');
            }
        }
        const payment = await this.paymentModel.create({
            payerUserId: dto.payerUserId,
            amount: dto.amount,
            currency: dto.currency ?? 'NGN',
            channel: dto.channel,
            reference: dto.reference,
            scopeType: paymentScopeType,
            scopeId: paymentScopeId,
            notes: dto.notes,
            status: 'completed',
            paidAt: new Date(),
            applications: dto.invoiceApplications.map((application) => ({
                invoiceId: new mongoose_2.Types.ObjectId(application.invoiceId),
                amount: application.amount,
            })),
        });
        for (const invoice of invoices) {
            const applied = appliedMap.get(invoice._id.toString()) ?? 0;
            if (applied <= 0) {
                continue;
            }
            const newPaid = (invoice.paidAmount ?? 0) + applied;
            invoice.paidAmount = Number(newPaid.toFixed(2));
            if (invoice.paidAmount + 0.01 >= invoice.amount) {
                invoice.status = 'paid';
                invoice.paidAmount = invoice.amount;
            }
            else if (invoice.paidAmount > 0) {
                invoice.status = 'part_paid';
            }
            await invoice.save();
        }
        await this.notificationsService.createForUser(dto.payerUserId, {
            title: 'Payment recorded',
            message: `Your payment of ${payment.amount.toLocaleString()} ${payment.currency} has been recorded.`,
            type: 'success',
            metadata: {
                paymentId: payment._id.toString(),
                appliedInvoiceCount: dto.invoiceApplications.length,
            },
        });
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_payment.recorded',
            resourceType: 'payment',
            resourceId: payment._id.toString(),
            scopeType: payment.scopeType ?? 'global',
            scopeId: payment.scopeId ?? null,
            metadata: {
                payerUserId: payment.payerUserId,
                amount: payment.amount,
                currency: payment.currency,
                channel: payment.channel,
                invoiceCount: dto.invoiceApplications.length,
            },
        });
        return this.toPaymentDto(payment);
    }
    async listAllInvoices() {
        const docs = await this.invoiceModel
            .find()
            .populate('schemeId')
            .sort({ createdAt: -1 })
            .exec();
        return this.toInvoicesWithUsers(docs);
    }
    async listPayments(actorId) {
        await this.ensureModuleFeatureAccess(actorId, 'payments');
        const scope = await this.loadFinanceScopeAccess(actorId);
        const query = this.buildScopedFilter(scope, 'scopeType', 'scopeId');
        const payments = await this.paymentModel
            .find(query)
            .sort({ paidAt: -1, createdAt: -1 })
            .exec();
        return payments.map((payment) => this.toPaymentDto(payment));
    }
    async listProjects(actorId) {
        await this.ensureModuleFeatureAccess(actorId, 'projects');
        const scope = await this.loadFinanceScopeAccess(actorId);
        return this.listProjectsForScope(scope);
    }
    async createProject(actorId, dto) {
        await this.ensureModuleFeatureAccess(actorId, 'projects', dto.scopeType, dto.scopeId ?? null);
        const scope = await this.loadFinanceScopeAccess(actorId);
        this.validateAndEnsureWritableScope(scope, dto.scopeType, dto.scopeId ?? null);
        await this.validateScope(dto.scopeType, dto.scopeId ?? null);
        const startDate = this.parseDateInput(dto.startDate, 'startDate');
        const endDate = this.parseDateInput(dto.endDate, 'endDate');
        const ownerId = this.resolveProjectOwnerId(scope, actorId, dto.ownerId);
        const created = await this.projectModel.create({
            name: dto.name,
            scope_type: dto.scopeType,
            scope_id: dto.scopeType === 'global' ? null : (dto.scopeId ?? null),
            budget: dto.budget ?? 0,
            actual_spend: 0,
            start_date: startDate ?? undefined,
            end_date: endDate ?? undefined,
            status: dto.status ?? 'planning',
            owner_id: ownerId,
        });
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_project.created',
            resourceType: 'project',
            resourceId: created._id.toString(),
            scopeType: created.scope_type,
            scopeId: created.scope_id ?? null,
            metadata: {
                name: created.name,
                budget: created.budget ?? 0,
                status: created.status,
            },
        });
        const owner = ownerId
            ? await this.usersService.findById(ownerId)
            : null;
        return this.toProjectDto(created, owner?.name);
    }
    async updateProject(actorId, projectId, dto) {
        const project = await this.projectModel.findById(projectId).exec();
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        await this.ensureProjectAccess(actorId, project);
        const scope = await this.loadFinanceScopeAccess(actorId);
        const nextScopeType = dto.scopeType ?? project.scope_type;
        const nextScopeId = nextScopeType === 'global'
            ? null
            : dto.scopeId !== undefined
                ? dto.scopeId
                : (project.scope_id ?? null);
        if (dto.scopeType !== undefined || dto.scopeId !== undefined) {
            this.validateAndEnsureWritableScope(scope, nextScopeType, nextScopeId ?? null);
            await this.validateScope(nextScopeType, nextScopeId ?? null);
            project.scope_type = nextScopeType;
            project.scope_id = nextScopeId ?? null;
        }
        if (dto.name !== undefined) {
            project.name = dto.name;
        }
        if (dto.budget !== undefined) {
            project.budget = dto.budget;
        }
        if (dto.status !== undefined) {
            project.status = dto.status;
        }
        if (dto.startDate !== undefined) {
            const startDate = this.parseDateInput(dto.startDate, 'startDate');
            project.start_date = startDate ?? undefined;
        }
        if (dto.endDate !== undefined) {
            const endDate = this.parseDateInput(dto.endDate, 'endDate');
            project.end_date = endDate ?? undefined;
        }
        if (dto.ownerId !== undefined) {
            project.owner_id = this.resolveProjectOwnerId(scope, actorId, dto.ownerId);
        }
        await project.save();
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_project.updated',
            resourceType: 'project',
            resourceId: project._id.toString(),
            scopeType: project.scope_type,
            scopeId: project.scope_id ?? null,
            metadata: {
                name: project.name,
                budget: project.budget ?? 0,
                status: project.status,
            },
        });
        const owner = project.owner_id
            ? await this.usersService.findById(project.owner_id)
            : null;
        return this.toProjectDto(project, owner?.name);
    }
    async deleteProject(actorId, projectId) {
        const project = await this.projectModel.findById(projectId).exec();
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        await this.ensureProjectAccess(actorId, project);
        await this.expenseModel
            .updateMany({ project_id: project._id }, { $set: { project_id: null } })
            .exec();
        await this.projectModel.findByIdAndDelete(project._id).exec();
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_project.deleted',
            resourceType: 'project',
            resourceId: project._id.toString(),
            scopeType: project.scope_type,
            scopeId: project.scope_id ?? null,
            metadata: {
                name: project.name,
            },
        });
    }
    async listExpenses(actorId) {
        await this.ensureModuleFeatureAccess(actorId, 'expenses');
        const scope = await this.loadFinanceScopeAccess(actorId);
        return this.listExpensesForScope(scope);
    }
    async createExpense(actorId, dto) {
        await this.ensureModuleFeatureAccess(actorId, 'expenses', dto.scopeType, dto.scopeId ?? null);
        const scope = await this.loadFinanceScopeAccess(actorId);
        this.validateAndEnsureWritableScope(scope, dto.scopeType, dto.scopeId ?? null);
        await this.validateScope(dto.scopeType, dto.scopeId ?? null);
        const projectId = await this.validateExpenseProject(dto.projectId, dto.scopeType, dto.scopeId ?? null);
        const created = await this.expenseModel.create({
            scope_type: dto.scopeType,
            scope_id: dto.scopeType === 'global' ? null : (dto.scopeId ?? null),
            project_id: projectId,
            title: dto.title,
            description: dto.description ?? null,
            notes: dto.notes ?? null,
            amount: dto.amount,
            currency: dto.currency ?? 'NGN',
            status: 'pending',
            approval_stage: 'pending',
            submitted_by: actorId,
        });
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_expense.created',
            resourceType: 'expense',
            resourceId: created._id.toString(),
            scopeType: created.scope_type,
            scopeId: created.scope_id ?? null,
            metadata: {
                title: created.title,
                amount: created.amount,
                currency: created.currency,
            },
        });
        await this.notifyExpenseSubmitted(actorId, created);
        const [createdDto] = await this.mapExpenseDocs([created]);
        return createdDto;
    }
    async updateExpense(actorId, expenseId, dto) {
        const expense = await this.expenseModel.findById(expenseId).exec();
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found');
        }
        await this.ensureExpenseAccess(actorId, expense);
        if (expense.approval_stage === 'approved' ||
            expense.approval_stage === 'rejected') {
            throw new common_1.BadRequestException('Finalized expenses cannot be edited');
        }
        const scope = await this.loadFinanceScopeAccess(actorId);
        const nextScopeType = dto.scopeType ?? expense.scope_type;
        const nextScopeId = nextScopeType === 'global'
            ? null
            : dto.scopeId !== undefined
                ? dto.scopeId
                : (expense.scope_id ?? null);
        if (dto.scopeType !== undefined || dto.scopeId !== undefined) {
            this.validateAndEnsureWritableScope(scope, nextScopeType, nextScopeId ?? null);
            await this.validateScope(nextScopeType, nextScopeId ?? null);
            expense.scope_type = nextScopeType;
            expense.scope_id = nextScopeId ?? null;
        }
        if (dto.projectId !== undefined) {
            expense.project_id = await this.validateExpenseProject(dto.projectId, expense.scope_type, expense.scope_id ?? null);
        }
        if (dto.title !== undefined) {
            expense.title = dto.title;
        }
        if (dto.description !== undefined) {
            expense.description = dto.description ?? null;
        }
        if (dto.notes !== undefined) {
            expense.notes = dto.notes ?? null;
        }
        if (dto.amount !== undefined) {
            expense.amount = dto.amount;
        }
        if (dto.currency !== undefined) {
            expense.currency = dto.currency || 'NGN';
        }
        await expense.save();
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_expense.updated',
            resourceType: 'expense',
            resourceId: expense._id.toString(),
            scopeType: expense.scope_type,
            scopeId: expense.scope_id ?? null,
            metadata: {
                title: expense.title,
                amount: expense.amount,
                currency: expense.currency,
            },
        });
        await this.notifyExpenseUpdated(actorId, expense);
        const [dtoExpense] = await this.mapExpenseDocs([expense]);
        return dtoExpense;
    }
    async approveExpenseFirst(actorId, expenseId) {
        const expense = await this.expenseModel.findById(expenseId).exec();
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found');
        }
        await this.ensureExpenseAccess(actorId, expense);
        if (expense.approval_stage !== 'pending') {
            throw new common_1.BadRequestException('Expense is not awaiting first approval');
        }
        expense.approval_stage = 'finance_approved';
        expense.first_approved_by = actorId;
        expense.first_approved_at = new Date();
        await expense.save();
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_expense.first_approved',
            resourceType: 'expense',
            resourceId: expense._id.toString(),
            scopeType: expense.scope_type,
            scopeId: expense.scope_id ?? null,
            metadata: {
                title: expense.title,
                amount: expense.amount,
            },
        });
        await this.notifyExpenseFirstApproved(actorId, expense);
        const [dtoExpense] = await this.mapExpenseDocs([expense]);
        return dtoExpense;
    }
    async approveExpenseFinal(actorId, expenseId) {
        const expense = await this.expenseModel.findById(expenseId).exec();
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found');
        }
        await this.ensureExpenseAccess(actorId, expense);
        if (expense.approval_stage !== 'finance_approved') {
            throw new common_1.BadRequestException('Expense is not awaiting final approval');
        }
        if (expense.first_approved_by === actorId) {
            throw new common_1.BadRequestException('Another approver is required');
        }
        expense.approval_stage = 'approved';
        expense.status = 'approved';
        expense.second_approved_by = actorId;
        expense.second_approved_at = new Date();
        expense.approved_by = actorId;
        expense.approved_at = expense.second_approved_at;
        await expense.save();
        if (expense.project_id) {
            const project = await this.projectModel
                .findById(expense.project_id)
                .exec();
            if (project) {
                project.actual_spend = Number(((project.actual_spend ?? 0) + (expense.amount ?? 0)).toFixed(2));
                await project.save();
            }
        }
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_expense.final_approved',
            resourceType: 'expense',
            resourceId: expense._id.toString(),
            scopeType: expense.scope_type,
            scopeId: expense.scope_id ?? null,
            metadata: {
                title: expense.title,
                amount: expense.amount,
            },
        });
        await this.notifyExpenseFinalApproved(actorId, expense);
        const [dtoExpense] = await this.mapExpenseDocs([expense]);
        return dtoExpense;
    }
    async rejectExpense(actorId, expenseId) {
        const expense = await this.expenseModel.findById(expenseId).exec();
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found');
        }
        await this.ensureExpenseAccess(actorId, expense);
        if (expense.approval_stage === 'approved' ||
            expense.approval_stage === 'rejected') {
            throw new common_1.BadRequestException('Expense is already finalized');
        }
        expense.approval_stage = 'rejected';
        expense.status = 'rejected';
        expense.rejected_by = actorId;
        expense.rejected_at = new Date();
        await expense.save();
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_expense.rejected',
            resourceType: 'expense',
            resourceId: expense._id.toString(),
            scopeType: expense.scope_type,
            scopeId: expense.scope_id ?? null,
            metadata: {
                title: expense.title,
                amount: expense.amount,
            },
        });
        await this.notifyExpenseRejected(actorId, expense);
        const [dtoExpense] = await this.mapExpenseDocs([expense]);
        return dtoExpense;
    }
    async deleteExpense(actorId, expenseId) {
        const expense = await this.expenseModel.findById(expenseId).exec();
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found');
        }
        await this.ensureExpenseAccess(actorId, expense);
        if (expense.approval_stage === 'approved' &&
            expense.project_id &&
            expense.amount > 0) {
            const project = await this.projectModel
                .findById(expense.project_id)
                .exec();
            if (project) {
                project.actual_spend = Number(Math.max(0, (project.actual_spend ?? 0) - (expense.amount ?? 0)).toFixed(2));
                await project.save();
            }
        }
        await this.expenseModel.findByIdAndDelete(expense._id).exec();
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_expense.deleted',
            resourceType: 'expense',
            resourceId: expense._id.toString(),
            scopeType: expense.scope_type,
            scopeId: expense.scope_id ?? null,
            metadata: {
                title: expense.title,
                amount: expense.amount,
                currency: expense.currency,
            },
        });
        await this.notifyExpenseDeleted(actorId, expense);
    }
    async getAdminSummary(actorId) {
        const scope = await this.loadFinanceScopeAccess(actorId);
        if (!scope.hasGlobalAccess &&
            scope.managedBranchIds.length === 0 &&
            scope.managedClassIds.length === 0) {
            throw new common_1.ForbiddenException('Not authorized');
        }
        const [canDues, canPayments, canProjects, canExpenses] = await Promise.all([
            this.userHasModuleFeature(actorId, 'dues'),
            this.userHasModuleFeature(actorId, 'payments'),
            this.userHasModuleFeature(actorId, 'projects'),
            this.userHasModuleFeature(actorId, 'expenses'),
        ]);
        if (!(canDues || canPayments || canProjects || canExpenses)) {
            throw new common_1.ForbiddenException('Not authorized');
        }
        const [invoices, payments, schemes, projects, expenses] = await Promise.all([
            canDues
                ? this.listInvoicesForScope(scope)
                : Promise.resolve([]),
            canPayments
                ? this.listPaymentsForScope(scope)
                : Promise.resolve([]),
            canDues ? this.listSchemesForScope(scope) : Promise.resolve([]),
            canProjects
                ? this.listProjectsForScope(scope)
                : Promise.resolve([]),
            canExpenses
                ? this.listExpensesForScope(scope)
                : Promise.resolve([]),
        ]);
        return { invoices, payments, schemes, projects, expenses };
    }
    async getOverviewReport(filters) {
        const normalized = await this.normalizeReportFilters(filters);
        const { rows, totalsByCurrency } = await this.buildOverviewReportRows(normalized);
        return {
            generatedAt: new Date().toISOString(),
            filters: {
                year: normalized.year,
                month: normalized.month,
                scopeType: normalized.scopeType,
                scopeId: normalized.scopeId ?? null,
            },
            totalsByCurrency: this.formatReportTotals(totalsByCurrency),
            rows: rows.sort((a, b) => {
                if (b.outstanding !== a.outstanding) {
                    return b.outstanding - a.outstanding;
                }
                return (a.userName ?? a.userId).localeCompare(b.userName ?? b.userId);
            }),
        };
    }
    async exportOverviewReportCsv(filters) {
        const report = await this.getOverviewReport(filters);
        const rows = [
            [
                'User ID',
                'User Name',
                'Currency',
                'Invoices',
                'Payments',
                'Billed',
                'Paid',
                'Outstanding',
            ],
            ...report.rows.map((row) => [
                row.userId,
                row.userName ?? '',
                row.currency,
                row.invoices.toString(),
                row.payments.toString(),
                row.billed.toFixed(2),
                row.paid.toFixed(2),
                row.outstanding.toFixed(2),
            ]),
        ];
        const content = rows
            .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
            .join('\n');
        const parts = ['finance-overview-report'];
        if (report.filters.scopeType) {
            parts.push(report.filters.scopeType);
        }
        if (report.filters.scopeId) {
            parts.push(report.filters.scopeId);
        }
        if (report.filters.year) {
            parts.push(String(report.filters.year));
        }
        if (report.filters.month) {
            parts.push(String(report.filters.month).padStart(2, '0'));
        }
        return {
            filename: `${parts.join('-')}.csv`,
            content,
        };
    }
    async getReportScopeAccess(actorId) {
        const [hasGlobalAccess, managedBranchIds, managedClassIds, branches, classes,] = await Promise.all([
            this.roleAssignmentsService.hasGlobalAccess(actorId),
            this.roleAssignmentsService.managedBranchIds(actorId),
            this.roleAssignmentsService.managedClassIds(actorId),
            this.branchesService.findAll(),
            this.classesService.findAll(),
        ]);
        return {
            hasGlobalAccess,
            branches: this.filterScopedBranches(branches, hasGlobalAccess, managedBranchIds),
            classes: this.filterScopedClasses(classes, hasGlobalAccess, managedClassIds),
        };
    }
    async getScopedOverviewReport(actorId, filters) {
        if (!filters.scopeType) {
            throw new common_1.BadRequestException('scopeType is required');
        }
        const normalized = await this.normalizeReportFilters(filters);
        await this.ensureScopeReportAccess(actorId, normalized.scopeType ?? 'global', normalized.scopeId ?? null);
        return this.getOverviewReport(normalized);
    }
    async exportScopedOverviewReportCsv(actorId, filters) {
        if (!filters.scopeType) {
            throw new common_1.BadRequestException('scopeType is required');
        }
        const normalized = await this.normalizeReportFilters(filters);
        await this.ensureScopeReportAccess(actorId, normalized.scopeType ?? 'global', normalized.scopeId ?? null);
        return this.exportOverviewReportCsv(normalized);
    }
    async captureMonthlySnapshots(actorId, year, month) {
        const hasGlobalAccess = await this.roleAssignmentsService.hasGlobalAccess(actorId);
        if (!hasGlobalAccess) {
            throw new common_1.ForbiddenException('Not authorized for snapshot capture');
        }
        const now = new Date();
        const resolvedYear = year ?? now.getFullYear();
        const resolvedMonth = month ?? now.getMonth() + 1;
        this.validateSnapshotPeriod(resolvedYear, resolvedMonth);
        const period = this.formatPeriod(resolvedYear, resolvedMonth);
        const [branches, classes] = await Promise.all([
            this.branchesService.findAll(),
            this.classesService.findAll(),
        ]);
        const targets = [
            { scopeType: 'global', scopeId: null },
            ...branches.map((branch) => ({
                scopeType: 'branch',
                scopeId: branch.id,
            })),
            ...classes.map((classSet) => ({
                scopeType: 'class',
                scopeId: classSet.id,
            })),
        ];
        const snapshots = [];
        for (const target of targets) {
            const report = await this.getOverviewReport({
                year: resolvedYear,
                month: resolvedMonth,
                scopeType: target.scopeType,
                scopeId: target.scopeId ?? null,
            });
            const snapshot = await this.snapshotModel
                .findOneAndUpdate({
                period,
                scopeType: target.scopeType,
                scopeId: target.scopeId ?? null,
            }, {
                $set: {
                    year: resolvedYear,
                    month: resolvedMonth,
                    period,
                    scopeType: target.scopeType,
                    scopeId: target.scopeId ?? null,
                    totalsByCurrency: report.totalsByCurrency,
                    rowCount: report.rows.length,
                    generatedAt: new Date(),
                },
            }, {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
            })
                .exec();
            snapshots.push(this.toSnapshotDto(snapshot));
        }
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'finance_snapshots.captured',
            resourceType: 'finance_report_snapshot',
            resourceId: period,
            scopeType: 'global',
            scopeId: null,
            metadata: {
                period,
                count: snapshots.length,
            },
        });
        return { period, snapshots };
    }
    async listReportSnapshots(actorId, options) {
        const hasGlobalAccess = await this.roleAssignmentsService.hasGlobalAccess(actorId);
        const managedBranchIds = hasGlobalAccess
            ? []
            : await this.roleAssignmentsService.managedBranchIds(actorId);
        const managedClassIds = hasGlobalAccess
            ? []
            : await this.roleAssignmentsService.managedClassIds(actorId);
        const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
        const scopeType = options?.scopeType;
        const scopeId = options?.scopeId ?? null;
        const query = {};
        if (scopeType) {
            if (scopeType === 'global') {
                if (!hasGlobalAccess) {
                    throw new common_1.ForbiddenException('Not authorized for global snapshots');
                }
                query.scopeType = 'global';
                query.scopeId = null;
            }
            else if (scopeId) {
                await this.ensureScopeReportAccess(actorId, scopeType, scopeId);
                query.scopeType = scopeType;
                query.scopeId = scopeId;
            }
            else if (!hasGlobalAccess) {
                if (scopeType === 'branch') {
                    query.scopeType = 'branch';
                    query.scopeId = { $in: managedBranchIds };
                }
                else {
                    query.scopeType = 'class';
                    query.scopeId = { $in: managedClassIds };
                }
            }
            else {
                query.scopeType = scopeType;
            }
        }
        else if (!hasGlobalAccess) {
            query.$or = [
                { scopeType: 'branch', scopeId: { $in: managedBranchIds } },
                { scopeType: 'class', scopeId: { $in: managedClassIds } },
            ];
        }
        const docs = await this.snapshotModel
            .find(query)
            .sort({ period: -1, generatedAt: -1 })
            .limit(limit)
            .exec();
        return docs.map((doc) => this.toSnapshotDto(doc));
    }
    async buildMemberDuesSummary(userId) {
        const currentYear = new Date().getFullYear();
        const invoices = await this.invoiceModel
            .find({ userId })
            .populate('schemeId')
            .exec();
        const invoiceIds = invoices.map((invoice) => invoice._id);
        const payments = invoiceIds.length
            ? await this.paymentModel
                .find({ 'applications.invoiceId': { $in: invoiceIds } })
                .exec()
            : [];
        const appliedMap = this.calculateAppliedTotals(payments);
        const currentYearInvoices = invoices.filter((invoice) => Boolean(invoice.periodStart &&
            invoice.periodStart.getFullYear() === currentYear));
        const schemeRows = this.buildSchemeSummaryRows(currentYearInvoices, appliedMap);
        const totalsByCurrency = this.formatCurrencyTotals(this.aggregateCurrencyRows(schemeRows));
        const priorRows = this.buildPriorOutstandingRows(invoices, appliedMap, currentYear);
        const priorTotals = this.formatCurrencyTotals(this.aggregateCurrencyRows(priorRows));
        const primaryCurrency = Object.keys(totalsByCurrency)[0] ??
            Object.keys(priorTotals)[0] ??
            'NGN';
        if (Object.keys(totalsByCurrency).length === 0) {
            totalsByCurrency[primaryCurrency] = this.emptyTotals();
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
    async getMemberLedger(actorId, memberId) {
        await this.ensureMemberFinanceAccess(actorId, memberId);
        const [member, invoices, payments, contributions, payouts] = await Promise.all([
            this.usersService.findById(memberId),
            this.invoiceModel
                .find({ userId: memberId })
                .populate('schemeId')
                .sort({ periodStart: -1, createdAt: -1 })
                .limit(100)
                .exec(),
            this.paymentModel
                .find({ payerUserId: memberId })
                .sort({ paidAt: -1, createdAt: -1 })
                .limit(50)
                .exec(),
            this.welfareContributionModel
                .find({ userId: memberId })
                .sort({ paidAt: -1, createdAt: -1 })
                .limit(50)
                .exec(),
            this.welfarePayoutModel
                .find({ beneficiaryUserId: memberId })
                .sort({ disbursedAt: -1, createdAt: -1 })
                .limit(50)
                .exec(),
        ]);
        if (!member) {
            throw new common_1.NotFoundException('Member not found');
        }
        const invoicesDto = await this.toInvoicesWithUsers(invoices);
        const paymentsDto = payments.map((payment) => this.toPaymentDto(payment));
        const totals = this.calculateLedgerTotals(invoices);
        const welfareContributed = contributions.reduce((sum, contribution) => sum + Number(contribution.amount ?? 0), 0);
        const welfareReceived = payouts.reduce((sum, payout) => sum + Number(payout.amount ?? 0), 0);
        totals.welfareContributed = Number(welfareContributed.toFixed(2));
        totals.welfareReceived = Number(welfareReceived.toFixed(2));
        const transactions = this.buildLedgerTransactions(invoices, payments, contributions, payouts);
        return {
            memberId,
            totals,
            invoices: invoicesDto,
            payments: paymentsDto,
            transactions,
        };
    }
    async getPaymentReceipt(actorId, paymentId) {
        const payment = await this.loadPayment(paymentId);
        await this.ensurePaymentAccess(actorId, payment);
        const receipt = await this.findOrIssueReceipt(payment);
        const payer = await this.usersService.findById(payment.payerUserId);
        return this.toReceiptDto(receipt, payment, payer);
    }
    async getPaymentReceiptFile(actorId, paymentId) {
        const payment = await this.loadPayment(paymentId);
        await this.ensurePaymentAccess(actorId, payment);
        const receipt = await this.findOrIssueReceipt(payment);
        const payer = await this.usersService.findById(payment.payerUserId);
        const content = this.buildReceiptContent(receipt, payment, payer);
        const filename = `${receipt.receiptNo}.txt`;
        return { filename, content };
    }
    async getClassLedger(actorId, classId, year) {
        await this.ensureClassFinanceAccess(actorId, classId);
        const memberIds = await this.membershipsService.listUserIdsByClass(classId);
        if (memberIds.length === 0) {
            return {
                classId,
                year: year ?? null,
                totals: this.emptyLedgerTotals(),
                invoices: [],
                payments: [],
            };
        }
        const invoiceQuery = this.invoiceModel
            .find({ userId: { $in: memberIds } })
            .populate('schemeId')
            .sort({ periodStart: -1, createdAt: -1 })
            .limit(200);
        if (year) {
            const start = new Date(year, 0, 1);
            const end = new Date(year + 1, 0, 1);
            invoiceQuery.where({ periodStart: { $gte: start, $lt: end } });
        }
        const paymentQuery = this.paymentModel
            .find({ payerUserId: { $in: memberIds } })
            .sort({ paidAt: -1, createdAt: -1 })
            .limit(150);
        if (year) {
            const start = new Date(year, 0, 1);
            const end = new Date(year + 1, 0, 1);
            paymentQuery.where({ paidAt: { $gte: start, $lt: end } });
        }
        const [invoices, payments] = await Promise.all([
            invoiceQuery.exec(),
            paymentQuery.exec(),
        ]);
        const invoicesDto = await this.toInvoicesWithUsers(invoices);
        const paymentsDto = payments.map((payment) => this.toPaymentDto(payment));
        const totals = this.calculateLedgerTotals(invoices);
        return {
            classId,
            year: year ?? null,
            totals,
            invoices: invoicesDto,
            payments: paymentsDto,
        };
    }
    async mapExpenseDocs(docs) {
        if (docs.length === 0) {
            return [];
        }
        const userIds = new Set();
        const projectIds = new Set();
        docs.forEach((doc) => {
            const userFields = [
                doc.submitted_by,
                doc.approved_by,
                doc.first_approved_by,
                doc.second_approved_by,
                doc.rejected_by,
            ];
            userFields.forEach((value) => {
                if (value) {
                    userIds.add(value);
                }
            });
            if (doc.project_id) {
                projectIds.add(doc.project_id.toString());
            }
        });
        const [userNameMap, projects] = await Promise.all([
            this.buildUserNameMap([...userIds]),
            projectIds.size > 0
                ? this.projectModel
                    .find({
                    _id: {
                        $in: [...projectIds].map((id) => new mongoose_2.Types.ObjectId(id)),
                    },
                })
                    .select('_id name')
                    .lean()
                    .exec()
                : Promise.resolve([]),
        ]);
        const projectNameMap = new Map(projects.map((project) => [project._id.toString(), project.name]));
        return docs.map((doc) => this.toExpenseDto(doc, userNameMap, projectNameMap));
    }
    async listProjectsForScope(scope) {
        const docs = await this.projectModel
            .find(this.buildScopedFilter(scope, 'scope_type', 'scope_id'))
            .sort({ createdAt: -1 })
            .exec();
        const ownerNameMap = await this.buildUserNameMap(docs.map((doc) => doc.owner_id).filter(Boolean));
        return docs.map((doc) => this.toProjectDto(doc, ownerNameMap.get(doc.owner_id ?? '')));
    }
    async listExpensesForScope(scope) {
        const docs = await this.expenseModel
            .find(this.buildScopedFilter(scope, 'scope_type', 'scope_id'))
            .sort({ createdAt: -1 })
            .exec();
        return this.mapExpenseDocs(docs);
    }
    async listSchemesForScope(scope) {
        const docs = await this.schemeModel
            .find(this.buildScopedFilter(scope, 'scope_type', 'scope_id'))
            .sort({ title: 1 })
            .exec();
        return docs.map((doc) => this.toSchemeDto(doc));
    }
    async listInvoicesForScope(scope) {
        if (scope.hasGlobalAccess) {
            return this.listAllInvoices();
        }
        const schemes = await this.schemeModel
            .find(this.buildScopedFilter(scope, 'scope_type', 'scope_id'))
            .select('_id')
            .lean()
            .exec();
        if (schemes.length === 0) {
            return [];
        }
        const docs = await this.invoiceModel
            .find({ schemeId: { $in: schemes.map((scheme) => scheme._id) } })
            .populate('schemeId')
            .sort({ createdAt: -1 })
            .exec();
        return this.toInvoicesWithUsers(docs);
    }
    async listPaymentsForScope(scope) {
        const docs = await this.paymentModel
            .find(this.buildScopedFilter(scope, 'scopeType', 'scopeId'))
            .sort({ paidAt: -1, createdAt: -1 })
            .exec();
        return docs.map((doc) => this.toPaymentDto(doc));
    }
    async ensureProjectAccess(actorId, project) {
        await this.ensureModuleFeatureAccess(actorId, 'projects', project.scope_type, project.scope_id ?? null);
        const scope = await this.loadFinanceScopeAccess(actorId);
        this.ensureReadableScope(scope, project.scope_type, project.scope_id);
    }
    async ensureExpenseAccess(actorId, expense) {
        await this.ensureModuleFeatureAccess(actorId, 'expenses', expense.scope_type, expense.scope_id ?? null);
        const scope = await this.loadFinanceScopeAccess(actorId);
        this.ensureReadableScope(scope, expense.scope_type, expense.scope_id);
    }
    async ensureModuleFeatureAccess(actorId, moduleKey, scopeType, scopeId) {
        const allowed = await this.rolesService.userHasFeature(actorId, moduleKey, scopeType, scopeId ?? null);
        if (!allowed) {
            throw new common_1.ForbiddenException(`Not authorized for ${moduleKey} actions`);
        }
    }
    async userHasModuleFeature(actorId, moduleKey) {
        return this.rolesService.userHasFeature(actorId, moduleKey);
    }
    async loadFinanceScopeAccess(actorId) {
        const [hasGlobalAccess, managedBranchIds, managedClassIds] = await Promise.all([
            this.roleAssignmentsService.hasGlobalAccess(actorId),
            this.roleAssignmentsService.managedBranchIds(actorId),
            this.roleAssignmentsService.managedClassIds(actorId),
        ]);
        return { hasGlobalAccess, managedBranchIds, managedClassIds };
    }
    buildScopedFilter(scope, scopeTypeField, scopeIdField) {
        if (scope.hasGlobalAccess) {
            return {};
        }
        const clauses = [];
        if (scope.managedClassIds.length > 0) {
            clauses.push({
                [scopeTypeField]: 'class',
                [scopeIdField]: { $in: scope.managedClassIds },
            });
        }
        if (scope.managedBranchIds.length > 0) {
            clauses.push({
                [scopeTypeField]: 'branch',
                [scopeIdField]: { $in: scope.managedBranchIds },
            });
        }
        if (clauses.length === 0) {
            return { _id: { $in: [] } };
        }
        return { $or: clauses };
    }
    ensureReadableScope(scope, scopeType, scopeId) {
        if (scope.hasGlobalAccess) {
            return;
        }
        if (scopeType === 'global') {
            throw new common_1.ForbiddenException('Not authorized for global scope');
        }
        if (!scopeId) {
            throw new common_1.BadRequestException('scopeId is required');
        }
        if (scopeType === 'branch' &&
            !scope.managedBranchIds.includes(scopeId)) {
            throw new common_1.ForbiddenException('Not authorized for this branch scope');
        }
        if (scopeType === 'class' && !scope.managedClassIds.includes(scopeId)) {
            throw new common_1.ForbiddenException('Not authorized for this class scope');
        }
    }
    validateAndEnsureWritableScope(scope, scopeType, scopeId) {
        if (scope.hasGlobalAccess) {
            return;
        }
        if (scopeType === 'global') {
            throw new common_1.ForbiddenException('Not authorized for global scope');
        }
        if (!scopeId) {
            throw new common_1.BadRequestException('scopeId is required');
        }
        if (scopeType === 'branch' &&
            !scope.managedBranchIds.includes(scopeId)) {
            throw new common_1.ForbiddenException('Not authorized for this branch scope');
        }
        if (scopeType === 'class' && !scope.managedClassIds.includes(scopeId)) {
            throw new common_1.ForbiddenException('Not authorized for this class scope');
        }
    }
    resolveProjectOwnerId(scope, actorId, ownerId) {
        const resolved = ownerId ?? actorId;
        if (resolved === null) {
            return null;
        }
        if (!scope.hasGlobalAccess && resolved !== actorId) {
            throw new common_1.ForbiddenException('Not authorized to assign project owner');
        }
        return resolved;
    }
    parseDateInput(value, fieldName) {
        if (value === undefined) {
            return undefined;
        }
        if (value === null || value === '') {
            return null;
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new common_1.BadRequestException(`Invalid ${fieldName}`);
        }
        return parsed;
    }
    async validateExpenseProject(projectId, scopeType, scopeId) {
        if (!projectId) {
            return null;
        }
        if (!mongoose_2.Types.ObjectId.isValid(projectId)) {
            throw new common_1.BadRequestException('Invalid projectId');
        }
        const project = await this.projectModel.findById(projectId).exec();
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        if (project.scope_type !== scopeType ||
            (project.scope_id ?? null) !== (scopeId ?? null)) {
            throw new common_1.BadRequestException('Expense scope must match selected project scope');
        }
        return project._id;
    }
    async listScopedFinanceApproverUserIds(scopeType, scopeId) {
        const globalUsers = await this.roleAssignmentsService.listGlobalUserIds();
        if (scopeType === 'global') {
            return Array.from(new Set(globalUsers));
        }
        if (scopeType === 'branch' && scopeId) {
            const scopedUsers = await this.roleAssignmentsService.listBranchExecutiveUserIds(scopeId);
            return Array.from(new Set([...globalUsers, ...scopedUsers]));
        }
        if (scopeType === 'class' && scopeId) {
            const scopedUsers = await this.roleAssignmentsService.listClassExecutiveUserIds(scopeId);
            return Array.from(new Set([...globalUsers, ...scopedUsers]));
        }
        return Array.from(new Set(globalUsers));
    }
    async notifyExpenseSubmitted(actorId, expense) {
        const approvers = await this.listScopedFinanceApproverUserIds(expense.scope_type, expense.scope_id ?? null);
        const targets = approvers.filter((userId) => userId !== actorId);
        await this.notificationsService.createForUsers(targets, {
            title: 'Expense awaiting finance approval',
            message: `"${expense.title}" (${expense.amount.toLocaleString()} ${expense.currency}) requires review.`,
            type: 'action_required',
            metadata: {
                expenseId: expense._id.toString(),
                approvalStage: expense.approval_stage,
                scopeType: expense.scope_type,
                scopeId: expense.scope_id ?? null,
            },
        });
    }
    async notifyExpenseUpdated(actorId, expense) {
        if (!expense.submitted_by || expense.submitted_by === actorId) {
            return;
        }
        await this.notificationsService.createForUser(expense.submitted_by, {
            title: 'Expense updated',
            message: `"${expense.title}" was updated and remains ${expense.approval_stage}.`,
            type: 'info',
            metadata: {
                expenseId: expense._id.toString(),
                approvalStage: expense.approval_stage,
                scopeType: expense.scope_type,
                scopeId: expense.scope_id ?? null,
            },
        });
    }
    async notifyExpenseFirstApproved(actorId, expense) {
        if (expense.submitted_by && expense.submitted_by !== actorId) {
            await this.notificationsService.createForUser(expense.submitted_by, {
                title: 'Expense first approval completed',
                message: `"${expense.title}" passed first finance approval and is awaiting final approval.`,
                type: 'action_required',
                metadata: {
                    expenseId: expense._id.toString(),
                    approvalStage: expense.approval_stage,
                    scopeType: expense.scope_type,
                    scopeId: expense.scope_id ?? null,
                },
            });
        }
        const approvers = await this.listScopedFinanceApproverUserIds(expense.scope_type, expense.scope_id ?? null);
        const targets = approvers.filter((userId) => userId !== actorId &&
            userId !== (expense.submitted_by ?? null) &&
            userId !== (expense.first_approved_by ?? null));
        await this.notificationsService.createForUsers(targets, {
            title: 'Expense awaiting final approval',
            message: `"${expense.title}" is ready for final approval.`,
            type: 'action_required',
            metadata: {
                expenseId: expense._id.toString(),
                approvalStage: expense.approval_stage,
                scopeType: expense.scope_type,
                scopeId: expense.scope_id ?? null,
            },
        });
    }
    async notifyExpenseFinalApproved(actorId, expense) {
        if (expense.submitted_by && expense.submitted_by !== actorId) {
            await this.notificationsService.createForUser(expense.submitted_by, {
                title: 'Expense approved',
                message: `"${expense.title}" has been fully approved.`,
                type: 'success',
                metadata: {
                    expenseId: expense._id.toString(),
                    approvalStage: expense.approval_stage,
                    scopeType: expense.scope_type,
                    scopeId: expense.scope_id ?? null,
                },
            });
        }
        if (expense.project_id) {
            const project = await this.projectModel
                .findById(expense.project_id)
                .select('owner_id name')
                .exec();
            if (project?.owner_id &&
                project.owner_id !== actorId &&
                project.owner_id !== expense.submitted_by) {
                await this.notificationsService.createForUser(project.owner_id, {
                    title: 'Project spend updated',
                    message: `Expense "${expense.title}" was approved for project "${project.name}".`,
                    type: 'info',
                    metadata: {
                        expenseId: expense._id.toString(),
                        projectId: project._id.toString(),
                        scopeType: expense.scope_type,
                        scopeId: expense.scope_id ?? null,
                    },
                });
            }
        }
    }
    async notifyExpenseRejected(actorId, expense) {
        if (!expense.submitted_by || expense.submitted_by === actorId) {
            return;
        }
        await this.notificationsService.createForUser(expense.submitted_by, {
            title: 'Expense rejected',
            message: `"${expense.title}" was rejected during approval.`,
            type: 'warning',
            metadata: {
                expenseId: expense._id.toString(),
                approvalStage: expense.approval_stage,
                scopeType: expense.scope_type,
                scopeId: expense.scope_id ?? null,
            },
        });
    }
    async notifyExpenseDeleted(actorId, expense) {
        if (!expense.submitted_by || expense.submitted_by === actorId) {
            return;
        }
        await this.notificationsService.createForUser(expense.submitted_by, {
            title: 'Expense deleted',
            message: `"${expense.title}" was removed from finance records.`,
            type: 'warning',
            metadata: {
                expenseId: expense._id.toString(),
                scopeType: expense.scope_type,
                scopeId: expense.scope_id ?? null,
            },
        });
    }
    calculateLedgerTotals(invoices) {
        const billed = invoices.reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0);
        const paid = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount ?? 0), 0);
        const outstanding = Math.max(billed - paid, 0);
        return {
            billed: Number(billed.toFixed(2)),
            paid: Number(paid.toFixed(2)),
            outstanding: Number(outstanding.toFixed(2)),
        };
    }
    buildLedgerTransactions(invoices, payments, contributions, payouts) {
        const rows = [];
        invoices.forEach((invoice) => {
            const scheme = this.mapSchemeRef(invoice.schemeId);
            rows.push({
                id: `invoice-${invoice._id.toString()}`,
                date: invoice.periodStart?.toISOString() ??
                    this.getCreatedAtIso(invoice),
                type: 'Invoice',
                description: scheme?.title ?? 'Invoice',
                debit: Number((invoice.amount ?? 0).toFixed(2)),
                credit: 0,
                balance: 0,
            });
        });
        payments.forEach((payment) => {
            rows.push({
                id: `payment-${payment._id.toString()}`,
                date: payment.paidAt?.toISOString() ??
                    this.getCreatedAtIso(payment),
                type: 'Payment',
                description: payment.reference ?? 'Payment',
                debit: 0,
                credit: Number((payment.amount ?? 0).toFixed(2)),
                balance: 0,
            });
        });
        contributions.forEach((contribution) => {
            rows.push({
                id: `contribution-${contribution._id.toString()}`,
                date: contribution.paidAt?.toISOString() ??
                    this.getCreatedAtIso(contribution),
                type: 'Welfare Contribution',
                description: contribution.caseId,
                debit: 0,
                credit: Number((contribution.amount ?? 0).toFixed(2)),
                balance: 0,
            });
        });
        payouts.forEach((payout) => {
            rows.push({
                id: `payout-${payout._id.toString()}`,
                date: payout.disbursedAt?.toISOString() ??
                    this.getCreatedAtIso(payout),
                type: 'Welfare Payout',
                description: payout.caseId,
                debit: Number((payout.amount ?? 0).toFixed(2)),
                credit: 0,
                balance: 0,
            });
        });
        rows.sort((a, b) => {
            const aTime = a.date ? new Date(a.date).getTime() : 0;
            const bTime = b.date ? new Date(b.date).getTime() : 0;
            return aTime - bTime;
        });
        let running = 0;
        return rows.map((row) => {
            running += row.debit - row.credit;
            return {
                id: row.id,
                date: row.date,
                type: row.type,
                description: row.description,
                debit: row.debit,
                credit: row.credit,
                balance: Number(running.toFixed(2)),
            };
        });
    }
    async ensureMemberFinanceAccess(actorId, memberId) {
        if (actorId === memberId) {
            return;
        }
        if (await this.roleAssignmentsService.hasGlobalAccess(actorId)) {
            return;
        }
        const [classMembership, branchMemberships] = await Promise.all([
            this.membershipsService.getClassMembership(memberId),
            this.membershipsService.listBranchMemberships(memberId),
        ]);
        if (classMembership?.classId) {
            const canAccessClassMemberLedger = await this.rolesService.userHasFeature(actorId, 'members', 'class', classMembership.classId);
            if (canAccessClassMemberLedger) {
                return;
            }
        }
        const approvedBranchIds = branchMemberships
            .filter((membership) => membership.status === 'approved')
            .map((membership) => membership.branchId);
        if (approvedBranchIds.length > 0) {
            const branchLedgerAccessChecks = await Promise.all(approvedBranchIds.map((branchId) => this.rolesService.userHasFeature(actorId, 'members', 'branch', branchId)));
            if (branchLedgerAccessChecks.some(Boolean)) {
                return;
            }
        }
        throw new common_1.ForbiddenException('Not authorized for this member ledger');
    }
    async ensureUserBelongsToScope(userId, scopeType, scopeId) {
        if (scopeType === 'branch') {
            const branchMemberships = await this.membershipsService.listBranchMemberships(userId);
            const belongsToBranch = branchMemberships.some((membership) => membership.status === 'approved' &&
                membership.branchId === scopeId);
            if (!belongsToBranch) {
                throw new common_1.BadRequestException('Selected member is not approved for the target branch scope');
            }
            return;
        }
        const classMembership = await this.membershipsService.getClassMembership(userId);
        if (classMembership?.classId !== scopeId) {
            throw new common_1.BadRequestException('Selected member is not in the target class scope');
        }
    }
    async ensureClassFinanceAccess(actorId, classId) {
        if (await this.roleAssignmentsService.hasGlobalAccess(actorId)) {
            return;
        }
        const managed = await this.roleAssignmentsService.managedClassIds(actorId);
        if (!managed.includes(classId)) {
            throw new common_1.ForbiddenException('Not authorized for this class ledger');
        }
    }
    async loadPayment(paymentId) {
        const payment = await this.paymentModel.findById(paymentId).exec();
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        return payment;
    }
    async ensurePaymentAccess(actorId, payment) {
        await this.ensureMemberFinanceAccess(actorId, payment.payerUserId);
    }
    async issueReceiptForPayment(payment) {
        const existing = await this.receiptModel
            .findOne({ paymentId: payment._id })
            .exec();
        if (existing) {
            return existing;
        }
        const receiptNo = await this.nextReceiptNumber();
        return this.receiptModel.create({
            paymentId: payment._id,
            receiptNo,
            issuedAt: new Date(),
        });
    }
    async findOrIssueReceipt(payment) {
        const receipt = await this.receiptModel
            .findOne({ paymentId: payment._id })
            .exec();
        if (receipt) {
            return receipt;
        }
        return this.issueReceiptForPayment(payment);
    }
    async nextReceiptNumber() {
        const latest = await this.receiptModel
            .findOne()
            .sort({ issuedAt: -1 })
            .exec();
        if (!latest) {
            return 'RC000001';
        }
        const current = parseInt(latest.receiptNo.replace(/\D/g, ''), 10);
        const next = Number.isFinite(current) ? current + 1 : 1;
        return `RC${next.toString().padStart(6, '0')}`;
    }
    toReceiptDto(receipt, payment, payer) {
        return {
            id: receipt._id.toString(),
            paymentId: payment._id.toString(),
            receiptNo: receipt.receiptNo,
            issuedAt: receipt.issuedAt?.toISOString() ?? new Date().toISOString(),
            amount: payment.amount,
            payerUserId: payment.payerUserId,
            downloadUrl: `/finance/payments/${payment._id.toString()}/receipt/download`,
            payerName: payer?.name,
        };
    }
    buildReceiptContent(receipt, payment, payer) {
        const lines = [
            `Receipt No: ${receipt.receiptNo}`,
            `Issued At: ${receipt.issuedAt?.toISOString() ?? new Date().toISOString()}`,
            `Member: ${payer?.name ?? payment.payerUserId}`,
            `Amount: ${payment.amount.toLocaleString()} ${payment.currency}`,
            `Channel: ${payment.channel}`,
            `Reference: ${payment.reference ?? 'N/A'}`,
        ];
        return lines.join('\n');
    }
    emptyLedgerTotals() {
        return {
            billed: 0,
            paid: 0,
            outstanding: 0,
            welfareContributed: 0,
            welfareReceived: 0,
        };
    }
    buildSchemeSummaryRows(invoices, appliedMap) {
        const grouped = new Map();
        invoices.forEach((invoice) => {
            const scheme = this.getPopulatedScheme(invoice.schemeId);
            const key = scheme?._id?.toString?.() ?? `manual-${invoice._id.toString()}`;
            const existing = grouped.get(key) ?? {
                schemeId: scheme?._id?.toString?.() ?? null,
                label: scheme?.title ??
                    `Manual invoice #${invoice._id.toString()}`,
                frequency: scheme?.frequency ?? 'custom',
                scope: this.describeScope(scheme),
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
    buildPriorOutstandingRows(invoices, appliedMap, year) {
        const cutoff = new Date(year, 0, 1);
        const rows = [];
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
    aggregateCurrencyRows(rows) {
        const totals = {};
        rows.forEach((row) => {
            const currency = row.currency ?? 'NGN';
            if (!totals[currency]) {
                totals[currency] = this.emptyTotals();
            }
            totals[currency].due += row.due ?? 0;
            totals[currency].paid += row.paid ?? 0;
            totals[currency].balance += row.balance ?? 0;
        });
        return totals;
    }
    formatCurrencyTotals(totals) {
        const formatted = {};
        Object.entries(totals).forEach(([currency, values]) => {
            formatted[currency] = {
                due: Number((values.due ?? 0).toFixed(2)),
                paid: Number((values.paid ?? 0).toFixed(2)),
                balance: Number(Math.max(values.balance ?? 0, 0).toFixed(2)),
            };
        });
        return formatted;
    }
    describeScope(scheme) {
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
    async normalizeReportFilters(filters) {
        const year = filters.year;
        if (year !== undefined) {
            if (!Number.isInteger(year) || year < 2000 || year > 2100) {
                throw new common_1.BadRequestException('Invalid report year');
            }
        }
        const month = filters.month;
        if (month !== undefined) {
            if (!Number.isInteger(month) || month < 1 || month > 12) {
                throw new common_1.BadRequestException('Invalid report month');
            }
            if (year === undefined) {
                throw new common_1.BadRequestException('year is required when month is provided');
            }
        }
        if (!filters.scopeType) {
            return { year, month };
        }
        if (filters.scopeType === 'global') {
            return { year, month, scopeType: 'global', scopeId: null };
        }
        const scopeId = filters.scopeId ?? null;
        await this.validateScope(filters.scopeType, scopeId);
        return {
            year,
            month,
            scopeType: filters.scopeType,
            scopeId,
        };
    }
    async buildOverviewReportRows(filters) {
        const invoiceFilter = await this.buildInvoiceReportFilter(filters);
        const paymentFilter = this.buildPaymentReportFilter(filters);
        const [invoices, payments] = await Promise.all([
            this.invoiceModel
                .find(invoiceFilter)
                .select('userId amount paidAmount currency')
                .lean()
                .exec(),
            this.paymentModel
                .find(paymentFilter)
                .select('payerUserId applications currency')
                .lean()
                .exec(),
        ]);
        const rowMap = new Map();
        const totalsByCurrency = {};
        const userIds = new Set();
        invoices.forEach((invoice) => {
            const currency = invoice.currency ?? 'NGN';
            const userId = invoice.userId;
            userIds.add(userId);
            const key = `${userId}|${currency}`;
            const current = rowMap.get(key) ?? {
                userId,
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
            current.invoices += 1;
            current.billed += billed;
            current.paid += paid;
            current.outstanding += outstanding;
            rowMap.set(key, current);
            if (!totalsByCurrency[currency]) {
                totalsByCurrency[currency] = {
                    billed: 0,
                    paid: 0,
                    outstanding: 0,
                };
            }
            totalsByCurrency[currency].billed += billed;
            totalsByCurrency[currency].paid += paid;
            totalsByCurrency[currency].outstanding += outstanding;
        });
        payments.forEach((payment) => {
            const currency = payment.currency ?? 'NGN';
            const userId = payment.payerUserId;
            userIds.add(userId);
            const key = `${userId}|${currency}`;
            const current = rowMap.get(key) ?? {
                userId,
                currency,
                invoices: 0,
                payments: 0,
                billed: 0,
                paid: 0,
                outstanding: 0,
            };
            current.payments += 1;
            rowMap.set(key, current);
        });
        const userNameMap = await this.buildUserNameMap([...userIds]);
        const rows = Array.from(rowMap.values()).map((row) => ({
            ...row,
            userName: userNameMap.get(row.userId),
            billed: Number(row.billed.toFixed(2)),
            paid: Number(row.paid.toFixed(2)),
            outstanding: Number(row.outstanding.toFixed(2)),
        }));
        return { rows, totalsByCurrency };
    }
    async buildInvoiceReportFilter(filters) {
        const query = {};
        if (filters.year !== undefined) {
            const start = filters.month !== undefined
                ? new Date(filters.year, filters.month - 1, 1)
                : new Date(filters.year, 0, 1);
            const end = filters.month !== undefined
                ? new Date(filters.year, filters.month, 1)
                : new Date(filters.year + 1, 0, 1);
            query.periodStart = { $gte: start, $lt: end };
        }
        if (filters.scopeType && filters.scopeType !== 'global') {
            const schemes = await this.schemeModel
                .find({
                scope_type: filters.scopeType,
                scope_id: filters.scopeId,
            })
                .select('_id')
                .lean()
                .exec();
            const schemeIds = schemes.map((scheme) => scheme._id);
            if (schemeIds.length === 0) {
                query._id = { $in: [] };
                return query;
            }
            query.schemeId = { $in: schemeIds };
        }
        return query;
    }
    buildPaymentReportFilter(filters) {
        const query = {};
        if (filters.year !== undefined) {
            const start = filters.month !== undefined
                ? new Date(filters.year, filters.month - 1, 1)
                : new Date(filters.year, 0, 1);
            const end = filters.month !== undefined
                ? new Date(filters.year, filters.month, 1)
                : new Date(filters.year + 1, 0, 1);
            query.paidAt = { $gte: start, $lt: end };
        }
        if (filters.scopeType && filters.scopeType !== 'global') {
            query.scopeType = filters.scopeType;
            query.scopeId = filters.scopeId;
        }
        return query;
    }
    formatReportTotals(totals) {
        const formatted = {};
        Object.entries(totals).forEach(([currency, value]) => {
            formatted[currency] = {
                billed: Number((value.billed ?? 0).toFixed(2)),
                paid: Number((value.paid ?? 0).toFixed(2)),
                outstanding: Number((value.outstanding ?? 0).toFixed(2)),
            };
        });
        return formatted;
    }
    escapeCsv(value) {
        const escaped = value.replace(/"/g, '""');
        return `"${escaped}"`;
    }
    filterScopedBranches(branches, hasGlobalAccess, managedBranchIds) {
        if (hasGlobalAccess) {
            return branches;
        }
        const allowed = new Set(managedBranchIds);
        return branches.filter((branch) => allowed.has(branch.id));
    }
    filterScopedClasses(classes, hasGlobalAccess, managedClassIds) {
        if (hasGlobalAccess) {
            return classes;
        }
        const allowed = new Set(managedClassIds);
        return classes.filter((classSet) => allowed.has(classSet.id));
    }
    async ensureScopeReportAccess(actorId, scopeType, scopeId) {
        const hasGlobalAccess = await this.roleAssignmentsService.hasGlobalAccess(actorId);
        if (hasGlobalAccess) {
            return;
        }
        if (scopeType === 'global') {
            throw new common_1.ForbiddenException('Not authorized for global scope');
        }
        if (!scopeId) {
            throw new common_1.BadRequestException('scopeId is required');
        }
        if (scopeType === 'branch') {
            const managed = await this.roleAssignmentsService.managedBranchIds(actorId);
            if (!managed.includes(scopeId)) {
                throw new common_1.ForbiddenException('Not authorized for this branch scope');
            }
            return;
        }
        const managed = await this.roleAssignmentsService.managedClassIds(actorId);
        if (!managed.includes(scopeId)) {
            throw new common_1.ForbiddenException('Not authorized for this class scope');
        }
    }
    validateSnapshotPeriod(year, month) {
        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            throw new common_1.BadRequestException('Invalid snapshot year');
        }
        if (!Number.isInteger(month) || month < 1 || month > 12) {
            throw new common_1.BadRequestException('Invalid snapshot month');
        }
    }
    formatPeriod(year, month) {
        return `${year}-${String(month).padStart(2, '0')}`;
    }
    toSnapshotDto(doc) {
        return {
            id: doc._id.toString(),
            period: doc.period,
            year: doc.year,
            month: doc.month,
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            totalsByCurrency: this.formatReportTotals(doc.totalsByCurrency),
            rowCount: doc.rowCount ?? 0,
            generatedAt: doc.generatedAt?.toISOString() ?? new Date().toISOString(),
        };
    }
    calculateAppliedTotals(payments) {
        const map = new Map();
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
    emptyTotals() {
        return { due: 0, paid: 0, balance: 0 };
    }
};
exports.FinanceService = FinanceService;
exports.FinanceService = FinanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(dues_scheme_schema_1.DuesScheme.name)),
    __param(1, (0, mongoose_1.InjectModel)(dues_invoice_schema_1.DuesInvoice.name)),
    __param(2, (0, mongoose_1.InjectModel)(payment_schema_1.Payment.name)),
    __param(3, (0, mongoose_1.InjectModel)(payment_receipt_schema_1.PaymentReceipt.name)),
    __param(4, (0, mongoose_1.InjectModel)(finance_report_snapshot_schema_1.FinanceReportSnapshot.name)),
    __param(5, (0, mongoose_1.InjectModel)(project_schema_1.Project.name)),
    __param(6, (0, mongoose_1.InjectModel)(expense_schema_1.Expense.name)),
    __param(7, (0, mongoose_1.InjectModel)(welfare_contribution_schema_1.WelfareContribution.name)),
    __param(8, (0, mongoose_1.InjectModel)(welfare_payout_schema_1.WelfarePayout.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        memberships_service_1.MembershipsService,
        role_assignments_service_1.RoleAssignmentsService,
        branches_service_1.BranchesService,
        classes_service_1.ClassesService,
        roles_service_1.RolesService,
        notifications_service_1.NotificationsService,
        audit_logs_service_1.AuditLogsService])
], FinanceService);
//# sourceMappingURL=finance.service.js.map