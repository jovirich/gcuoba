import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { RoleDTO, RoleFeatureDTO } from '@gcuoba/types';
import { Model, Types } from 'mongoose';
import { MembershipsService } from '../memberships/memberships.service';
import { RoleAssignment } from '../role-assignments/schemas/role-assignment.schema';
import { Role } from './schemas/role.schema';
import { RoleFeature } from './schemas/role-feature.schema';
import {
    ROLE_FEATURE_FALLBACK_PERMISSIONS,
    ROLE_FEATURE_MODULES,
} from './role-feature.constants';

@Injectable()
export class RolesService {
    constructor(
        @InjectModel(Role.name) private readonly roleModel: Model<Role>,
        @InjectModel(RoleFeature.name)
        private readonly roleFeatureModel: Model<RoleFeature>,
        @InjectModel(RoleAssignment.name)
        private readonly roleAssignmentModel: Model<RoleAssignment>,
        private readonly membershipsService: MembershipsService,
    ) {}

    async findAll(): Promise<RoleDTO[]> {
        const docs = await this.roleModel.find().lean().exec();

        return docs.map((doc) => ({
            id: doc._id.toString(),
            name: doc.name,
            code: doc.code,
            scope: doc.scope,
        }));
    }

    listFeatureModules() {
        return Object.entries(ROLE_FEATURE_MODULES).map(([key, label]) => ({
            key,
            label,
        }));
    }

    async listAllFeatures(): Promise<RoleFeatureDTO[]> {
        const docs = await this.roleFeatureModel.find().lean().exec();
        return docs.map((doc) => this.toFeatureDto(doc));
    }

    async listRoleFeatures(roleId: string): Promise<RoleFeatureDTO[]> {
        const roleObjectId = new Types.ObjectId(roleId);
        const docs = await this.roleFeatureModel
            .find({ roleId: roleObjectId })
            .sort({ moduleKey: 1 })
            .lean()
            .exec();
        return docs.map((doc) => this.toFeatureDto(doc));
    }

    async upsertRoleFeature(
        roleId: string,
        moduleKey: string,
        allowed: boolean,
    ): Promise<RoleFeatureDTO> {
        if (!ROLE_FEATURE_MODULES[moduleKey]) {
            throw new BadRequestException('Unknown module key');
        }

        const role = await this.roleModel.exists({ _id: roleId });
        if (!role) {
            throw new NotFoundException('Role not found');
        }

        const updated = await this.roleFeatureModel
            .findOneAndUpdate(
                { roleId: new Types.ObjectId(roleId), moduleKey },
                {
                    roleId: new Types.ObjectId(roleId),
                    moduleKey,
                    allowed,
                },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true,
                },
            )
            .exec();

        return this.toFeatureDto(updated);
    }

    async removeRoleFeature(roleId: string, moduleKey: string): Promise<void> {
        await this.roleFeatureModel
            .findOneAndDelete({
                roleId: new Types.ObjectId(roleId),
                moduleKey,
            })
            .exec();
    }

    async userHasFeature(
        userId: string,
        moduleKey: string,
        scopeType?: 'global' | 'branch' | 'class',
        scopeId?: string | null,
    ): Promise<boolean> {
        if (!userId || !moduleKey) {
            return false;
        }

        const hasGlobalAccess = await this.roleAssignmentModel
            .exists({
                userId,
                scopeType: 'global',
                ...this.activeAssignmentFilter(),
            })
            .then(Boolean);

        if (hasGlobalAccess) {
            return true;
        }

        const isEligibleExecutive =
            await this.isExecutiveEligibleMember(userId);
        if (!isEligibleExecutive) {
            return false;
        }

        const assignmentFilter: Record<string, unknown> = {
            userId,
            ...this.activeAssignmentFilter(),
        };

        if (scopeType) {
            assignmentFilter.$or = [
                { scopeType: 'global' },
                {
                    scopeType,
                    ...(scopeId ? { scopeId } : {}),
                },
            ];
        }

        const assignments = await this.roleAssignmentModel
            .find(assignmentFilter)
            .select('roleId roleCode')
            .lean<RoleAssignment[]>()
            .exec();

        if (assignments.length === 0) {
            return false;
        }

        const roleIds = Array.from(
            new Set(
                assignments
                    .map((assignment) => assignment.roleId?.toString())
                    .filter(Boolean),
            ),
        );

        if (roleIds.length > 0) {
            const explicitAllow = await this.roleFeatureModel
                .exists({
                    roleId: {
                        $in: roleIds.map((id) => new Types.ObjectId(id)),
                    },
                    moduleKey,
                    allowed: true,
                })
                .then(Boolean);
            if (explicitAllow) {
                return true;
            }
        }

        const allowedCodes = ROLE_FEATURE_FALLBACK_PERMISSIONS[moduleKey] ?? [];
        if (allowedCodes.length === 0) {
            return false;
        }

        return assignments.some((assignment) => {
            const normalized = this.normalizeRoleCode(assignment.roleCode);
            return normalized ? allowedCodes.includes(normalized) : false;
        });
    }

    private activeAssignmentFilter() {
        return {
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        };
    }

    private async isExecutiveEligibleMember(userId: string): Promise<boolean> {
        return this.membershipsService.hasClassMembership(userId);
    }

    private normalizeRoleCode(roleCode?: string | null): string | null {
        if (!roleCode) {
            return null;
        }
        const normalized = roleCode.replace(
            /_(global|branch|class)(_\d+)?$/,
            '',
        );
        return normalized || null;
    }

    private toFeatureDto(doc: RoleFeature): RoleFeatureDTO {
        return {
            id: doc._id.toString(),
            roleId: doc.roleId.toString(),
            moduleKey: doc.moduleKey,
            allowed: Boolean(doc.allowed),
        };
    }
}
