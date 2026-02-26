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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const users_service_1 = require("../users/users.service");
const notification_email_queue_service_1 = require("./notification-email-queue.service");
const notification_schema_1 = require("./schemas/notification.schema");
let NotificationsService = class NotificationsService {
    notificationModel;
    usersService;
    notificationEmailQueueService;
    constructor(notificationModel, usersService, notificationEmailQueueService) {
        this.notificationModel = notificationModel;
        this.usersService = usersService;
        this.notificationEmailQueueService = notificationEmailQueueService;
    }
    async createForUser(userId, input) {
        const doc = await this.notificationModel.create({
            userId,
            title: input.title,
            message: input.message,
            type: input.type ?? 'info',
            metadata: input.metadata ?? null,
            readAt: null,
        });
        void this.enqueueEmailForUser(userId, doc.title, doc.message, doc._id.toString()).catch(() => undefined);
        return this.toDto(doc);
    }
    async createForUsers(userIds, input) {
        const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
        if (uniqueUserIds.length === 0) {
            return;
        }
        await this.notificationModel.insertMany(uniqueUserIds.map((userId) => ({
            userId,
            title: input.title,
            message: input.message,
            type: input.type ?? 'info',
            metadata: input.metadata ?? null,
            readAt: null,
        })));
        void this.enqueueEmailForUsers(uniqueUserIds, input.title, input.message).catch(() => undefined);
    }
    async listForUser(userId, unreadOnly = false, limit = 50) {
        const query = { userId };
        if (unreadOnly) {
            query.readAt = null;
        }
        const safeLimit = Math.max(1, Math.min(limit, 200));
        const docs = await this.notificationModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(safeLimit)
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }
    async countUnread(userId) {
        return this.notificationModel.countDocuments({ userId, readAt: null });
    }
    async markRead(userId, notificationId) {
        const doc = await this.notificationModel
            .findOne({ _id: notificationId, userId })
            .exec();
        if (!doc) {
            throw new common_1.NotFoundException('Notification not found');
        }
        if (!doc.readAt) {
            doc.readAt = new Date();
            await doc.save();
        }
        return this.toDto(doc);
    }
    async markAllRead(userId) {
        const result = await this.notificationModel.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
        return { updated: result.modifiedCount ?? 0 };
    }
    toDto(doc) {
        const createdAt = doc.createdAt?.toISOString();
        return {
            id: doc._id.toString(),
            userId: doc.userId,
            title: doc.title,
            message: doc.message,
            type: doc.type ?? 'info',
            read: Boolean(doc.readAt),
            createdAt: createdAt ?? new Date().toISOString(),
            readAt: doc.readAt?.toISOString() ?? null,
            metadata: doc.metadata ?? null,
        };
    }
    async enqueueEmailForUser(userId, subject, body, notificationId) {
        const user = await this.usersService.findById(userId);
        if (!user?.email) {
            return;
        }
        await this.notificationEmailQueueService.enqueue({
            notificationId: notificationId ?? null,
            userId,
            toEmail: user.email,
            subject,
            body,
        });
    }
    async enqueueEmailForUsers(userIds, subject, body) {
        const users = await this.usersService.findManyByIds(userIds);
        await Promise.all(users
            .filter((user) => Boolean(user.email))
            .map((user) => this.notificationEmailQueueService.enqueue({
            userId: user.id,
            toEmail: user.email,
            subject,
            body,
        })));
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notification_schema_1.Notification.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        notification_email_queue_service_1.NotificationEmailQueueService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map