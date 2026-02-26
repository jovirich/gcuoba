import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { DashboardSummaryDTO } from '@gcuoba/types';
import { UsersService } from '../users/users.service';
import { BranchesService } from '../branches/branches.service';
import { MembershipsService } from '../memberships/memberships.service';
import { FinanceService } from '../finance/finance.service';
import { WelfareService } from '../welfare/welfare.service';
import { Announcement } from './schemas/announcement.schema';
import { DashboardEvent } from './schemas/event.schema';

@Injectable()
export class DashboardService {
    constructor(
        private readonly usersService: UsersService,
        private readonly branchesService: BranchesService,
        private readonly membershipsService: MembershipsService,
        private readonly financeService: FinanceService,
        private readonly welfareService: WelfareService,
        @InjectModel(Announcement.name)
        private readonly announcementModel: Model<Announcement>,
        @InjectModel(DashboardEvent.name)
        private readonly eventModel: Model<DashboardEvent>,
    ) {}

    async buildSummary(userId: string): Promise<DashboardSummaryDTO> {
        const [
            user,
            branches,
            branchMemberships,
            classMembership,
            outstandingInvoices,
            welfareCases,
            duesSummary,
        ] = await Promise.all([
            this.usersService.findById(userId),
            this.branchesService.findAll(),
            this.membershipsService.listBranchMemberships(userId),
            this.membershipsService.getClassMembership(userId),
            this.financeService.listOutstandingInvoices(userId),
            this.welfareService.listCases(userId),
            this.financeService.buildMemberDuesSummary(userId),
        ]);

        const approvedBranchIds = branchMemberships
            .filter((membership) => membership.status === 'approved')
            .map((membership) => membership.branchId);
        const classId = classMembership?.classId ?? null;

        const [announcements, events] = await Promise.all([
            this.listAnnouncementsForUser(approvedBranchIds, classId),
            this.listEventsForUser(approvedBranchIds, classId),
        ]);

        return {
            user,
            branches,
            branchMemberships,
            classMembership,
            outstandingInvoices,
            welfareCases,
            announcements,
            events,
            duesSummary,
        };
    }

    private async listAnnouncementsForUser(
        branchIds: string[],
        classId: string | null,
    ) {
        const scopes: Record<string, unknown>[] = [{ scopeType: 'global' }];
        if (branchIds.length > 0) {
            scopes.push({ scopeType: 'branch', scopeId: { $in: branchIds } });
        }
        if (classId) {
            scopes.push({ scopeType: 'class', scopeId: classId });
        }

        const docs = await this.announcementModel
            .find({
                status: 'published',
                publishedAt: { $lte: new Date() },
                $or: scopes,
            })
            .sort({ publishedAt: -1 })
            .limit(5)
            .lean()
            .exec();

        return docs.map((doc) => ({
            id: doc._id.toString(),
            title: doc.title,
            body: doc.body,
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            publishedAt: doc.publishedAt?.toISOString(),
            status: doc.status ?? 'draft',
        }));
    }

    private async listEventsForUser(
        branchIds: string[],
        classId: string | null,
    ) {
        const scopes: Record<string, unknown>[] = [{ scopeType: 'global' }];
        if (branchIds.length > 0) {
            scopes.push({ scopeType: 'branch', scopeId: { $in: branchIds } });
        }
        if (classId) {
            scopes.push({ scopeType: 'class', scopeId: classId });
        }

        const now = new Date();
        const docs = await this.eventModel
            .find({
                status: 'published',
                startAt: { $gte: now },
                $or: scopes,
            })
            .sort({ startAt: 1 })
            .limit(5)
            .lean()
            .exec();

        return docs.map((doc) => ({
            id: doc._id.toString(),
            title: doc.title,
            description: doc.description ?? null,
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            location: doc.location ?? null,
            startAt: doc.startAt?.toISOString(),
            endAt: doc.endAt?.toISOString(),
            status: doc.status,
        }));
    }
}
