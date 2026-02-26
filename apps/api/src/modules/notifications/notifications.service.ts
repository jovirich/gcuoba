import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { NotificationDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { NotificationEmailQueueService } from './notification-email-queue.service';
import { Notification } from './schemas/notification.schema';

type NotificationType = 'info' | 'success' | 'warning' | 'action_required';

type CreateNotificationInput = {
    title: string;
    message: string;
    type?: NotificationType;
    metadata?: Record<string, unknown> | null;
};

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(Notification.name)
        private readonly notificationModel: Model<Notification>,
        private readonly usersService: UsersService,
        private readonly notificationEmailQueueService: NotificationEmailQueueService,
    ) {}

    async createForUser(
        userId: string,
        input: CreateNotificationInput,
    ): Promise<NotificationDTO> {
        const doc = await this.notificationModel.create({
            userId,
            title: input.title,
            message: input.message,
            type: input.type ?? 'info',
            metadata: input.metadata ?? null,
            readAt: null,
        });

        void this.enqueueEmailForUser(
            userId,
            doc.title,
            doc.message,
            doc._id.toString(),
        ).catch(() => undefined);

        return this.toDto(doc);
    }

    async createForUsers(
        userIds: string[],
        input: CreateNotificationInput,
    ): Promise<void> {
        const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
        if (uniqueUserIds.length === 0) {
            return;
        }

        await this.notificationModel.insertMany(
            uniqueUserIds.map((userId) => ({
                userId,
                title: input.title,
                message: input.message,
                type: input.type ?? 'info',
                metadata: input.metadata ?? null,
                readAt: null,
            })),
        );

        void this.enqueueEmailForUsers(
            uniqueUserIds,
            input.title,
            input.message,
        ).catch(() => undefined);
    }

    async listForUser(
        userId: string,
        unreadOnly = false,
        limit = 50,
    ): Promise<NotificationDTO[]> {
        const query: Record<string, unknown> = { userId };
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

    async countUnread(userId: string): Promise<number> {
        return this.notificationModel.countDocuments({ userId, readAt: null });
    }

    async markRead(
        userId: string,
        notificationId: string,
    ): Promise<NotificationDTO> {
        const doc = await this.notificationModel
            .findOne({ _id: notificationId, userId })
            .exec();
        if (!doc) {
            throw new NotFoundException('Notification not found');
        }
        if (!doc.readAt) {
            doc.readAt = new Date();
            await doc.save();
        }
        return this.toDto(doc);
    }

    async markAllRead(userId: string): Promise<{ updated: number }> {
        const result = await this.notificationModel.updateMany(
            { userId, readAt: null },
            { $set: { readAt: new Date() } },
        );
        return { updated: result.modifiedCount ?? 0 };
    }

    private toDto(doc: Notification): NotificationDTO {
        const createdAt = (
            doc as Notification & { createdAt?: Date }
        ).createdAt?.toISOString();

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

    private async enqueueEmailForUser(
        userId: string,
        subject: string,
        body: string,
        notificationId?: string,
    ) {
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

    private async enqueueEmailForUsers(
        userIds: string[],
        subject: string,
        body: string,
    ) {
        const users = await this.usersService.findManyByIds(userIds);
        await Promise.all(
            users
                .filter((user) => Boolean(user.email))
                .map((user) =>
                    this.notificationEmailQueueService.enqueue({
                        userId: user.id,
                        toEmail: user.email,
                        subject,
                        body,
                    }),
                ),
        );
    }
}
