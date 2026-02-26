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
exports.RolesController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const require_active_decorator_1 = require("../../auth/require-active.decorator");
const memberships_service_1 = require("../memberships/memberships.service");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
const role_feature_dto_1 = require("./dto/role-feature.dto");
const roles_service_1 = require("./roles.service");
let RolesController = class RolesController {
    rolesService;
    roleAssignmentsService;
    membershipsService;
    constructor(rolesService, roleAssignmentsService, membershipsService) {
        this.rolesService = rolesService;
        this.roleAssignmentsService = roleAssignmentsService;
        this.membershipsService = membershipsService;
    }
    findAll() {
        return this.rolesService.findAll();
    }
    listFeatureModules() {
        return this.rolesService.listFeatureModules();
    }
    listAllFeatures() {
        return this.rolesService.listAllFeatures();
    }
    async executiveAccess(user) {
        const [hasGlobalAccess, hasAnyAssignment, hasClassMembership, hasApprovedBranchMembership,] = await Promise.all([
            this.roleAssignmentsService.hasGlobalAccess(user.id),
            this.roleAssignmentsService.hasAnyActiveAssignment(user.id),
            this.membershipsService.hasClassMembership(user.id),
            this.membershipsService.hasApprovedBranchMembership(user.id),
        ]);
        const hasMemberFoundation = hasClassMembership;
        return {
            allowed: (hasGlobalAccess || hasAnyAssignment) && hasMemberFoundation,
            hasMemberFoundation,
            hasClassMembership,
            hasApprovedBranchMembership,
        };
    }
    listRoleFeatures(roleId) {
        return this.rolesService.listRoleFeatures(roleId);
    }
    async featureAccess(moduleKey, user, scopeType, scopeId) {
        const allowed = await this.rolesService.userHasFeature(user.id, moduleKey, scopeType, scopeId);
        return { allowed };
    }
    async upsertRoleFeature(roleId, moduleKey, dto, user) {
        await this.ensureGlobal(user);
        return this.rolesService.upsertRoleFeature(roleId, moduleKey, dto.allowed);
    }
    async removeRoleFeature(roleId, moduleKey, user) {
        await this.ensureGlobal(user);
        await this.rolesService.removeRoleFeature(roleId, moduleKey);
        return { success: true };
    }
    async ensureGlobal(user) {
        if (!user) {
            throw new common_1.ForbiddenException('Not authorized');
        }
        const hasAccess = await this.roleAssignmentsService.hasGlobalAccess(user.id);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Not authorized');
        }
    }
};
exports.RolesController = RolesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('feature-modules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RolesController.prototype, "listFeatureModules", null);
__decorate([
    (0, common_1.Get)('features'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "listAllFeatures", null);
__decorate([
    (0, common_1.Get)('access/executive'),
    (0, require_active_decorator_1.RequireActive)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "executiveAccess", null);
__decorate([
    (0, common_1.Get)(':roleId/features'),
    __param(0, (0, common_1.Param)('roleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "listRoleFeatures", null);
__decorate([
    (0, common_1.Get)('features/access/:moduleKey'),
    (0, require_active_decorator_1.RequireActive)(),
    __param(0, (0, common_1.Param)('moduleKey')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('scopeType')),
    __param(3, (0, common_1.Query)('scopeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "featureAccess", null);
__decorate([
    (0, common_1.Put)(':roleId/features/:moduleKey'),
    (0, require_active_decorator_1.RequireActive)(),
    __param(0, (0, common_1.Param)('roleId')),
    __param(1, (0, common_1.Param)('moduleKey')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, role_feature_dto_1.UpsertRoleFeatureDto, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "upsertRoleFeature", null);
__decorate([
    (0, common_1.Delete)(':roleId/features/:moduleKey'),
    (0, require_active_decorator_1.RequireActive)(),
    __param(0, (0, common_1.Param)('roleId')),
    __param(1, (0, common_1.Param)('moduleKey')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "removeRoleFeature", null);
exports.RolesController = RolesController = __decorate([
    (0, common_1.Controller)('roles'),
    __metadata("design:paramtypes", [roles_service_1.RolesService,
        role_assignments_service_1.RoleAssignmentsService,
        memberships_service_1.MembershipsService])
], RolesController);
//# sourceMappingURL=roles.controller.js.map