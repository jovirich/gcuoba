import type { Model } from 'mongoose';
import type { DashboardSummaryDTO } from '@gcuoba/types';
import { UsersService } from '../users/users.service';
import { BranchesService } from '../branches/branches.service';
import { MembershipsService } from '../memberships/memberships.service';
import { FinanceService } from '../finance/finance.service';
import { WelfareService } from '../welfare/welfare.service';
import { Announcement } from './schemas/announcement.schema';
import { DashboardEvent } from './schemas/event.schema';
export declare class DashboardService {
    private readonly usersService;
    private readonly branchesService;
    private readonly membershipsService;
    private readonly financeService;
    private readonly welfareService;
    private readonly announcementModel;
    private readonly eventModel;
    constructor(usersService: UsersService, branchesService: BranchesService, membershipsService: MembershipsService, financeService: FinanceService, welfareService: WelfareService, announcementModel: Model<Announcement>, eventModel: Model<DashboardEvent>);
    buildSummary(userId: string): Promise<DashboardSummaryDTO>;
    private listAnnouncementsForUser;
    private listEventsForUser;
}
