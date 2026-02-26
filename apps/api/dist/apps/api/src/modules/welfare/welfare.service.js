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
exports.WelfareService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const welfare_category_schema_1 = require("./schemas/welfare-category.schema");
const welfare_case_schema_1 = require("./schemas/welfare-case.schema");
const welfare_contribution_schema_1 = require("./schemas/welfare-contribution.schema");
const welfare_payout_schema_1 = require("./schemas/welfare-payout.schema");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
const memberships_service_1 = require("../memberships/memberships.service");
const branches_service_1 = require("../branches/branches.service");
const classes_service_1 = require("../classes/classes.service");
const users_service_1 = require("../users/users.service");
const notifications_service_1 = require("../notifications/notifications.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
let WelfareService = class WelfareService {
    categoryModel;
    caseModel;
    contributionModel;
    payoutModel;
    roleAssignmentsService;
    membershipsService;
    branchesService;
    classesService;
    usersService;
    notificationsService;
    auditLogsService;
    constructor(categoryModel, caseModel, contributionModel, payoutModel, roleAssignmentsService, membershipsService, branchesService, classesService, usersService, notificationsService, auditLogsService) {
        this.categoryModel = categoryModel;
        this.caseModel = caseModel;
        this.contributionModel = contributionModel;
        this.payoutModel = payoutModel;
        this.roleAssignmentsService = roleAssignmentsService;
        this.membershipsService = membershipsService;
        this.branchesService = branchesService;
        this.classesService = classesService;
        this.usersService = usersService;
        this.notificationsService = notificationsService;
        this.auditLogsService = auditLogsService;
    }
    toCategory(doc) {
        return {
            id: doc._id.toString(),
            name: doc.name,
            scopeType: doc.scope_type,
            scopeId: doc.scope_id ?? null,
            status: doc.status,
        };
    }
    toCase(doc) {
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
            beneficiaryName: doc.beneficiaryName,
            beneficiaryUserId: doc.beneficiaryUserId,
        };
    }
    toContribution(doc) {
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
    toPayout(doc) {
        return {
            id: doc._id.toString(),
            caseId: doc.caseId,
            beneficiaryUserId: doc.beneficiaryUserId ?? undefined,
            amount: doc.amount,
            currency: doc.currency ?? 'NGN',
            channel: doc.channel,
            reference: doc.reference ?? undefined,
            notes: doc.notes ?? undefined,
            disbursedAt: doc.disbursedAt?.toISOString(),
            status: doc.status ?? 'pending',
            reviewedBy: doc.reviewedBy ?? null,
            reviewedAt: doc.reviewedAt?.toISOString() ?? null,
            reviewNote: doc.reviewNote ?? null,
        };
    }
    async listCategories(actorId, scopeType, scopeId) {
        const access = await this.resolveReadableScopeAccess(actorId);
        const query = { status: 'active' };
        if (access.hasGlobalAccess) {
            if (!scopeType) {
                const docs = await this.categoryModel
                    .find(query)
                    .sort({ name: 1 })
                    .exec();
                return docs.map((doc) => this.toCategory(doc));
            }
            if (scopeType === 'global') {
                query.scope_type = 'global';
            }
            else if (scopeId) {
                query.$or = [
                    { scope_type: 'global', scope_id: null },
                    { scope_type: scopeType, scope_id: scopeId },
                ];
            }
            else {
                query.scope_type = scopeType;
            }
            const docs = await this.categoryModel
                .find(query)
                .sort({ name: 1 })
                .exec();
            return docs.map((doc) => this.toCategory(doc));
        }
        if (scopeType === 'global') {
            query.scope_type = 'global';
        }
        else if (scopeType === 'branch') {
            if (!scopeId) {
                throw new common_1.BadRequestException('scopeId is required for branch scope');
            }
            if (!access.readableBranchIds.includes(scopeId)) {
                throw new common_1.ForbiddenException('Not authorized for this branch scope');
            }
            query.$or = [
                { scope_type: 'global', scope_id: null },
                { scope_type: 'branch', scope_id: scopeId },
            ];
        }
        else if (scopeType === 'class') {
            if (!scopeId) {
                throw new common_1.BadRequestException('scopeId is required for class scope');
            }
            if (!access.readableClassIds.includes(scopeId)) {
                throw new common_1.ForbiddenException('Not authorized for this class scope');
            }
            query.$or = [
                { scope_type: 'global', scope_id: null },
                { scope_type: 'class', scope_id: scopeId },
            ];
        }
        else {
            query.$or = [
                { scope_type: 'global' },
                ...(access.readableBranchIds.length > 0
                    ? [
                        {
                            scope_type: 'branch',
                            scope_id: { $in: access.readableBranchIds },
                        },
                    ]
                    : []),
                ...(access.readableClassIds.length > 0
                    ? [
                        {
                            scope_type: 'class',
                            scope_id: { $in: access.readableClassIds },
                        },
                    ]
                    : []),
            ];
        }
        const docs = await this.categoryModel
            .find(query)
            .sort({ name: 1 })
            .exec();
        return docs.map((doc) => this.toCategory(doc));
    }
    async listCases(actorId, scopeType, scopeId, includeClosed = false) {
        const access = await this.resolveReadableScopeAccess(actorId);
        const query = {};
        if (!includeClosed) {
            query.status = 'open';
        }
        if (access.hasGlobalAccess) {
            if (!scopeType) {
                const docs = await this.caseModel
                    .find(query)
                    .sort({ createdAt: -1 })
                    .exec();
                return docs.map((doc) => this.toCase(doc));
            }
            query.scopeType = scopeType;
            if (scopeType !== 'global' && scopeId) {
                query.scopeId = scopeId;
            }
            const docs = await this.caseModel
                .find(query)
                .sort({ createdAt: -1 })
                .exec();
            return docs.map((doc) => this.toCase(doc));
        }
        if (scopeType === 'global') {
            query.scopeType = 'global';
        }
        else if (scopeType === 'branch') {
            if (!scopeId) {
                throw new common_1.BadRequestException('scopeId is required for branch scope');
            }
            if (!access.readableBranchIds.includes(scopeId)) {
                throw new common_1.ForbiddenException('Not authorized for this branch scope');
            }
            query.scopeType = 'branch';
            query.scopeId = scopeId;
        }
        else if (scopeType === 'class') {
            if (!scopeId) {
                throw new common_1.BadRequestException('scopeId is required for class scope');
            }
            if (!access.readableClassIds.includes(scopeId)) {
                throw new common_1.ForbiddenException('Not authorized for this class scope');
            }
            query.scopeType = 'class';
            query.scopeId = scopeId;
        }
        else {
            query.$or = [
                { scopeType: 'global' },
                ...(access.readableBranchIds.length > 0
                    ? [
                        {
                            scopeType: 'branch',
                            scopeId: { $in: access.readableBranchIds },
                        },
                    ]
                    : []),
                ...(access.readableClassIds.length > 0
                    ? [
                        {
                            scopeType: 'class',
                            scopeId: { $in: access.readableClassIds },
                        },
                    ]
                    : []),
            ];
        }
        const docs = await this.caseModel
            .find(query)
            .sort({ createdAt: -1 })
            .exec();
        return docs.map((doc) => this.toCase(doc));
    }
    async createCase(actorId, dto) {
        await this.ensureScopeExists(dto.scopeType, dto.scopeId ?? null);
        await this.ensureScopeManagement(actorId, dto.scopeType, dto.scopeId ?? null);
        const category = await this.categoryModel
            .findById(dto.categoryId)
            .exec();
        if (!category || category.status !== 'active') {
            throw new common_1.BadRequestException('Invalid welfare category');
        }
        const scopeMatches = category.scope_type === 'global' ||
            (category.scope_type === dto.scopeType &&
                (category.scope_id ?? null) === (dto.scopeId ?? null));
        if (!scopeMatches) {
            throw new common_1.BadRequestException('Category does not match selected case scope');
        }
        if (dto.beneficiaryUserId) {
            const user = await this.usersService.findById(dto.beneficiaryUserId);
            if (!user) {
                throw new common_1.BadRequestException('Beneficiary user not found');
            }
        }
        const record = await this.caseModel.create({
            title: dto.title,
            description: dto.description,
            categoryId: dto.categoryId,
            scopeType: dto.scopeType,
            scopeId: dto.scopeType === 'global' ? undefined : dto.scopeId,
            targetAmount: dto.targetAmount ?? 0,
            currency: dto.currency ?? 'NGN',
            beneficiaryName: dto.beneficiaryName,
            beneficiaryUserId: dto.beneficiaryUserId,
            status: 'open',
            totalRaised: 0,
            totalDisbursed: 0,
        });
        await this.auditLogsService.record({
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
            await this.notificationsService.createForUser(record.beneficiaryUserId, {
                title: 'Welfare case created',
                message: `A welfare case "${record.title}" was opened with your profile as beneficiary.`,
                type: 'info',
                metadata: {
                    caseId: record._id.toString(),
                },
            });
        }
        return this.toCase(record);
    }
    async updateCaseStatus(actorId, caseId, status) {
        const welfareCase = await this.caseModel.findById(caseId).exec();
        if (!welfareCase) {
            throw new common_1.NotFoundException('Case not found');
        }
        await this.ensureCaseManagement(actorId, welfareCase);
        welfareCase.status = status;
        await welfareCase.save();
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: `welfare_case.${status === 'closed' ? 'closed' : 'reopened'}`,
            resourceType: 'welfare_case',
            resourceId: welfareCase._id.toString(),
            scopeType: welfareCase.scopeType,
            scopeId: welfareCase.scopeId ?? null,
            metadata: {
                status,
            },
        });
        return this.toCase(welfareCase);
    }
    async getCase(actorId, caseId) {
        const welfareCase = await this.caseModel.findById(caseId).exec();
        if (!welfareCase) {
            throw new common_1.NotFoundException('Case not found');
        }
        await this.ensureCanViewCase(actorId, welfareCase);
        const [contributions, payouts] = await Promise.all([
            this.contributionModel
                .find({ caseId })
                .sort({ paidAt: -1, createdAt: -1 })
                .exec(),
            this.payoutModel
                .find({ caseId })
                .sort({ disbursedAt: -1, createdAt: -1 })
                .exec(),
        ]);
        return {
            ...this.toCase(welfareCase),
            contributions: contributions.map((doc) => this.toContribution(doc)),
            payouts: payouts.map((doc) => this.toPayout(doc)),
        };
    }
    async recordContribution(actorId, caseId, dto) {
        const welfareCase = await this.caseModel.findById(caseId).exec();
        if (!welfareCase) {
            throw new common_1.NotFoundException('Case not found');
        }
        if (welfareCase.status !== 'open') {
            throw new common_1.BadRequestException('Case is closed');
        }
        await this.ensureCaseContributionAccess(actorId, welfareCase);
        const contribution = await this.contributionModel.create({
            caseId,
            userId: dto.contributorUserId ?? actorId,
            contributorName: dto.contributorName,
            contributorEmail: dto.contributorEmail,
            amount: dto.amount,
            currency: dto.currency ?? welfareCase.currency ?? 'NGN',
            notes: dto.notes,
            paidAt: new Date(),
            status: 'pending',
            reviewedBy: null,
            reviewedAt: null,
            reviewNote: null,
        });
        await this.auditLogsService.record({
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
        return this.toContribution(contribution);
    }
    async recordPayout(actorId, caseId, dto) {
        const welfareCase = await this.caseModel.findById(caseId).exec();
        if (!welfareCase) {
            throw new common_1.NotFoundException('Case not found');
        }
        if (welfareCase.status !== 'open') {
            throw new common_1.BadRequestException('Case is closed');
        }
        await this.ensureCaseManagement(actorId, welfareCase);
        const payout = await this.payoutModel.create({
            caseId,
            beneficiaryUserId: welfareCase.beneficiaryUserId ?? null,
            amount: dto.amount,
            currency: dto.currency ?? welfareCase.currency ?? 'NGN',
            channel: dto.channel,
            reference: dto.reference,
            notes: dto.notes,
            disbursedAt: new Date(),
            status: 'pending',
            reviewedBy: null,
            reviewedAt: null,
            reviewNote: null,
        });
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'welfare_payout.recorded',
            resourceType: 'welfare_payout',
            resourceId: payout._id.toString(),
            scopeType: welfareCase.scopeType,
            scopeId: welfareCase.scopeId ?? null,
            metadata: {
                caseId,
                amount: payout.amount,
                currency: payout.currency ?? 'NGN',
                beneficiaryUserId: payout.beneficiaryUserId ?? null,
            },
        });
        if (payout.beneficiaryUserId) {
            await this.notificationsService.createForUser(payout.beneficiaryUserId, {
                title: 'Welfare payout queued for approval',
                message: `A payout request has been submitted for welfare case "${welfareCase.title}".`,
                type: 'info',
                metadata: {
                    caseId: welfareCase._id.toString(),
                    payoutId: payout._id.toString(),
                },
            });
        }
        return this.toPayout(payout);
    }
    async approveContribution(actorId, contributionId, note) {
        const contribution = await this.contributionModel
            .findById(contributionId)
            .exec();
        if (!contribution) {
            throw new common_1.NotFoundException('Contribution not found');
        }
        const welfareCase = await this.caseModel
            .findById(contribution.caseId)
            .exec();
        if (!welfareCase) {
            throw new common_1.NotFoundException('Case not found');
        }
        await this.ensureCaseManagement(actorId, welfareCase);
        contribution.status = 'approved';
        contribution.reviewedBy = actorId;
        contribution.reviewedAt = new Date();
        contribution.reviewNote = note ?? null;
        await contribution.save();
        await this.refreshCaseTotals(welfareCase._id.toString());
        if (contribution.userId) {
            await this.notificationsService.createForUser(contribution.userId, {
                title: 'Welfare contribution approved',
                message: `Your contribution for "${welfareCase.title}" has been approved.`,
                type: 'success',
                metadata: {
                    caseId: welfareCase._id.toString(),
                    contributionId: contribution._id.toString(),
                },
            });
        }
        await this.auditLogsService.record({
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
        return this.toContribution(contribution);
    }
    async rejectContribution(actorId, contributionId, note) {
        if (!note?.trim()) {
            throw new common_1.BadRequestException('Rejection note is required');
        }
        const contribution = await this.contributionModel
            .findById(contributionId)
            .exec();
        if (!contribution) {
            throw new common_1.NotFoundException('Contribution not found');
        }
        const welfareCase = await this.caseModel
            .findById(contribution.caseId)
            .exec();
        if (!welfareCase) {
            throw new common_1.NotFoundException('Case not found');
        }
        await this.ensureCaseManagement(actorId, welfareCase);
        contribution.status = 'rejected';
        contribution.reviewedBy = actorId;
        contribution.reviewedAt = new Date();
        contribution.reviewNote = note;
        await contribution.save();
        await this.refreshCaseTotals(welfareCase._id.toString());
        if (contribution.userId) {
            await this.notificationsService.createForUser(contribution.userId, {
                title: 'Welfare contribution rejected',
                message: `Your contribution for "${welfareCase.title}" was rejected.`,
                type: 'warning',
                metadata: {
                    caseId: welfareCase._id.toString(),
                    contributionId: contribution._id.toString(),
                    reviewNote: note,
                },
            });
        }
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'welfare_contribution.rejected',
            resourceType: 'welfare_contribution',
            resourceId: contribution._id.toString(),
            scopeType: welfareCase.scopeType,
            scopeId: welfareCase.scopeId ?? null,
            metadata: {
                caseId: welfareCase._id.toString(),
                reviewNote: note,
            },
        });
        return this.toContribution(contribution);
    }
    async approvePayout(actorId, payoutId, note) {
        const payout = await this.payoutModel.findById(payoutId).exec();
        if (!payout) {
            throw new common_1.NotFoundException('Payout not found');
        }
        const welfareCase = await this.caseModel.findById(payout.caseId).exec();
        if (!welfareCase) {
            throw new common_1.NotFoundException('Case not found');
        }
        await this.ensureCaseManagement(actorId, welfareCase);
        payout.status = 'approved';
        payout.reviewedBy = actorId;
        payout.reviewedAt = new Date();
        payout.reviewNote = note ?? null;
        if (!payout.disbursedAt) {
            payout.disbursedAt = new Date();
        }
        await payout.save();
        await this.refreshCaseTotals(welfareCase._id.toString());
        if (payout.beneficiaryUserId) {
            await this.notificationsService.createForUser(payout.beneficiaryUserId, {
                title: 'Welfare payout approved',
                message: `A welfare payout for "${welfareCase.title}" has been approved.`,
                type: 'success',
                metadata: {
                    caseId: welfareCase._id.toString(),
                    payoutId: payout._id.toString(),
                },
            });
        }
        await this.auditLogsService.record({
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
        return this.toPayout(payout);
    }
    async rejectPayout(actorId, payoutId, note) {
        if (!note?.trim()) {
            throw new common_1.BadRequestException('Rejection note is required');
        }
        const payout = await this.payoutModel.findById(payoutId).exec();
        if (!payout) {
            throw new common_1.NotFoundException('Payout not found');
        }
        const welfareCase = await this.caseModel.findById(payout.caseId).exec();
        if (!welfareCase) {
            throw new common_1.NotFoundException('Case not found');
        }
        await this.ensureCaseManagement(actorId, welfareCase);
        payout.status = 'rejected';
        payout.reviewedBy = actorId;
        payout.reviewedAt = new Date();
        payout.reviewNote = note;
        await payout.save();
        await this.refreshCaseTotals(welfareCase._id.toString());
        if (payout.beneficiaryUserId) {
            await this.notificationsService.createForUser(payout.beneficiaryUserId, {
                title: 'Welfare payout rejected',
                message: `A welfare payout for "${welfareCase.title}" was rejected.`,
                type: 'warning',
                metadata: {
                    caseId: welfareCase._id.toString(),
                    payoutId: payout._id.toString(),
                    reviewNote: note,
                },
            });
        }
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'welfare_payout.rejected',
            resourceType: 'welfare_payout',
            resourceId: payout._id.toString(),
            scopeType: welfareCase.scopeType,
            scopeId: welfareCase.scopeId ?? null,
            metadata: {
                caseId: welfareCase._id.toString(),
                reviewNote: note,
            },
        });
        return this.toPayout(payout);
    }
    async listQueue(actorId, scopeType, scopeId, status = 'pending') {
        const cases = await this.listAccessibleCasesForActor(actorId, scopeType, scopeId);
        const caseIds = cases.map((record) => record._id.toString());
        if (caseIds.length === 0) {
            return [];
        }
        const [contributions, payouts] = await Promise.all([
            this.contributionModel
                .find({ caseId: { $in: caseIds }, status })
                .sort({ createdAt: -1 })
                .exec(),
            this.payoutModel
                .find({ caseId: { $in: caseIds }, status })
                .sort({ createdAt: -1 })
                .exec(),
        ]);
        const caseMap = new Map(cases.map((record) => [record._id.toString(), record]));
        const queue = [];
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
                submittedAt: entry.paidAt?.toISOString() ??
                    this.createdAtIso(entry) ??
                    undefined,
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
                submittedAt: entry.disbursedAt?.toISOString() ??
                    this.createdAtIso(entry) ??
                    undefined,
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
    async ensureScopeExists(scopeType, scopeId) {
        if (scopeType === 'global') {
            return;
        }
        if (!scopeId) {
            throw new common_1.BadRequestException(`scopeId is required for ${scopeType} scope`);
        }
        if (scopeType === 'branch') {
            const exists = await this.branchesService.exists(scopeId);
            if (!exists) {
                throw new common_1.BadRequestException('Branch scope not found');
            }
            return;
        }
        const exists = await this.classesService.exists(scopeId);
        if (!exists) {
            throw new common_1.BadRequestException('Class scope not found');
        }
    }
    async ensureScopeManagement(actorId, scopeType, scopeId) {
        if (await this.roleAssignmentsService.hasGlobalAccess(actorId)) {
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
    async ensureCaseManagement(actorId, welfareCase) {
        await this.ensureScopeManagement(actorId, welfareCase.scopeType, welfareCase.scopeId ?? null);
    }
    async ensureCanViewCase(actorId, welfareCase) {
        if (await this.roleAssignmentsService.hasGlobalAccess(actorId)) {
            return;
        }
        if (welfareCase.scopeType === 'global') {
            return;
        }
        const [managedBranches, managedClasses] = await Promise.all([
            this.roleAssignmentsService.managedBranchIds(actorId),
            this.roleAssignmentsService.managedClassIds(actorId),
        ]);
        const scopeId = welfareCase.scopeId ?? null;
        if (welfareCase.scopeType === 'branch' && scopeId) {
            if (managedBranches.includes(scopeId)) {
                return;
            }
            const memberships = await this.membershipsService.listBranchMemberships(actorId);
            const hasMemberAccess = memberships.some((membership) => membership.status === 'approved' &&
                membership.branchId === scopeId);
            if (hasMemberAccess) {
                return;
            }
            throw new common_1.ForbiddenException('Not authorized for this welfare case');
        }
        if (welfareCase.scopeType === 'class' && scopeId) {
            if (managedClasses.includes(scopeId)) {
                return;
            }
            const classMembership = await this.membershipsService.getClassMembership(actorId);
            if (classMembership?.classId === scopeId) {
                return;
            }
            throw new common_1.ForbiddenException('Not authorized for this welfare case');
        }
    }
    async ensureCaseContributionAccess(actorId, welfareCase) {
        await this.ensureCanViewCase(actorId, welfareCase);
    }
    async resolveReadableScopeAccess(actorId) {
        const [hasGlobalAccess, managedBranchIds, managedClassIds, branchMemberships, classMembership,] = await Promise.all([
            this.roleAssignmentsService.hasGlobalAccess(actorId),
            this.roleAssignmentsService.managedBranchIds(actorId),
            this.roleAssignmentsService.managedClassIds(actorId),
            this.membershipsService.listBranchMemberships(actorId),
            this.membershipsService.getClassMembership(actorId),
        ]);
        const readableBranchIds = new Set(managedBranchIds);
        branchMemberships
            .filter((membership) => membership.status === 'approved')
            .forEach((membership) => readableBranchIds.add(membership.branchId));
        const readableClassIds = new Set(managedClassIds);
        if (classMembership?.classId) {
            readableClassIds.add(classMembership.classId);
        }
        return {
            hasGlobalAccess,
            readableBranchIds: Array.from(readableBranchIds),
            readableClassIds: Array.from(readableClassIds),
        };
    }
    async listAccessibleCasesForActor(actorId, scopeType, scopeId) {
        const hasGlobalAccess = await this.roleAssignmentsService.hasGlobalAccess(actorId);
        const query = {};
        if (scopeType) {
            if (scopeType === 'global') {
                if (!hasGlobalAccess) {
                    throw new common_1.ForbiddenException('Not authorized for global welfare queue');
                }
                query.scopeType = 'global';
            }
            else {
                await this.ensureScopeManagement(actorId, scopeType, scopeId ?? null);
                query.scopeType = scopeType;
                if (scopeId) {
                    query.scopeId = scopeId;
                }
            }
        }
        else if (!hasGlobalAccess) {
            const [managedBranches, managedClasses] = await Promise.all([
                this.roleAssignmentsService.managedBranchIds(actorId),
                this.roleAssignmentsService.managedClassIds(actorId),
            ]);
            query.$or = [
                { scopeType: 'branch', scopeId: { $in: managedBranches } },
                { scopeType: 'class', scopeId: { $in: managedClasses } },
            ];
        }
        return this.caseModel.find(query).exec();
    }
    async refreshCaseTotals(caseId) {
        const [caseRecord, approvedContributions, approvedPayouts] = await Promise.all([
            this.caseModel.findById(caseId).exec(),
            this.contributionModel
                .find({
                caseId,
                $or: [
                    { status: 'approved' },
                    { status: { $exists: false } },
                ],
            })
                .select('amount')
                .lean()
                .exec(),
            this.payoutModel
                .find({
                caseId,
                $or: [
                    { status: 'approved' },
                    { status: { $exists: false } },
                ],
            })
                .select('amount')
                .lean()
                .exec(),
        ]);
        if (!caseRecord) {
            return;
        }
        const totalRaised = approvedContributions.reduce((sum, contribution) => sum + Number(contribution.amount ?? 0), 0);
        const totalDisbursed = approvedPayouts.reduce((sum, payout) => sum + Number(payout.amount ?? 0), 0);
        caseRecord.totalRaised = Number(totalRaised.toFixed(2));
        caseRecord.totalDisbursed = Number(totalDisbursed.toFixed(2));
        if ((caseRecord.targetAmount ?? 0) > 0) {
            if (caseRecord.totalDisbursed >= caseRecord.targetAmount) {
                caseRecord.status = 'closed';
            }
        }
        await caseRecord.save();
    }
    createdAtIso(row) {
        const createdAt = row.createdAt;
        return createdAt?.toISOString();
    }
};
exports.WelfareService = WelfareService;
exports.WelfareService = WelfareService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(welfare_category_schema_1.WelfareCategory.name)),
    __param(1, (0, mongoose_1.InjectModel)(welfare_case_schema_1.WelfareCase.name)),
    __param(2, (0, mongoose_1.InjectModel)(welfare_contribution_schema_1.WelfareContribution.name)),
    __param(3, (0, mongoose_1.InjectModel)(welfare_payout_schema_1.WelfarePayout.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        role_assignments_service_1.RoleAssignmentsService,
        memberships_service_1.MembershipsService,
        branches_service_1.BranchesService,
        classes_service_1.ClassesService,
        users_service_1.UsersService,
        notifications_service_1.NotificationsService,
        audit_logs_service_1.AuditLogsService])
], WelfareService);
//# sourceMappingURL=welfare.service.js.map