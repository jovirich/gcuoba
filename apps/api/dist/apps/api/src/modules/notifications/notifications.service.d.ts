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
export declare class NotificationsService {
    private readonly notificationModel;
    private readonly usersService;
    private readonly notificationEmailQueueService;
    constructor(notificationModel: Model<Notification>, usersService: UsersService, notificationEmailQueueService: NotificationEmailQueueService);
    createForUser(userId: string, input: CreateNotificationInput): Promise<NotificationDTO>;
    createForUsers(userIds: string[], input: CreateNotificationInput): Promise<void>;
    listForUser(userId: string, unreadOnly?: boolean, limit?: number): Promise<NotificationDTO[]>;
    countUnread(userId: string): Promise<number>;
    markRead(userId: string, notificationId: string): Promise<NotificationDTO>;
    markAllRead(userId: string): Promise<{
        updated: number;
    }>;
    private toDto;
    private enqueueEmailForUser;
    private enqueueEmailForUsers;
}
export {};
