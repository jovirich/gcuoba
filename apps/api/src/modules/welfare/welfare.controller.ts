import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { WelfareService } from './welfare.service';
import { CreateWelfareCaseDto } from './dto/create-welfare-case.dto';
import { RecordContributionDto } from './dto/record-contribution.dto';
import { RecordPayoutDto } from './dto/record-payout.dto';
import { ReviewWelfareEntryDto } from './dto/review-welfare-entry.dto';
import { UpdateWelfareCaseStatusDto } from './dto/update-welfare-case-status.dto';
import { RequireActive } from '../../auth/require-active.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';

type WelfareScopeType = 'global' | 'branch' | 'class';
type WelfareQueueStatus = 'pending' | 'approved' | 'rejected';

@Controller('welfare')
@RequireActive()
export class WelfareController {
    constructor(private readonly welfareService: WelfareService) {}

    @Get('categories')
    listCategories(
        @CurrentUser() user: AuthenticatedUser,
        @Query('scopeType') scopeType?: string,
        @Query('scopeId') scopeId?: string,
    ) {
        return this.welfareService.listCategories(
            user.id,
            this.parseScopeType(scopeType),
            scopeId,
        );
    }

    @Get('cases')
    listCases(
        @CurrentUser() user: AuthenticatedUser,
        @Query('scopeType') scopeType?: string,
        @Query('scopeId') scopeId?: string,
        @Query('includeClosed') includeClosed?: string,
    ) {
        return this.welfareService.listCases(
            user.id,
            this.parseScopeType(scopeType),
            scopeId,
            includeClosed === 'true',
        );
    }

    @Post('cases')
    createCase(
        @Body() dto: CreateWelfareCaseDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.welfareService.createCase(user.id, dto);
    }

    @Patch('cases/:caseId/status')
    updateCaseStatus(
        @CurrentUser() user: AuthenticatedUser,
        @Param('caseId') caseId: string,
        @Body() dto: UpdateWelfareCaseStatusDto,
    ) {
        return this.welfareService.updateCaseStatus(
            user.id,
            caseId,
            dto.status,
        );
    }

    @Get('cases/:caseId')
    getCase(
        @CurrentUser() user: AuthenticatedUser,
        @Param('caseId') caseId: string,
    ) {
        return this.welfareService.getCase(user.id, caseId);
    }

    @Post('cases/:caseId/contributions')
    recordContribution(
        @CurrentUser() user: AuthenticatedUser,
        @Param('caseId') caseId: string,
        @Body() dto: RecordContributionDto,
    ) {
        return this.welfareService.recordContribution(user.id, caseId, dto);
    }

    @Post('cases/:caseId/payouts')
    recordPayout(
        @CurrentUser() user: AuthenticatedUser,
        @Param('caseId') caseId: string,
        @Body() dto: RecordPayoutDto,
    ) {
        return this.welfareService.recordPayout(user.id, caseId, dto);
    }

    @Get('queue')
    listQueue(
        @CurrentUser() user: AuthenticatedUser,
        @Query('scopeType') scopeType?: string,
        @Query('scopeId') scopeId?: string,
        @Query('status') status?: string,
    ) {
        return this.welfareService.listQueue(
            user.id,
            this.parseScopeType(scopeType),
            scopeId,
            this.parseQueueStatus(status),
        );
    }

    @Post('contributions/:contributionId/approve')
    approveContribution(
        @CurrentUser() user: AuthenticatedUser,
        @Param('contributionId') contributionId: string,
        @Body() dto: ReviewWelfareEntryDto,
    ) {
        return this.welfareService.approveContribution(
            user.id,
            contributionId,
            dto.note,
        );
    }

    @Post('contributions/:contributionId/reject')
    rejectContribution(
        @CurrentUser() user: AuthenticatedUser,
        @Param('contributionId') contributionId: string,
        @Body() dto: ReviewWelfareEntryDto,
    ) {
        return this.welfareService.rejectContribution(
            user.id,
            contributionId,
            dto.note,
        );
    }

    @Post('payouts/:payoutId/approve')
    approvePayout(
        @CurrentUser() user: AuthenticatedUser,
        @Param('payoutId') payoutId: string,
        @Body() dto: ReviewWelfareEntryDto,
    ) {
        return this.welfareService.approvePayout(user.id, payoutId, dto.note);
    }

    @Post('payouts/:payoutId/reject')
    rejectPayout(
        @CurrentUser() user: AuthenticatedUser,
        @Param('payoutId') payoutId: string,
        @Body() dto: ReviewWelfareEntryDto,
    ) {
        return this.welfareService.rejectPayout(user.id, payoutId, dto.note);
    }

    private parseScopeType(scopeType?: string): WelfareScopeType | undefined {
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

    private parseQueueStatus(status?: string): WelfareQueueStatus {
        if (!status) {
            return 'pending';
        }
        if (
            status === 'pending' ||
            status === 'approved' ||
            status === 'rejected'
        ) {
            return status;
        }
        throw new BadRequestException('Invalid queue status');
    }
}
