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
exports.BranchExecutiveController = void 0;
const common_1 = require("@nestjs/common");
const branch_executive_service_1 = require("./branch-executive.service");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const require_active_decorator_1 = require("../../auth/require-active.decorator");
const record_handover_dto_1 = require("./dto/record-handover.dto");
class MembershipDecisionDto {
    note;
}
let BranchExecutiveController = class BranchExecutiveController {
    branchExecutiveService;
    constructor(branchExecutiveService) {
        this.branchExecutiveService = branchExecutiveService;
    }
    summary(userId, user) {
        this.ensureActor(user, userId);
        return this.branchExecutiveService.getSummary(userId);
    }
    approve(userId, membershipId, body, user) {
        this.ensureActor(user, userId);
        return this.branchExecutiveService.approveMembership(userId, membershipId, body.note);
    }
    reject(userId, membershipId, body, user) {
        this.ensureActor(user, userId);
        return this.branchExecutiveService.rejectMembership(userId, membershipId, body.note ?? '');
    }
    handover(userId, body, user) {
        this.ensureActor(user, userId);
        return this.branchExecutiveService.recordHandover(userId, body);
    }
    ensureActor(user, userId) {
        if (!user || user.id !== userId) {
            throw new common_1.ForbiddenException('Not authorized for this branch executive action');
        }
    }
};
exports.BranchExecutiveController = BranchExecutiveController;
__decorate([
    (0, common_1.Get)(':userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BranchExecutiveController.prototype, "summary", null);
__decorate([
    (0, common_1.Post)(':userId/memberships/:membershipId/approve'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('membershipId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, MembershipDecisionDto, Object]),
    __metadata("design:returntype", Promise)
], BranchExecutiveController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':userId/memberships/:membershipId/reject'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('membershipId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, MembershipDecisionDto, Object]),
    __metadata("design:returntype", Promise)
], BranchExecutiveController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':userId/handover'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, record_handover_dto_1.RecordHandoverDto, Object]),
    __metadata("design:returntype", Promise)
], BranchExecutiveController.prototype, "handover", null);
exports.BranchExecutiveController = BranchExecutiveController = __decorate([
    (0, common_1.Controller)('branch-executive'),
    (0, require_active_decorator_1.RequireActive)(),
    __metadata("design:paramtypes", [branch_executive_service_1.BranchExecutiveService])
], BranchExecutiveController);
//# sourceMappingURL=branch-executive.controller.js.map