"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const memberships_service_1 = require("../memberships/memberships.service");
const role_assignment_schema_1 = require("../role-assignments/schemas/role-assignment.schema");
const role_schema_1 = require("./schemas/role.schema");
const role_feature_schema_1 = require("./schemas/role-feature.schema");
const role_feature_constants_1 = require("./role-feature.constants");
let RolesService = class RolesService {
    roleModel;
    roleFeatureModel;
    roleAssignmentModel;
    membershipsService;
    constructor(roleModel, roleFeatureModel, roleAssignmentModel, membershipsService) {
        this.roleModel = roleModel;
        this.roleFeatureModel = roleFeatureModel;
        this.roleAssignmentModel = roleAssignmentModel;
        this.membershipsService = membershipsService;
    }
    async findAll() {
        const docs = await this.roleModel.find().lean().exec();
        return docs.map((doc) => ({
            id: doc._id.toString(),
            name: doc.name,
            code: doc.code,
            scope: doc.scope,
        }));
    }
    listFeatureModules() {
        return Object.entries(role_feature_constants_1.ROLE_FEATURE_MODULES).map(([key, label]) => ({
            key,
            label,
        }));
    }
    async listAllFeatures() {
        const docs = await this.roleFeatureModel.find().lean().exec();
        return docs.map((doc) => this.toFeatureDto(doc));
    }
    async listRoleFeatures(roleId) {
        const roleObjectId = new mongoose_2.Types.ObjectId(roleId);
        const docs = await this.roleFeatureModel
            .find({ roleId: roleObjectId })
            .sort({ moduleKey: 1 })
            .lean()
            .exec();
        return docs.map((doc) => this.toFeatureDto(doc));
    }
    async upsertRoleFeature(roleId, moduleKey, allowed) {
        if (!role_feature_constants_1.ROLE_FEATURE_MODULES[moduleKey]) {
            throw new common_1.BadRequestException('Unknown module key');
        }
        const role = await this.roleModel.exists({ _id: roleId });
        if (!role) {
            throw new common_1.NotFoundException('Role not found');
        }
        const updated = await this.roleFeatureModel
            .findOneAndUpdate({ roleId: new mongoose_2.Types.ObjectId(roleId), moduleKey }, {
            roleId: new mongoose_2.Types.ObjectId(roleId),
            moduleKey,
            allowed,
        }, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        })
            .exec();
        return this.toFeatureDto(updated);
    }
    async removeRoleFeature(roleId, moduleKey) {
        await this.roleFeatureModel
            .findOneAndDelete({
            roleId: new mongoose_2.Types.ObjectId(roleId),
            moduleKey,
        })
            .exec();
    }
    async userHasFeature(userId, moduleKey, scopeType, scopeId) {
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
        const isEligibleExecutive = await this.isExecutiveEligibleMember(userId);
        if (!isEligibleExecutive) {
            return false;
        }
        const assignmentFilter = {
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
            .lean()
            .exec();
        if (assignments.length === 0) {
            return false;
        }
        const roleIds = Array.from(new Set(assignments
            .map((assignment) => assignment.roleId?.toString())
            .filter(Boolean)));
        if (roleIds.length > 0) {
            const explicitAllow = await this.roleFeatureModel
                .exists({
                roleId: {
                    $in: roleIds.map((id) => new mongoose_2.Types.ObjectId(id)),
                },
                moduleKey,
                allowed: true,
            })
                .then(Boolean);
            if (explicitAllow) {
                return true;
            }
        }
        const allowedCodes = role_feature_constants_1.ROLE_FEATURE_FALLBACK_PERMISSIONS[moduleKey] ?? [];
        if (allowedCodes.length === 0) {
            return false;
        }
        return assignments.some((assignment) => {
            const normalized = this.normalizeRoleCode(assignment.roleCode);
            return normalized ? allowedCodes.includes(normalized) : false;
        });
    }
    activeAssignmentFilter() {
        return {
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        };
    }
    async isExecutiveEligibleMember(userId) {
        return this.membershipsService.hasClassMembership(userId);
    }
    normalizeRoleCode(roleCode) {
        if (!roleCode) {
            return null;
        }
        const normalized = roleCode.replace(/_(global|branch|class)(_\d+)?$/, '');
        return normalized || null;
    }
    toFeatureDto(doc) {
        return {
            id: doc._id.toString(),
            roleId: doc.roleId.toString(),
            moduleKey: doc.moduleKey,
            allowed: Boolean(doc.allowed),
        };
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(role_schema_1.Role.name)),
    __param(1, (0, mongoose_1.InjectModel)(role_feature_schema_1.RoleFeature.name)),
    __param(2, (0, mongoose_1.InjectModel)(role_assignment_schema_1.RoleAssignment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        memberships_service_1.MembershipsService])
], RolesService);
//# sourceMappingURL=roles.service.js.map