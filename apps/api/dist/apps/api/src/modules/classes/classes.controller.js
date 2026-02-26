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
exports.ClassesController = void 0;
const common_1 = require("@nestjs/common");
const classes_service_1 = require("./classes.service");
const class_dto_1 = require("./dto/class.dto");
const require_active_decorator_1 = require("../../auth/require-active.decorator");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
let ClassesController = class ClassesController {
    classesService;
    roleAssignmentsService;
    constructor(classesService, roleAssignmentsService) {
        this.classesService = classesService;
        this.roleAssignmentsService = roleAssignmentsService;
    }
    findAll() {
        return this.classesService.findAll();
    }
    async create(dto, user) {
        await this.ensureGlobal(user);
        return this.classesService.create(dto);
    }
    async update(id, dto, user) {
        await this.ensureGlobal(user);
        return this.classesService.update(id, dto);
    }
    async remove(id, user) {
        await this.ensureGlobal(user);
        await this.classesService.remove(id);
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
exports.ClassesController = ClassesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClassesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_active_decorator_1.RequireActive)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [class_dto_1.CreateClassDto, Object]),
    __metadata("design:returntype", Promise)
], ClassesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, require_active_decorator_1.RequireActive)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, class_dto_1.UpdateClassDto, Object]),
    __metadata("design:returntype", Promise)
], ClassesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, require_active_decorator_1.RequireActive)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ClassesController.prototype, "remove", null);
exports.ClassesController = ClassesController = __decorate([
    (0, common_1.Controller)('classes'),
    __metadata("design:paramtypes", [classes_service_1.ClassesService,
        role_assignments_service_1.RoleAssignmentsService])
], ClassesController);
//# sourceMappingURL=classes.controller.js.map