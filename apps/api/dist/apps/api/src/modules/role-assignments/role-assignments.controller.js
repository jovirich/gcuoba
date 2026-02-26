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
exports.RoleAssignmentsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const require_active_decorator_1 = require("../../auth/require-active.decorator");
const create_role_assignment_dto_1 = require("./dto/create-role-assignment.dto");
const role_assignments_service_1 = require("./role-assignments.service");
const memberships_service_1 = require("../memberships/memberships.service");
let RoleAssignmentsController = class RoleAssignmentsController {
    roleAssignmentsService;
    membershipsService;
    constructor(roleAssignmentsService, membershipsService) {
        this.roleAssignmentsService = roleAssignmentsService;
        this.membershipsService = membershipsService;
    }
    async me(user) {
        return this.roleAssignmentsService.activeAssignmentsForUser(user.id);
    }
    async listAssignments(user, userId) {
        const targetUser = userId ?? user.id;
        if (userId &&
            !(await this.roleAssignmentsService.hasGlobalAccess(user.id))) {
            throw new common_1.ForbiddenException('Not authorized');
        }
        return this.roleAssignmentsService.activeAssignmentsForUser(targetUser);
    }
    async assignRole(user, dto) {
        await this.ensureWritableScope(user.id, dto);
        await this.ensureTargetMemberInScope(dto.userId, dto);
        return this.roleAssignmentsService.createRoleAssignment(dto);
    }
    async ensureWritableScope(actorId, dto) {
        if (await this.roleAssignmentsService.hasGlobalAccess(actorId)) {
            return;
        }
        if (dto.scopeType === 'global') {
            throw new common_1.ForbiddenException('Not authorized for global roles');
        }
        const scopeId = dto.scopeId?.trim();
        if (!scopeId) {
            throw new common_1.BadRequestException('scopeId is required for branch/class assignments');
        }
        if (dto.scopeType === 'branch') {
            const managedBranchIds = await this.roleAssignmentsService.managedBranchIds(actorId);
            if (!managedBranchIds.includes(scopeId)) {
                throw new common_1.ForbiddenException('Not authorized for this branch scope');
            }
            return;
        }
        const managedClassIds = await this.roleAssignmentsService.managedClassIds(actorId);
        if (!managedClassIds.includes(scopeId)) {
            throw new common_1.ForbiddenException('Not authorized for this class scope');
        }
    }
    async ensureTargetMemberInScope(userId, dto) {
        if (dto.scopeType === 'global') {
            return;
        }
        const scopeId = dto.scopeId?.trim();
        if (!scopeId) {
            throw new common_1.BadRequestException('scopeId is required for branch/class assignments');
        }
        if (dto.scopeType === 'branch') {
            const memberships = await this.membershipsService.listBranchMemberships(userId);
            const isApprovedInBranch = memberships.some((membership) => membership.branchId === scopeId &&
                membership.status === 'approved');
            if (!isApprovedInBranch) {
                throw new common_1.BadRequestException('Selected member is not approved for the target branch scope');
            }
            return;
        }
        const classMembership = await this.membershipsService.getClassMembership(userId);
        if (classMembership?.classId !== scopeId) {
            throw new common_1.BadRequestException('Selected member is not in the target class scope');
        }
    }
};
exports.RoleAssignmentsController = RoleAssignmentsController;
__decorate([
    (0, common_1.Get)('assignments/me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RoleAssignmentsController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('assignments'),
    (0, require_active_decorator_1.RequireActive)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RoleAssignmentsController.prototype, "listAssignments", null);
__decorate([
    (0, common_1.Post)('assignments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_role_assignment_dto_1.CreateRoleAssignmentDto]),
    __metadata("design:returntype", Promise)
], RoleAssignmentsController.prototype, "assignRole", null);
exports.RoleAssignmentsController = RoleAssignmentsController = __decorate([
    (0, common_1.Controller)('roles'),
    (0, require_active_decorator_1.RequireActive)(),
    __metadata("design:paramtypes", [role_assignments_service_1.RoleAssignmentsService,
        memberships_service_1.MembershipsService])
], RoleAssignmentsController);
//# sourceMappingURL=role-assignments.controller.js.map