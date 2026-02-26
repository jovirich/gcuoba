import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    Query,
    Put,
} from '@nestjs/common';
import type { RoleDTO, RoleFeatureDTO } from '@gcuoba/types';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RequireActive } from '../../auth/require-active.decorator';
import { MembershipsService } from '../memberships/memberships.service';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { UpsertRoleFeatureDto } from './dto/role-feature.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
    constructor(
        private readonly rolesService: RolesService,
        private readonly roleAssignmentsService: RoleAssignmentsService,
        private readonly membershipsService: MembershipsService,
    ) {}

    @Get()
    findAll(): Promise<RoleDTO[]> {
        return this.rolesService.findAll();
    }

    @Get('feature-modules')
    listFeatureModules() {
        return this.rolesService.listFeatureModules();
    }

    @Get('features')
    listAllFeatures(): Promise<RoleFeatureDTO[]> {
        return this.rolesService.listAllFeatures();
    }

    @Get('access/executive')
    @RequireActive()
    async executiveAccess(@CurrentUser() user: AuthenticatedUser) {
        const [
            hasGlobalAccess,
            hasAnyAssignment,
            hasClassMembership,
            hasApprovedBranchMembership,
        ] = await Promise.all([
            this.roleAssignmentsService.hasGlobalAccess(user.id),
            this.roleAssignmentsService.hasAnyActiveAssignment(user.id),
            this.membershipsService.hasClassMembership(user.id),
            this.membershipsService.hasApprovedBranchMembership(user.id),
        ]);
        const hasMemberFoundation = hasClassMembership;
        return {
            allowed:
                (hasGlobalAccess || hasAnyAssignment) && hasMemberFoundation,
            hasMemberFoundation,
            hasClassMembership,
            hasApprovedBranchMembership,
        };
    }

    @Get(':roleId/features')
    listRoleFeatures(
        @Param('roleId') roleId: string,
    ): Promise<RoleFeatureDTO[]> {
        return this.rolesService.listRoleFeatures(roleId);
    }

    @Get('features/access/:moduleKey')
    @RequireActive()
    async featureAccess(
        @Param('moduleKey') moduleKey: string,
        @CurrentUser() user: AuthenticatedUser,
        @Query('scopeType') scopeType?: 'global' | 'branch' | 'class',
        @Query('scopeId') scopeId?: string,
    ) {
        const allowed = await this.rolesService.userHasFeature(
            user.id,
            moduleKey,
            scopeType,
            scopeId,
        );
        return { allowed };
    }

    @Put(':roleId/features/:moduleKey')
    @RequireActive()
    async upsertRoleFeature(
        @Param('roleId') roleId: string,
        @Param('moduleKey') moduleKey: string,
        @Body() dto: UpsertRoleFeatureDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<RoleFeatureDTO> {
        await this.ensureGlobal(user);
        return this.rolesService.upsertRoleFeature(
            roleId,
            moduleKey,
            dto.allowed,
        );
    }

    @Delete(':roleId/features/:moduleKey')
    @RequireActive()
    async removeRoleFeature(
        @Param('roleId') roleId: string,
        @Param('moduleKey') moduleKey: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        await this.ensureGlobal(user);
        await this.rolesService.removeRoleFeature(roleId, moduleKey);
        return { success: true };
    }

    private async ensureGlobal(user?: AuthenticatedUser) {
        if (!user) {
            throw new ForbiddenException('Not authorized');
        }
        const hasAccess = await this.roleAssignmentsService.hasGlobalAccess(
            user.id,
        );
        if (!hasAccess) {
            throw new ForbiddenException('Not authorized');
        }
    }
}
