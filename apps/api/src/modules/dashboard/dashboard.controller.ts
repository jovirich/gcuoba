import { Controller, ForbiddenException, Get, Param } from '@nestjs/common';
import type { DashboardSummaryDTO } from '@gcuoba/types';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RequireActive } from '../../auth/require-active.decorator';

@Controller('dashboard')
@RequireActive()
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get(':userId')
    getSummary(
        @Param('userId') userId: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<DashboardSummaryDTO> {
        if (!user || user.id !== userId) {
            throw new ForbiddenException(
                'Cannot access another member dashboard',
            );
        }
        return this.dashboardService.buildSummary(userId);
    }
}
