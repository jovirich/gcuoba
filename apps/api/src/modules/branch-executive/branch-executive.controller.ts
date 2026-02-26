import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    Param,
    Post,
} from '@nestjs/common';
import type {
    BranchExecutiveSummaryDTO,
    BranchMembershipDTO,
} from '@gcuoba/types';
import { BranchExecutiveService } from './branch-executive.service';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RequireActive } from '../../auth/require-active.decorator';
import { RecordHandoverDto } from './dto/record-handover.dto';

class MembershipDecisionDto {
    note?: string;
}

@Controller('branch-executive')
@RequireActive()
export class BranchExecutiveController {
    constructor(
        private readonly branchExecutiveService: BranchExecutiveService,
    ) {}

    @Get(':userId')
    summary(
        @Param('userId') userId: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BranchExecutiveSummaryDTO> {
        this.ensureActor(user, userId);
        return this.branchExecutiveService.getSummary(userId);
    }

    @Post(':userId/memberships/:membershipId/approve')
    approve(
        @Param('userId') userId: string,
        @Param('membershipId') membershipId: string,
        @Body() body: MembershipDecisionDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BranchMembershipDTO> {
        this.ensureActor(user, userId);
        return this.branchExecutiveService.approveMembership(
            userId,
            membershipId,
            body.note,
        );
    }

    @Post(':userId/memberships/:membershipId/reject')
    reject(
        @Param('userId') userId: string,
        @Param('membershipId') membershipId: string,
        @Body() body: MembershipDecisionDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BranchMembershipDTO> {
        this.ensureActor(user, userId);
        return this.branchExecutiveService.rejectMembership(
            userId,
            membershipId,
            body.note ?? '',
        );
    }

    @Post(':userId/handover')
    handover(
        @Param('userId') userId: string,
        @Body() body: RecordHandoverDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<void> {
        this.ensureActor(user, userId);
        return this.branchExecutiveService.recordHandover(userId, body);
    }

    private ensureActor(user: AuthenticatedUser | undefined, userId: string) {
        if (!user || user.id !== userId) {
            throw new ForbiddenException(
                'Not authorized for this branch executive action',
            );
        }
    }
}
