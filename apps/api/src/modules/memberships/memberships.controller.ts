import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import type { BranchMembershipDTO, ClassMembershipDTO } from '@gcuoba/types';
import { MembershipsService } from './memberships.service';
import { RequestBranchMembershipDto } from './dto/request-branch-membership.dto';
import { UpdateClassMembershipDto } from './dto/update-class-membership.dto';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RequireActive } from '../../auth/require-active.decorator';

@Controller('memberships')
export class MembershipsController {
    constructor(private readonly membershipsService: MembershipsService) {}

    @Get('branches/:userId')
    listBranchMemberships(
        @Param('userId') userId: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BranchMembershipDTO[]> {
        this.ensureSelf(user, userId);
        return this.membershipsService.listBranchMemberships(userId);
    }

    @Post('branches/:userId')
    @RequireActive()
    requestBranchMembership(
        @Param('userId') userId: string,
        @Body() payload: RequestBranchMembershipDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BranchMembershipDTO> {
        this.ensureSelf(user, userId);
        return this.membershipsService.requestBranchMembership(userId, payload);
    }

    @Get('class/:userId')
    getClassMembership(
        @Param('userId') userId: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ClassMembershipDTO | null> {
        this.ensureSelf(user, userId);
        return this.membershipsService.getClassMembership(userId);
    }

    @Put('class/:userId')
    updateClassMembership(
        @Param('userId') userId: string,
        @Body() payload: UpdateClassMembershipDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ClassMembershipDTO> {
        this.ensureSelf(user, userId);
        return this.membershipsService.updateClassMembership(userId, payload);
    }

    private ensureSelf(user: AuthenticatedUser | undefined, userId: string) {
        if (!user || user.id !== userId) {
            throw new ForbiddenException(
                'Cannot access memberships for another user',
            );
        }
    }
}
