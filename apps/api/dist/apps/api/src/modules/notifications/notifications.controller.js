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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const require_active_decorator_1 = require("../../auth/require-active.decorator");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
const notification_email_queue_service_1 = require("./notification-email-queue.service");
const notification_email_worker_service_1 = require("./notification-email-worker.service");
const notifications_service_1 = require("./notifications.service");
let NotificationsController = class NotificationsController {
    notificationsService;
    notificationEmailQueueService;
    notificationEmailWorkerService;
    roleAssignmentsService;
    constructor(notificationsService, notificationEmailQueueService, notificationEmailWorkerService, roleAssignmentsService) {
        this.notificationsService = notificationsService;
        this.notificationEmailQueueService = notificationEmailQueueService;
        this.notificationEmailWorkerService = notificationEmailWorkerService;
        this.roleAssignmentsService = roleAssignmentsService;
    }
    listMine(user, unreadOnly, limit) {
        const parsedLimit = limit ? Number(limit) : undefined;
        if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
            throw new common_1.BadRequestException('Invalid limit');
        }
        return this.notificationsService.listForUser(user.id, unreadOnly === 'true', parsedLimit);
    }
    async unreadCount(user) {
        const count = await this.notificationsService.countUnread(user.id);
        return { count };
    }
    markRead(user, notificationId) {
        return this.notificationsService.markRead(user.id, notificationId);
    }
    markAllRead(user) {
        return this.notificationsService.markAllRead(user.id);
    }
    async emailQueueStats(user) {
        await this.ensureGlobal(user);
        return this.notificationEmailQueueService.getStats();
    }
    async listEmailQueue(user, status, limit) {
        await this.ensureGlobal(user);
        const parsedLimit = limit ? Number(limit) : undefined;
        if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
            throw new common_1.BadRequestException('Invalid limit');
        }
        const parsedStatus = this.parseJobStatus(status);
        return this.notificationEmailQueueService.listJobs(parsedLimit, parsedStatus);
    }
    async processEmailQueue(user, limit) {
        await this.ensureGlobal(user);
        const parsedLimit = limit ? Number(limit) : undefined;
        if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
            throw new common_1.BadRequestException('Invalid limit');
        }
        return this.notificationEmailQueueService.processPending(parsedLimit);
    }
    async workerStatus(user) {
        await this.ensureGlobal(user);
        return this.notificationEmailWorkerService.getStatus();
    }
    async workerRunOnce(user) {
        await this.ensureGlobal(user);
        return this.notificationEmailWorkerService.runOnce();
    }
    parseJobStatus(status) {
        if (!status) {
            return undefined;
        }
        if (status === 'pending' || status === 'sent' || status === 'failed') {
            return status;
        }
        throw new common_1.BadRequestException('Invalid status');
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
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('unreadOnly')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "listMine", null);
__decorate([
    (0, common_1.Get)('me/unread-count'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "unreadCount", null);
__decorate([
    (0, common_1.Post)(':notificationId/read'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('notificationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Post)('me/read-all'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markAllRead", null);
__decorate([
    (0, common_1.Get)('admin/email-queue/stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "emailQueueStats", null);
__decorate([
    (0, common_1.Get)('admin/email-queue'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "listEmailQueue", null);
__decorate([
    (0, common_1.Post)('admin/email-queue/process'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "processEmailQueue", null);
__decorate([
    (0, common_1.Get)('admin/email-queue/worker-status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "workerStatus", null);
__decorate([
    (0, common_1.Post)('admin/email-queue/worker-run'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "workerRunOnce", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, require_active_decorator_1.RequireActive)(),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        notification_email_queue_service_1.NotificationEmailQueueService,
        notification_email_worker_service_1.NotificationEmailWorkerService,
        role_assignments_service_1.RoleAssignmentsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map