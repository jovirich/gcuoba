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
exports.AuditLogsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const require_active_decorator_1 = require("../../auth/require-active.decorator");
const audit_logs_service_1 = require("./audit-logs.service");
let AuditLogsController = class AuditLogsController {
    auditLogsService;
    constructor(auditLogsService) {
        this.auditLogsService = auditLogsService;
    }
    list(user, actorUserId, action, scopeType, scopeId, limit) {
        const parsedLimit = limit ? Number(limit) : undefined;
        if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
            throw new common_1.BadRequestException('Invalid limit');
        }
        return this.auditLogsService.listForActor(user.id, {
            actorUserId,
            action,
            scopeType: this.parseScopeType(scopeType),
            scopeId,
            limit: parsedLimit,
        });
    }
    parseScopeType(scopeType) {
        if (!scopeType) {
            return undefined;
        }
        if (scopeType === 'global' ||
            scopeType === 'branch' ||
            scopeType === 'class' ||
            scopeType === 'private') {
            return scopeType;
        }
        throw new common_1.BadRequestException('Invalid scopeType');
    }
};
exports.AuditLogsController = AuditLogsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('actorUserId')),
    __param(2, (0, common_1.Query)('action')),
    __param(3, (0, common_1.Query)('scopeType')),
    __param(4, (0, common_1.Query)('scopeId')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "list", null);
exports.AuditLogsController = AuditLogsController = __decorate([
    (0, common_1.Controller)('audit-logs'),
    (0, require_active_decorator_1.RequireActive)(),
    __metadata("design:paramtypes", [audit_logs_service_1.AuditLogsService])
], AuditLogsController);
//# sourceMappingURL=audit-logs.controller.js.map