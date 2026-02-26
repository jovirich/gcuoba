import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
    WelfareCaseDTO,
    WelfareCaseDetailDTO,
    WelfareCategoryDTO,
    WelfareContributionDTO,
    WelfarePayoutDTO,
    WelfareQueueItemDTO,
} from '@gcuoba/types';
import { Model } from 'mongoose';
import { CreateWelfareCaseDto } from './dto/create-welfare-case.dto';
import { RecordContributionDto } from './dto/record-contribution.dto';
import { RecordPayoutDto } from './dto/record-payout.dto';
import { WelfareCategory } from './schemas/welfare-category.schema';
import { WelfareCase } from './schemas/welfare-case.schema';
import { WelfareContribution } from './schemas/welfare-contribution.schema';
import { WelfarePayout } from './schemas/welfare-payout.schema';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { MembershipsService } from '../memberships/memberships.service';
import { BranchesService } from '../branches/branches.service';
import { ClassesService } from '../classes/classes.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

type WelfareScopeType = 'global' | 'branch' | 'class';
type WelfareQueueStatus = 'pending' | 'approved' | 'rejected';

@Injectable()
export class WelfareService {
    constructor(
        @InjectModel(WelfareCategory.name)
        private readonly categoryModel: Model<WelfareCategory>,
        @InjectModel(WelfareCase.name)
        private readonly caseModel: Model<WelfareCase>,
        @InjectModel(WelfareContribution.name)
        private readonly contributionModel: Model<WelfareContribution>,
        @InjectModel(WelfarePayout.name)
        private readonly payoutModel: Model<WelfarePayout>,
        private readonly roleAssignmentsService: RoleAssignmentsService,
        private readonly membershipsService: MembershipsService,
        private readonly branchesService: BranchesService,
        private readonly classesService: ClassesService,
        private readonly usersService: UsersService,
        private readonly notificationsService: NotificationsService,
        private readonly auditLogsService: AuditLogsService,
    ) {}

    private toCategory(doc: WelfareCategory): WelfareCategoryDTO {
        return {
            id: doc._id.toString(),
            name: doc.name,
            scopeType: doc.scope_type,
            scopeId: doc.scope_id ?? null,
            status: doc.status,
        };
    }

