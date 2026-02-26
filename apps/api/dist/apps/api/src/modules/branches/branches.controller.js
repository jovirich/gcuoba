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
exports.BranchesController = void 0;
const common_1 = require("@nestjs/common");
const branches_service_1 = require("./branches.service");
const branch_dto_1 = require("./dto/branch.dto");
const require_active_decorator_1 = require("../../auth/require-active.decorator");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
let BranchesController = class BranchesController {
    branchesService;
    roleAssignmentsService;
    constructor(branchesService, roleAssignmentsService) {
        this.branchesService = branchesService;
        this.roleAssignmentsService = roleAssignmentsService;
    }
    findAll() {
        return this.branchesService.findAll();
    }
    async create(dto, user) {
        await this.ensureGlobal(user);
        return this.branchesService.create(dto);
    }
    async update(id, dto, user) {
        await this.ensureGlobal(user);
        return this.branchesService.update(id, dto);
    }
    async remove(id, user) {
        await this.ensureGlobal(user);
        await this.branchesService.remove(id);
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
exports.BranchesController = BranchesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_active_decorator_1.RequireActive)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [branch_dto_1.CreateBranchDto, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, require_active_decorator_1.RequireActive)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, branch_dto_1.UpdateBranchDto, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, require_active_decorator_1.RequireActive)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "remove", null);
exports.BranchesController = BranchesController = __decorate([
    (0, common_1.Controller)('branches'),
    __metadata("design:paramtypes", [branches_service_1.BranchesService,
        role_assignments_service_1.RoleAssignmentsService])
], BranchesController);
//# sourceMappingURL=branches.controller.js.map