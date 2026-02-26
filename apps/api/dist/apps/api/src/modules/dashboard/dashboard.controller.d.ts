import type { DashboardSummaryDTO } from '@gcuoba/types';
import { DashboardService } from './dashboard.service';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getSummary(userId: string, user: AuthenticatedUser): Promise<DashboardSummaryDTO>;
}
