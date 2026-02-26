import type { RoleDTO, RoleFeatureDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { MembershipsService } from '../memberships/memberships.service';
import { RoleAssignment } from '../role-assignments/schemas/role-assignment.schema';
import { Role } from './schemas/role.schema';
import { RoleFeature } from './schemas/role-feature.schema';
export declare class RolesService {
    private readonly roleModel;
    private readonly roleFeatureModel;
    private readonly roleAssignmentModel;
    private readonly membershipsService;
    constructor(roleModel: Model<Role>, roleFeatureModel: Model<RoleFeature>, roleAssignmentModel: Model<RoleAssignment>, membershipsService: MembershipsService);
    findAll(): Promise<RoleDTO[]>;
    listFeatureModules(): {
        key: string;
        label: string;
    }[];
    listAllFeatures(): Promise<RoleFeatureDTO[]>;
    listRoleFeatures(roleId: string): Promise<RoleFeatureDTO[]>;
    upsertRoleFeature(roleId: string, moduleKey: string, allowed: boolean): Promise<RoleFeatureDTO>;
    removeRoleFeature(roleId: string, moduleKey: string): Promise<void>;
    userHasFeature(userId: string, moduleKey: string, scopeType?: 'global' | 'branch' | 'class', scopeId?: string | null): Promise<boolean>;
    private activeAssignmentFilter;
    private isExecutiveEligibleMember;
    private normalizeRoleCode;
    private toFeatureDto;
}
