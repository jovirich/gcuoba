import type { RoleDTO, RoleFeatureDTO } from '@gcuoba/types';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { MembershipsService } from '../memberships/memberships.service';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { UpsertRoleFeatureDto } from './dto/role-feature.dto';
import { RolesService } from './roles.service';
export declare class RolesController {
    private readonly rolesService;
    private readonly roleAssignmentsService;
    private readonly membershipsService;
    constructor(rolesService: RolesService, roleAssignmentsService: RoleAssignmentsService, membershipsService: MembershipsService);
    findAll(): Promise<RoleDTO[]>;
    listFeatureModules(): {
        key: string;
        label: string;
    }[];
    listAllFeatures(): Promise<RoleFeatureDTO[]>;
    executiveAccess(user: AuthenticatedUser): Promise<{
        allowed: boolean;
        hasMemberFoundation: boolean;
        hasClassMembership: boolean;
        hasApprovedBranchMembership: boolean;
    }>;
    listRoleFeatures(roleId: string): Promise<RoleFeatureDTO[]>;
    featureAccess(moduleKey: string, user: AuthenticatedUser, scopeType?: 'global' | 'branch' | 'class', scopeId?: string): Promise<{
        allowed: boolean;
    }>;
    upsertRoleFeature(roleId: string, moduleKey: string, dto: UpsertRoleFeatureDto, user: AuthenticatedUser): Promise<RoleFeatureDTO>;
    removeRoleFeature(roleId: string, moduleKey: string, user: AuthenticatedUser): Promise<{
        success: boolean;
    }>;
    private ensureGlobal;
}