    private toCase(doc: WelfareCase): WelfareCaseDTO {
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

    private toContribution(doc: WelfareContribution): WelfareContributionDTO {
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

    private toPayout(doc: WelfarePayout): WelfarePayoutDTO {
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

    async listCategories(
        actorId: string,
        scopeType?: WelfareScopeType,
        scopeId?: string,
    ): Promise<WelfareCategoryDTO[]> {
        const access = await this.resolveReadableScopeAccess(actorId);
        const query: Record<string, unknown> = { status: 'active' };

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
            } else if (scopeId) {
                query.$or = [
                    { scope_type: 'global', scope_id: null },
                    { scope_type: scopeType, scope_id: scopeId },
                ];
            } else {
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
        } else if (scopeType === 'branch') {
            if (!scopeId) {
                throw new BadRequestException(
                    'scopeId is required for branch scope',
                );
            }
            if (!access.readableBranchIds.includes(scopeId)) {
                throw new ForbiddenException(
                    'Not authorized for this branch scope',
                );
            }
            query.$or = [
                { scope_type: 'global', scope_id: null },
                { scope_type: 'branch', scope_id: scopeId },
            ];
        } else if (scopeType === 'class') {
            if (!scopeId) {
                throw new BadRequestException(
                    'scopeId is required for class scope',
                );
            }
            if (!access.readableClassIds.includes(scopeId)) {
                throw new ForbiddenException(
                    'Not authorized for this class scope',
                );
            }
            query.$or = [
                { scope_type: 'global', scope_id: null },
                { scope_type: 'class', scope_id: scopeId },
            ];
        } else {
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

    async listCases(
        actorId: string,
        scopeType?: WelfareScopeType,
        scopeId?: string,
        includeClosed = false,
    ): Promise<WelfareCaseDTO[]> {
        const access = await this.resolveReadableScopeAccess(actorId);
        const query: Record<string, unknown> = {};
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
        } else if (scopeType === 'branch') {
            if (!scopeId) {
                throw new BadRequestException(
                    'scopeId is required for branch scope',
                );
            }
            if (!access.readableBranchIds.includes(scopeId)) {
                throw new ForbiddenException(
                    'Not authorized for this branch scope',
                );
            }
            query.scopeType = 'branch';
            query.scopeId = scopeId;
        } else if (scopeType === 'class') {
            if (!scopeId) {
                throw new BadRequestException(
                    'scopeId is required for class scope',
                );
            }
            if (!access.readableClassIds.includes(scopeId)) {
                throw new ForbiddenException(
                    'Not authorized for this class scope',
                );
            }
            query.scopeType = 'class';
            query.scopeId = scopeId;
        } else {
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

    async createCase(
        actorId: string,
        dto: CreateWelfareCaseDto,
    ): Promise<WelfareCaseDTO> {
        await this.ensureScopeExists(dto.scopeType, dto.scopeId ?? null);
        await this.ensureScopeManagement(
            actorId,
            dto.scopeType,
            dto.scopeId ?? null,
        );

        const category = await this.categoryModel
            .findById(dto.categoryId)
            .exec();
        if (!category || category.status !== 'active') {
            throw new BadRequestException('Invalid welfare category');
        }

        const scopeMatches =
            category.scope_type === 'global' ||
            (category.scope_type === dto.scopeType &&
                (category.scope_id ?? null) === (dto.scopeId ?? null));
        if (!scopeMatches) {
            throw new BadRequestException(
                'Category does not match selected case scope',
            );
        }

        if (dto.beneficiaryUserId) {
            const user = await this.usersService.findById(
                dto.beneficiaryUserId,
            );
            if (!user) {
                throw new BadRequestException('Beneficiary user not found');
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
            await this.notificationsService.createForUser(
                record.beneficiaryUserId,
                {
                    title: 'Welfare case created',
                    message: `A welfare case "${record.title}" was opened with your profile as beneficiary.`,
                    type: 'info',
                    metadata: {
                        caseId: record._id.toString(),
                    },
                },
            );
        }

        return this.toCase(record);
    }

    async updateCaseStatus(
        actorId: string,
        caseId: string,
        status: 'open' | 'closed',
    ): Promise<WelfareCaseDTO> {
        const welfareCase = await this.caseModel.findById(caseId).exec();
        if (!welfareCase) {
            throw new NotFoundException('Case not found');
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

    async getCase(
        actorId: string,
        caseId: string,
    ): Promise<WelfareCaseDetailDTO> {
        const welfareCase = await this.caseModel.findById(caseId).exec();
        if (!welfareCase) {
            throw new NotFoundException('Case not found');
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

    async recordContribution(
        actorId: string,
        caseId: string,
        dto: RecordContributionDto,
    ): Promise<WelfareContributionDTO> {
        const welfareCase = await this.caseModel.findById(caseId).exec();
        if (!welfareCase) {
            throw new NotFoundException('Case not found');
        }
        if (welfareCase.status !== 'open') {
            throw new BadRequestException('Case is closed');
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

    async recordPayout(
        actorId: string,
        caseId: string,
        dto: RecordPayoutDto,
    ): Promise<WelfarePayoutDTO> {
        const welfareCase = await this.caseModel.findById(caseId).exec();
        if (!welfareCase) {
            throw new NotFoundException('Case not found');
        }
        if (welfareCase.status !== 'open') {
            throw new BadRequestException('Case is closed');
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
            await this.notificationsService.createForUser(
                payout.beneficiaryUserId,
                {
                    title: 'Welfare payout queued for approval',
                    message: `A payout request has been submitted for welfare case "${welfareCase.title}".`,
                    type: 'info',
                    metadata: {
                        caseId: welfareCase._id.toString(),
                        payoutId: payout._id.toString(),
                    },
                },
            );
        }

        return this.toPayout(payout);
    }

    async approveContribution(
        actorId: string,
        contributionId: string,
        note?: string,
    ): Promise<WelfareContributionDTO> {
        const contribution = await this.contributionModel
            .findById(contributionId)
            .exec();
        if (!contribution) {
            throw new NotFoundException('Contribution not found');
        }
        const welfareCase = await this.caseModel
            .findById(contribution.caseId)
            .exec();
        if (!welfareCase) {
            throw new NotFoundException('Case not found');
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

    async rejectContribution(
        actorId: string,
        contributionId: string,
        note?: string,
    ): Promise<WelfareContributionDTO> {
        if (!note?.trim()) {
            throw new BadRequestException('Rejection note is required');
        }

        const contribution = await this.contributionModel
            .findById(contributionId)
            .exec();
        if (!contribution) {
            throw new NotFoundException('Contribution not found');
        }
        const welfareCase = await this.caseModel
            .findById(contribution.caseId)
            .exec();
        if (!welfareCase) {
            throw new NotFoundException('Case not found');
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

    async approvePayout(
        actorId: string,
        payoutId: string,
        note?: string,
    ): Promise<WelfarePayoutDTO> {
        const payout = await this.payoutModel.findById(payoutId).exec();
        if (!payout) {
            throw new NotFoundException('Payout not found');
        }
        const welfareCase = await this.caseModel.findById(payout.caseId).exec();
        if (!welfareCase) {
            throw new NotFoundException('Case not found');
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
            await this.notificationsService.createForUser(
                payout.beneficiaryUserId,
                {
                    title: 'Welfare payout approved',
                    message: `A welfare payout for "${welfareCase.title}" has been approved.`,
                    type: 'success',
                    metadata: {
                        caseId: welfareCase._id.toString(),
                        payoutId: payout._id.toString(),
                    },
                },
            );
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

    async rejectPayout(
        actorId: string,
        payoutId: string,
        note?: string,
    ): Promise<WelfarePayoutDTO> {
        if (!note?.trim()) {
            throw new BadRequestException('Rejection note is required');
        }

        const payout = await this.payoutModel.findById(payoutId).exec();
        if (!payout) {
            throw new NotFoundException('Payout not found');
        }
        const welfareCase = await this.caseModel.findById(payout.caseId).exec();
        if (!welfareCase) {
            throw new NotFoundException('Case not found');
        }
        await this.ensureCaseManagement(actorId, welfareCase);

        payout.status = 'rejected';
        payout.reviewedBy = actorId;
        payout.reviewedAt = new Date();
        payout.reviewNote = note;
        await payout.save();
        await this.refreshCaseTotals(welfareCase._id.toString());
        if (payout.beneficiaryUserId) {
            await this.notificationsService.createForUser(
                payout.beneficiaryUserId,
                {
                    title: 'Welfare payout rejected',
                    message: `A welfare payout for "${welfareCase.title}" was rejected.`,
                    type: 'warning',
                    metadata: {
                        caseId: welfareCase._id.toString(),
                        payoutId: payout._id.toString(),
                        reviewNote: note,
                    },
                },
            );
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

    async listQueue(
        actorId: string,
        scopeType?: WelfareScopeType,
        scopeId?: string,
        status: WelfareQueueStatus = 'pending',
    ): Promise<WelfareQueueItemDTO[]> {
        const cases = await this.listAccessibleCasesForActor(
            actorId,
            scopeType,
            scopeId,
        );
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

        const caseMap = new Map(
            cases.map((record) => [record._id.toString(), record]),
        );
        const queue: WelfareQueueItemDTO[] = [];

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
                submittedAt:
                    entry.paidAt?.toISOString() ??
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
                submittedAt:
                    entry.disbursedAt?.toISOString() ??
                    this.createdAtIso(entry) ??
                    undefined,
                submittedBy:
                    welfareCase.beneficiaryName ?? 'Beneficiary payout',
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

    private async ensureScopeExists(
        scopeType: WelfareScopeType,
        scopeId: string | null,
    ) {
        if (scopeType === 'global') {
            return;
        }
        if (!scopeId) {
            throw new BadRequestException(
                `scopeId is required for ${scopeType} scope`,
            );
        }

        if (scopeType === 'branch') {
            const exists = await this.branchesService.exists(scopeId);
            if (!exists) {
                throw new BadRequestException('Branch scope not found');
            }
            return;
        }

        const exists = await this.classesService.exists(scopeId);
        if (!exists) {
            throw new BadRequestException('Class scope not found');
        }
    }

    private async ensureScopeManagement(
        actorId: string,
        scopeType: WelfareScopeType,
        scopeId: string | null,
    ) {
        if (await this.roleAssignmentsService.hasGlobalAccess(actorId)) {
            return;
        }

        if (scopeType === 'global') {
            throw new ForbiddenException('Not authorized for global scope');
        }
        if (!scopeId) {
            throw new BadRequestException('scopeId is required');
        }

        if (scopeType === 'branch') {
            const managed =
                await this.roleAssignmentsService.managedBranchIds(actorId);
            if (!managed.includes(scopeId)) {
                throw new ForbiddenException(
                    'Not authorized for this branch scope',
                );
            }
            return;
        }

        const managed =
            await this.roleAssignmentsService.managedClassIds(actorId);
        if (!managed.includes(scopeId)) {
            throw new ForbiddenException('Not authorized for this class scope');
        }
    }

    private async ensureCaseManagement(
        actorId: string,
        welfareCase: WelfareCase,
    ) {
        await this.ensureScopeManagement(
            actorId,
            welfareCase.scopeType,
            welfareCase.scopeId ?? null,
        );
    }

    private async ensureCanViewCase(actorId: string, welfareCase: WelfareCase) {
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
            const memberships =
                await this.membershipsService.listBranchMemberships(actorId);
            const hasMemberAccess = memberships.some(
                (membership) =>
                    membership.status === 'approved' &&
                    membership.branchId === scopeId,
            );
            if (hasMemberAccess) {
                return;
            }
            throw new ForbiddenException(
                'Not authorized for this welfare case',
            );
        }

        if (welfareCase.scopeType === 'class' && scopeId) {
            if (managedClasses.includes(scopeId)) {
                return;
            }
            const classMembership =
                await this.membershipsService.getClassMembership(actorId);
            if (classMembership?.classId === scopeId) {
                return;
            }
            throw new ForbiddenException(
                'Not authorized for this welfare case',
            );
        }
    }

    private async ensureCaseContributionAccess(
        actorId: string,
        welfareCase: WelfareCase,
    ) {
        await this.ensureCanViewCase(actorId, welfareCase);
    }

    private async resolveReadableScopeAccess(actorId: string): Promise<{
        hasGlobalAccess: boolean;
        readableBranchIds: string[];
        readableClassIds: string[];
    }> {
        const [
            hasGlobalAccess,
            managedBranchIds,
            managedClassIds,
            branchMemberships,
            classMembership,
        ] = await Promise.all([
            this.roleAssignmentsService.hasGlobalAccess(actorId),
            this.roleAssignmentsService.managedBranchIds(actorId),
            this.roleAssignmentsService.managedClassIds(actorId),
            this.membershipsService.listBranchMemberships(actorId),
            this.membershipsService.getClassMembership(actorId),
        ]);

        const readableBranchIds = new Set(managedBranchIds);
        branchMemberships
            .filter((membership) => membership.status === 'approved')
            .forEach((membership) =>
                readableBranchIds.add(membership.branchId),
            );

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

    private async listAccessibleCasesForActor(
        actorId: string,
        scopeType?: WelfareScopeType,
        scopeId?: string,
    ) {
        const hasGlobalAccess =
            await this.roleAssignmentsService.hasGlobalAccess(actorId);
        const query: Record<string, unknown> = {};

        if (scopeType) {
            if (scopeType === 'global') {
                if (!hasGlobalAccess) {
                    throw new ForbiddenException(
                        'Not authorized for global welfare queue',
                    );
                }
                query.scopeType = 'global';
            } else {
                await this.ensureScopeManagement(
                    actorId,
                    scopeType,
                    scopeId ?? null,
                );
                query.scopeType = scopeType;
                if (scopeId) {
                    query.scopeId = scopeId;
                }
            }
        } else if (!hasGlobalAccess) {
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

    private async refreshCaseTotals(caseId: string) {
        const [caseRecord, approvedContributions, approvedPayouts] =
            await Promise.all([
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
                    .lean<Array<{ amount: number }>>()
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
                    .lean<Array<{ amount: number }>>()
                    .exec(),
            ]);
        if (!caseRecord) {
            return;
        }

        const totalRaised = approvedContributions.reduce(
            (sum, contribution) => sum + Number(contribution.amount ?? 0),
            0,
        );
        const totalDisbursed = approvedPayouts.reduce(
            (sum, payout) => sum + Number(payout.amount ?? 0),
            0,
        );
        caseRecord.totalRaised = Number(totalRaised.toFixed(2));
        caseRecord.totalDisbursed = Number(totalDisbursed.toFixed(2));

        if ((caseRecord.targetAmount ?? 0) > 0) {
            if (caseRecord.totalDisbursed >= caseRecord.targetAmount) {
                caseRecord.status = 'closed';
            }
        }

        await caseRecord.save();
    }

    private createdAtIso(
        row: WelfareContribution | WelfarePayout,
    ): string | undefined {
        const createdAt = (
            row as
                | (WelfareContribution & { createdAt?: Date })
                | (WelfarePayout & { createdAt?: Date })
        ).createdAt;
        return createdAt?.toISOString();
    }
}
