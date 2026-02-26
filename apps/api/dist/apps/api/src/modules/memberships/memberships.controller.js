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
exports.MembershipsController = void 0;
const common_1 = require("@nestjs/common");
const memberships_service_1 = require("./memberships.service");
const request_branch_membership_dto_1 = require("./dto/request-branch-membership.dto");
const update_class_membership_dto_1 = require("./dto/update-class-membership.dto");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const require_active_decorator_1 = require("../../auth/require-active.decorator");
let MembershipsController = class MembershipsController {
    membershipsService;
    constructor(membershipsService) {
        this.membershipsService = membershipsService;
    }
    listBranchMemberships(userId, user) {
        this.ensureSelf(user, userId);
        return this.membershipsService.listBranchMemberships(userId);
    }
    requestBranchMembership(userId, payload, user) {
        this.ensureSelf(user, userId);
        return this.membershipsService.requestBranchMembership(userId, payload);
    }
    getClassMembership(userId, user) {
        this.ensureSelf(user, userId);
        return this.membershipsService.getClassMembership(userId);
    }
    updateClassMembership(userId, payload, user) {
        this.ensureSelf(user, userId);
        return this.membershipsService.updateClassMembership(userId, payload);
    }
    ensureSelf(user, userId) {
        if (!user || user.id !== userId) {
            throw new common_1.ForbiddenException('Cannot access memberships for another user');
        }
    }
};
exports.MembershipsController = MembershipsController;
__decorate([
    (0, common_1.Get)('branches/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MembershipsController.prototype, "listBranchMemberships", null);
__decorate([
    (0, common_1.Post)('branches/:userId'),
    (0, require_active_decorator_1.RequireActive)(),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_branch_membership_dto_1.RequestBranchMembershipDto, Object]),
    __metadata("design:returntype", Promise)
], MembershipsController.prototype, "requestBranchMembership", null);
__decorate([
    (0, common_1.Get)('class/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MembershipsController.prototype, "getClassMembership", null);
__decorate([
    (0, common_1.Put)('class/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_class_membership_dto_1.UpdateClassMembershipDto, Object]),
    __metadata("design:returntype", Promise)
], MembershipsController.prototype, "updateClassMembership", null);
exports.MembershipsController = MembershipsController = __decorate([
    (0, common_1.Controller)('memberships'),
    __metadata("design:paramtypes", [memberships_service_1.MembershipsService])
], MembershipsController);
//# sourceMappingURL=memberships.controller.js.map