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
exports.AnnouncementsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const announcement_schema_1 = require("../dashboard/schemas/announcement.schema");
const memberships_service_1 = require("../memberships/memberships.service");
const notifications_service_1 = require("../notifications/notifications.service");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
const users_service_1 = require("../users/users.service");
let AnnouncementsService = class AnnouncementsService {
    announcementModel;
    roleAssignmentsService;
    membershipsService;
    usersService;
    notificationsService;
    auditLogsService;
    constructor(announcementModel, roleAssignmentsService, membershipsService, usersService, notificationsService, auditLogsService) {
        this.announcementModel = announcementModel;
        this.roleAssignmentsService = roleAssignmentsService;
        this.membershipsService = membershipsService;
        this.usersService = usersService;
        this.notificationsService = notificationsService;
        this.auditLogsService = auditLogsService;
    }
    async findAll(actorId, scopeType, scopeId, status) {
        const filter = await this.buildReadableFilter(actorId, scopeType, scopeId);
        if (status) {
            filter.status = status;
        }
        const docs = await this.announcementModel
            .find(filter)
            .sort({ publishedAt: -1, createdAt: -1 })
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }
    async findOne(id) {
        const doc = await this.announcementModel.findById(id).exec();
        if (!doc) {
            throw new common_1.NotFoundException('Announcement not found');
        }
        return this.toDto(doc);
    }
    async create(actorId, dto) {
        await this.ensureWritableScope(actorId, dto.scopeType, dto.scopeType === 'global' ? null : (dto.scopeId ?? null));
        const payload = this.preparePayload(dto);
        const doc = await this.announcementModel.create(payload);
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'announcement.created',
            resourceType: 'announcement',
            resourceId: doc._id.toString(),
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            metadata: {
                title: doc.title,
                status: doc.status,
                publishedAt: doc.publishedAt?.toISOString() ?? null,
            },
        });
        if (doc.status === 'published') {
            await this.notifyAudience(doc, 'published');
        }
        return this.toDto(doc);
    }
    async update(actorId, id, dto) {
        const announcement = await this.announcementModel.findById(id).exec();
        if (!announcement) {
            throw new common_1.NotFoundException('Announcement not found');
        }
        await this.ensureWritableScope(actorId, announcement.scopeType, announcement.scopeId ?? null);
        if (dto.scopeType !== undefined || dto.scopeId !== undefined) {
            const nextScopeType = dto.scopeType ?? announcement.scopeType;
            const nextScopeId = nextScopeType === 'global'
                ? null
                : dto.scopeId !== undefined
                    ? (dto.scopeId ?? null)
                    : (announcement.scopeId ?? null);
            await this.ensureWritableScope(actorId, nextScopeType, nextScopeId);
        }
        const previousStatus = announcement.status;
        const payload = this.preparePayload(dto);
        Object.assign(announcement, payload);
        await announcement.save();
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'announcement.updated',
            resourceType: 'announcement',
            resourceId: announcement._id.toString(),
            scopeType: announcement.scopeType,
            scopeId: announcement.scopeId ?? null,
            metadata: {
                title: announcement.title,
                previousStatus,
                status: announcement.status,
                publishedAt: announcement.publishedAt?.toISOString() ?? null,
            },
        });
        if (announcement.status === 'published') {
            await this.notifyAudience(announcement, previousStatus === 'published' ? 'updated' : 'published');
        }
        return this.toDto(announcement);
    }
    async remove(actorId, id) {
        const existing = await this.announcementModel.findById(id).exec();
        if (!existing) {
            throw new common_1.NotFoundException('Announcement not found');
        }
        await this.ensureWritableScope(actorId, existing.scopeType, existing.scopeId ?? null);
        const deleted = await this.announcementModel
            .findByIdAndDelete(id)
            .exec();
        if (!deleted) {
            throw new common_1.NotFoundException('Announcement not found');
        }
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'announcement.deleted',
            resourceType: 'announcement',
            resourceId: deleted._id.toString(),
            scopeType: deleted.scopeType,
            scopeId: deleted.scopeId ?? null,
            metadata: {
                title: deleted.title,
                status: deleted.status,
            },
        });
        if (deleted.status === 'published') {
            await this.notifyAudience(deleted, 'deleted');
        }
        return { success: true };
    }
    async notifyAudience(announcement, action) {
        const audience = await this.resolveAudienceUserIds(announcement.scopeType, announcement.scopeId ?? null);
        if (audience.length === 0) {
            return;
        }
        const verb = action === 'published'
            ? 'published'
            : action === 'updated'
                ? 'updated'
                : 'removed';
        await this.notificationsService.createForUsers(audience, {
            title: `Announcement ${verb}: ${announcement.title}`,
            message: action === 'deleted'
                ? `The announcement "${announcement.title}" has been removed.`
                : `The announcement "${announcement.title}" has been ${verb}.`,
            type: action === 'deleted' ? 'warning' : 'info',
            metadata: {
                announcementId: announcement._id.toString(),
                scopeType: announcement.scopeType,
                scopeId: announcement.scopeId ?? null,
                status: announcement.status,
                publishedAt: announcement.publishedAt?.toISOString() ?? null,
            },
        });
    }
    async resolveAudienceUserIds(scopeType, scopeId) {
        const activeUserIds = await this.usersService.listActiveUserIds();
        const activeSet = new Set(activeUserIds);
        if (scopeType === 'global') {
            return activeUserIds;
        }
        if (!scopeId) {
            return [];
        }
        if (scopeType === 'branch') {
            const branchUsers = await this.membershipsService.listApprovedUserIdsByBranch(scopeId);
            return branchUsers.filter((userId) => activeSet.has(userId));
        }
        const classUsers = await this.membershipsService.listUserIdsByClass(scopeId);
        return classUsers.filter((userId) => activeSet.has(userId));
    }
    preparePayload(dto) {
        const payload = {};
        if (dto.title !== undefined) {
            payload.title = dto.title;
        }
        if (dto.body !== undefined) {
            payload.body = dto.body;
        }
        if (dto.scopeType !== undefined) {
            payload.scopeType = dto.scopeType;
            payload.scopeId =
                dto.scopeType === 'global' ? null : (dto.scopeId ?? null);
        }
        else if (dto.scopeId !== undefined) {
            payload.scopeId = dto.scopeId ?? null;
        }
        if (dto.status !== undefined) {
            payload.status = dto.status;
        }
        if (dto.status === 'published') {
            payload.publishedAt = dto.publishedAt
                ? new Date(dto.publishedAt)
                : new Date();
        }
        else if (dto.publishedAt !== undefined) {
            payload.publishedAt = dto.publishedAt
                ? new Date(dto.publishedAt)
                : undefined;
        }
        return payload;
    }
    toDto(doc) {
        return {
            id: doc._id.toString(),
            title: doc.title,
            body: doc.body,
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? undefined,
            publishedAt: doc.publishedAt?.toISOString(),
            status: doc.status ?? 'draft',
        };
    }
    async buildReadableFilter(actorId, scopeType, scopeId) {
        const hasGlobalAccess = await this.roleAssignmentsService.hasGlobalAccess(actorId);
        if (hasGlobalAccess) {
            if (!scopeType) {
                return {};
            }
            return scopeType === 'global'
                ? { scopeType: 'global' }
                : { scopeType, ...(scopeId ? { scopeId } : {}) };
        }
        const [managedBranchIds, managedClassIds, branchMemberships, classMembership,] = await Promise.all([
            this.roleAssignmentsService.managedBranchIds(actorId),
            this.roleAssignmentsService.managedClassIds(actorId),
            this.membershipsService.listBranchMemberships(actorId),
            this.membershipsService.getClassMembership(actorId),
        ]);
        const readableBranches = new Set(managedBranchIds);
        branchMemberships
            .filter((membership) => membership.status === 'approved')
            .forEach((membership) => readableBranches.add(membership.branchId));
        const readableClasses = new Set(managedClassIds);
        if (classMembership?.classId) {
            readableClasses.add(classMembership.classId);
        }
        if (scopeType === 'global') {
            return { scopeType: 'global' };
        }
        if (scopeType === 'branch') {
            if (!scopeId) {
                throw new common_1.BadRequestException('scopeId is required for branch scope');
            }
            if (!readableBranches.has(scopeId)) {
                throw new common_1.ForbiddenException('Not authorized for this branch scope');
            }
            return { scopeType: 'branch', scopeId };
        }
        if (scopeType === 'class') {
            if (!scopeId) {
                throw new common_1.BadRequestException('scopeId is required for class scope');
            }
            if (!readableClasses.has(scopeId)) {
                throw new common_1.ForbiddenException('Not authorized for this class scope');
            }
            return { scopeType: 'class', scopeId };
        }
        const filterScopes = [
            { scopeType: 'global' },
        ];
        if (readableBranches.size > 0) {
            filterScopes.push({
                scopeType: 'branch',
                scopeId: { $in: Array.from(readableBranches) },
            });
        }
        if (readableClasses.size > 0) {
            filterScopes.push({
                scopeType: 'class',
                scopeId: { $in: Array.from(readableClasses) },
            });
        }
        return { $or: filterScopes };
    }
    async ensureWritableScope(actorId, scopeType, scopeId) {
        const hasGlobalAccess = await this.roleAssignmentsService.hasGlobalAccess(actorId);
        if (hasGlobalAccess) {
            return;
        }
        if (scopeType === 'global') {
            throw new common_1.ForbiddenException('Not authorized for global scope');
        }
        if (!scopeId) {
            throw new common_1.BadRequestException('scopeId is required');
        }
        if (scopeType === 'branch') {
            const managedBranches = await this.roleAssignmentsService.managedBranchIds(actorId);
            if (!managedBranches.includes(scopeId)) {
                throw new common_1.ForbiddenException('Not authorized for this branch scope');
            }
            return;
        }
        const managedClasses = await this.roleAssignmentsService.managedClassIds(actorId);
        if (!managedClasses.includes(scopeId)) {
            throw new common_1.ForbiddenException('Not authorized for this class scope');
        }
    }
};
exports.AnnouncementsService = AnnouncementsService;
exports.AnnouncementsService = AnnouncementsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(announcement_schema_1.Announcement.name)),
    __metadata("design:paramtypes", [Function, role_assignments_service_1.RoleAssignmentsService,
        memberships_service_1.MembershipsService,
        users_service_1.UsersService,
        notifications_service_1.NotificationsService,
        audit_logs_service_1.AuditLogsService])
], AnnouncementsService);
//# sourceMappingURL=announcements.service.js.map