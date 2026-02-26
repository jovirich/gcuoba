import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    Post,
    Query,
} from '@nestjs/common';
import type { RoleAssignmentDTO } from '@gcuoba/types';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RequireActive } from '../../auth/require-active.decorator';
import { CreateRoleAssignmentDto } from './dto/create-role-assignment.dto';
import { RoleAssignmentsService } from './role-assignments.service';
import { MembershipsService } from '../memberships/memberships.service';

@Controller('roles')
@RequireActive()
export class RoleAssignmentsController {
    constructor(
        private readonly roleAssignmentsService: RoleAssignmentsService,
        private readonly membershipsService: MembershipsService,
    ) {}

    @Get('assignments/me')
    async me(
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<RoleAssignmentDTO[]> {
        return this.roleAssignmentsService.activeAssignmentsForUser(user.id);
    }

    @Get('assignments')
    @RequireActive()
    async listAssignments(
        @CurrentUser() user: AuthenticatedUser,
        @Query('userId') userId?: string,
    ): Promise<RoleAssignmentDTO[]> {
        const targetUser = userId ?? user.id;
        if (
            userId &&
            !(await this.roleAssignmentsService.hasGlobalAccess(user.id))
        ) {
            throw new ForbiddenException('Not authorized');
        }
        return this.roleAssignmentsService.activeAssignmentsForUser(targetUser);
    }

    @Post('assignments')
    async assignRole(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateRoleAssignmentDto,
    ): Promise<RoleAssignmentDTO> {
        await this.ensureWritableScope(user.id, dto);
        await this.ensureTargetMemberInScope(dto.userId, dto);
        return this.roleAssignmentsService.createRoleAssignment(dto);
    }

    private async ensureWritableScope(
        actorId: string,
        dto: CreateRoleAssignmentDto,
    ) {
        if (await this.roleAssignmentsService.hasGlobalAccess(actorId)) {
            return;
        }

        if (dto.scopeType === 'global') {
            throw new ForbiddenException('Not authorized for global roles');
        }

        const scopeId = dto.scopeId?.trim();
        if (!scopeId) {
            throw new BadRequestException(
                'scopeId is required for branch/class assignments',
            );
        }

        if (dto.scopeType === 'branch') {
            const managedBranchIds =
                await this.roleAssignmentsService.managedBranchIds(actorId);
            if (!managedBranchIds.includes(scopeId)) {
                throw new ForbiddenException(
                    'Not authorized for this branch scope',
                );
            }
            return;
        }

        const managedClassIds =
            await this.roleAssignmentsService.managedClassIds(actorId);
        if (!managedClassIds.includes(scopeId)) {
            throw new ForbiddenException('Not authorized for this class scope');
        }
    }

    private async ensureTargetMemberInScope(
        userId: string,
        dto: CreateRoleAssignmentDto,
    ) {
        if (dto.scopeType === 'global') {
            return;
        }

        const scopeId = dto.scopeId?.trim();
        if (!scopeId) {
            throw new BadRequestException(
                'scopeId is required for branch/class assignments',
            );
        }

        if (dto.scopeType === 'branch') {
            const memberships =
                await this.membershipsService.listBranchMemberships(userId);
            const isApprovedInBranch = memberships.some(
                (membership) =>
                    membership.branchId === scopeId &&
                    membership.status === 'approved',
            );
            if (!isApprovedInBranch) {
                throw new BadRequestException(
                    'Selected member is not approved for the target branch scope',
                );
            }
            return;
        }

        const classMembership =
            await this.membershipsService.getClassMembership(userId);
        if (classMembership?.classId !== scopeId) {
            throw new BadRequestException(
                'Selected member is not in the target class scope',
            );
        }
    }
}
