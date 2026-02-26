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
exports.AuditLogsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
const audit_log_schema_1 = require("./schemas/audit-log.schema");
let AuditLogsService = class AuditLogsService {
    auditLogModel;
    roleAssignmentsService;
    constructor(auditLogModel, roleAssignmentsService) {
        this.auditLogModel = auditLogModel;
        this.roleAssignmentsService = roleAssignmentsService;
    }
    async record(input) {
        const doc = await this.auditLogModel.create({
            actorUserId: input.actorUserId,
            action: input.action,
            resourceType: input.resourceType,
            resourceId: input.resourceId ?? null,
            scopeType: input.scopeType ?? null,
            scopeId: input.scopeId ?? null,
            metadata: input.metadata ?? null,
        });
        return this.toDto(doc);
    }
    async listForActor(actorId, filters) {
        const query = {};
        const hasGlobalAccess = await this.roleAssignmentsService.hasGlobalAccess(actorId);
        if (filters.scopeType === 'global' && !hasGlobalAccess) {
            throw new common_1.ForbiddenException('Not authorized for global audit logs');
        }
        if (filters.scopeType === 'branch') {
            if (!filters.scopeId) {
                throw new common_1.BadRequestException('scopeId is required for branch scope');
            }
            if (!hasGlobalAccess) {
                const managed = await this.roleAssignmentsService.managedBranchIds(actorId);
                if (!managed.includes(filters.scopeId)) {
                    throw new common_1.ForbiddenException('Not authorized for this branch scope');
                }
            }
            query.scopeType = 'branch';
            query.scopeId = filters.scopeId;
        }
        else if (filters.scopeType === 'class') {
            if (!filters.scopeId) {
                throw new common_1.BadRequestException('scopeId is required for class scope');
            }
            if (!hasGlobalAccess) {
                const managed = await this.roleAssignmentsService.managedClassIds(actorId);
                if (!managed.includes(filters.scopeId)) {
                    throw new common_1.ForbiddenException('Not authorized for this class scope');
                }
            }
            query.scopeType = 'class';
            query.scopeId = filters.scopeId;
        }
        else if (filters.scopeType === 'global') {
            query.scopeType = 'global';
        }
        else if (filters.scopeType === 'private') {
            query.scopeType = 'private';
        }
        if (filters.action) {
            query.action = filters.action;
        }
        if (hasGlobalAccess) {
            if (filters.actorUserId) {
                query.actorUserId = filters.actorUserId;
            }
        }
        else {
            if (filters.actorUserId && filters.actorUserId !== actorId) {
                throw new common_1.ForbiddenException('Not authorized to inspect another user audit logs');
            }
            query.actorUserId = actorId;
        }
        const safeLimit = Math.max(1, Math.min(filters.limit ?? 100, 300));
        const docs = await this.auditLogModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(safeLimit)
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }
    toDto(doc) {
        const createdAt = doc.createdAt?.toISOString();
        return {
            id: doc._id.toString(),
            actorUserId: doc.actorUserId,
            action: doc.action,
            resourceType: doc.resourceType,
            resourceId: doc.resourceId ?? null,
            scopeType: doc.scopeType ?? null,
            scopeId: doc.scopeId ?? null,
            metadata: doc.metadata ?? null,
            createdAt: createdAt ?? new Date().toISOString(),
        };
    }
};
exports.AuditLogsService = AuditLogsService;
exports.AuditLogsService = AuditLogsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(audit_log_schema_1.AuditLog.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        role_assignments_service_1.RoleAssignmentsService])
], AuditLogsService);
//# sourceMappingURL=audit-logs.service.js.map