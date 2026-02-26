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
exports.AdminMembersController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const require_active_decorator_1 = require("../../auth/require-active.decorator");
const admin_members_service_1 = require("./admin-members.service");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
const update_member_status_dto_1 = require("./dto/update-member-status.dto");
const update_member_class_dto_1 = require("./dto/update-member-class.dto");
let AdminMembersController = class AdminMembersController {
    adminMembersService;
    roleAssignmentsService;
    constructor(adminMembersService, roleAssignmentsService) {
        this.adminMembersService = adminMembersService;
        this.roleAssignmentsService = roleAssignmentsService;
    }
    async list(user, scopeType, scopeId) {
        const scope = await this.resolveAccessScope(user, scopeType, scopeId);
        return this.adminMembersService.listMembers(scope);
    }
    async find(userId, user, scopeType, scopeId) {
        const scope = await this.resolveAccessScope(user, scopeType, scopeId);
        return this.adminMembersService.findMember(userId, scope);
    }
    async updateStatus(userId, payload, user, scopeType, scopeId) {
        const scope = await this.resolveAccessScope(user, scopeType, scopeId);
        return this.adminMembersService.updateStatus(userId, payload.status, scope);
    }
    async changeClass(userId, payload, user, scopeType, scopeId) {
        const scope = await this.resolveAccessScope(user, scopeType, scopeId);
        return this.adminMembersService.changeClass(userId, payload.classId, scope);
    }
    async resolveAccessScope(user, scopeType, scopeId) {
        if (!user) {
            throw new common_1.ForbiddenException('Not authorized');
        }
        const normalizedScopeId = scopeId?.trim() || undefined;
        const hasGlobalAccess = await this.roleAssignmentsService.hasGlobalAccess(user.id);
        if (hasGlobalAccess) {
            if (!scopeType || scopeType === 'global') {
                return { kind: 'global' };
            }
            if (!normalizedScopeId) {
                throw new common_1.BadRequestException('scopeId is required for branch/class scope');
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
            throw new common_1.ForbiddenException('Not authorized for global scope');
        }
        if (scopeType === 'branch') {
            const branchId = normalizedScopeId ??
                (managedBranchIds.length === 1 ? managedBranchIds[0] : null);
            if (!branchId) {
                throw new common_1.BadRequestException('scopeId is required for branch scope');
            }
            if (!managedBranchIds.includes(branchId)) {
                throw new common_1.ForbiddenException('Not authorized for this branch scope');
            }
            return { kind: 'branch', branchId };
        }
        if (scopeType === 'class') {
            const classId = normalizedScopeId ??
                (managedClassIds.length === 1 ? managedClassIds[0] : null);
            if (!classId) {
                throw new common_1.BadRequestException('scopeId is required for class scope');
            }
            if (!managedClassIds.includes(classId)) {
                throw new common_1.ForbiddenException('Not authorized for this class scope');
            }
            return { kind: 'class', classId };
        }
        if (managedBranchIds.length === 0 && managedClassIds.length === 0) {
            throw new common_1.ForbiddenException('Not authorized');
        }
        return {
            kind: 'managed',
            branchIds: managedBranchIds,
            classIds: managedClassIds,
        };
    }
};
exports.AdminMembersController = AdminMembersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('scopeType')),
    __param(2, (0, common_1.Query)('scopeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminMembersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('scopeType')),
    __param(3, (0, common_1.Query)('scopeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminMembersController.prototype, "find", null);
__decorate([
    (0, common_1.Put)(':userId/status'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Query)('scopeType')),
    __param(4, (0, common_1.Query)('scopeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_member_status_dto_1.UpdateMemberStatusDto, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminMembersController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Put)(':userId/class'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Query)('scopeType')),
    __param(4, (0, common_1.Query)('scopeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_member_class_dto_1.UpdateMemberClassDto, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminMembersController.prototype, "changeClass", null);
exports.AdminMembersController = AdminMembersController = __decorate([
    (0, common_1.Controller)('admin/members'),
    (0, require_active_decorator_1.RequireActive)(),
    __metadata("design:paramtypes", [admin_members_service_1.AdminMembersService,
        role_assignments_service_1.RoleAssignmentsService])
], AdminMembersController);
//# sourceMappingURL=admin-members.controller.js.map