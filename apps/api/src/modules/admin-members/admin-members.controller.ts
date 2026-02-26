import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    Param,
    Put,
    Query,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RequireActive } from '../../auth/require-active.decorator';
import {
    AdminMembersService,
    type AdminMemberAccessScope,
} from './admin-members.service';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';
import { UpdateMemberClassDto } from './dto/update-member-class.dto';

@Controller('admin/members')
@RequireActive()
export class AdminMembersController {
    constructor(
        private readonly adminMembersService: AdminMembersService,
        private readonly roleAssignmentsService: RoleAssignmentsService,
    ) {}

    @Get()
    async list(
        @CurrentUser() user: AuthenticatedUser,
        @Query('scopeType') scopeType?: 'global' | 'branch' | 'class',
        @Query('scopeId') scopeId?: string,
    ) {
        const scope = await this.resolveAccessScope(user, scopeType, scopeId);
        return this.adminMembersService.listMembers(scope);
    }

    @Get(':userId')
    async find(
        @Param('userId') userId: string,
        @CurrentUser() user: AuthenticatedUser,
        @Query('scopeType') scopeType?: 'global' | 'branch' | 'class',
        @Query('scopeId') scopeId?: string,
    ) {
        const scope = await this.resolveAccessScope(user, scopeType, scopeId);
        return this.adminMembersService.findMember(userId, scope);
    }

    @Put(':userId/status')
    async updateStatus(
        @Param('userId') userId: string,
        @Body() payload: UpdateMemberStatusDto,
        @CurrentUser() user: AuthenticatedUser,
        @Query('scopeType') scopeType?: 'global' | 'branch' | 'class',
        @Query('scopeId') scopeId?: string,
    ) {
        const scope = await this.resolveAccessScope(user, scopeType, scopeId);
        return this.adminMembersService.updateStatus(
            userId,
            payload.status,
            scope,
        );
    }

    @Put(':userId/class')
    async changeClass(
        @Param('userId') userId: string,
        @Body() payload: UpdateMemberClassDto,
        @CurrentUser() user: AuthenticatedUser,
        @Query('scopeType') scopeType?: 'global' | 'branch' | 'class',
        @Query('scopeId') scopeId?: string,
    ) {
        const scope = await this.resolveAccessScope(user, scopeType, scopeId);
        return this.adminMembersService.changeClass(
            userId,
            payload.classId,
            scope,
        );
    }

    private async resolveAccessScope(
        user: AuthenticatedUser | undefined,
        scopeType?: 'global' | 'branch' | 'class',
        scopeId?: string,
    ): Promise<AdminMemberAccessScope> {
        if (!user) {
            throw new ForbiddenException('Not authorized');
        }

        const normalizedScopeId = scopeId?.trim() || undefined;
        const hasGlobalAccess =
            await this.roleAssignmentsService.hasGlobalAccess(user.id);

        if (hasGlobalAccess) {
            if (!scopeType || scopeType === 'global') {
                return { kind: 'global' };
            }
            if (!normalizedScopeId) {
                throw new BadRequestException(
                    'scopeId is required for branch/class scope',
                );
            }
            if (scopeType === 'branch') {
                return { kind: 'branch', branchId: normalizedScopeId };
            }
            return { kind: 'class', classId: normalizedScopeId };
        }

        const [managedBranchIds, managedClassIds] = await Promise.all([
            this.roleAssignmentsService.managedBranchIds(user.id),
            this.roleAssignmentsService.managedClassIds(user.id),
        ]);

        if (scopeType === 'global') {
            throw new ForbiddenException('Not authorized for global scope');
        }

        if (scopeType === 'branch') {
            const branchId =
                normalizedScopeId ??
                (managedBranchIds.length === 1 ? managedBranchIds[0] : null);
            if (!branchId) {
                throw new BadRequestException(
                    'scopeId is required for branch scope',
                );
            }
            if (!managedBranchIds.includes(branchId)) {
                throw new ForbiddenException(
                    'Not authorized for this branch scope',
                );
            }
            return { kind: 'branch', branchId };
        }

        if (scopeType === 'class') {
            const classId =
                normalizedScopeId ??
                (managedClassIds.length === 1 ? managedClassIds[0] : null);
            if (!classId) {
                throw new BadRequestException(
                    'scopeId is required for class scope',
                );
            }
            if (!managedClassIds.includes(classId)) {
                throw new ForbiddenException(
                    'Not authorized for this class scope',
                );
            }
            return { kind: 'class', classId };
        }

        if (managedBranchIds.length === 0 && managedClassIds.length === 0) {
            throw new ForbiddenException('Not authorized');
        }

        return {
            kind: 'managed',
            branchIds: managedBranchIds,
            classIds: managedClassIds,
        };
    }
}
