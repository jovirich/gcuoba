import type { NotificationDTO, NotificationEmailJobDTO, NotificationEmailQueueProcessResultDTO, NotificationEmailQueueStatsDTO, NotificationEmailWorkerStatusDTO } from '@gcuoba/types';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { NotificationEmailQueueService } from './notification-email-queue.service';
import { NotificationEmailWorkerService } from './notification-email-worker.service';
import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly notificationEmailQueueService;
    private readonly notificationEmailWorkerService;
    private readonly roleAssignmentsService;
    constructor(notificationsService: NotificationsService, notificationEmailQueueService: NotificationEmailQueueService, notificationEmailWorkerService: NotificationEmailWorkerService, roleAssignmentsService: RoleAssignmentsService);
    listMine(user: AuthenticatedUser, unreadOnly?: string, limit?: string): Promise<NotificationDTO[]>;
    unreadCount(user: AuthenticatedUser): Promise<{
        count: number;
    }>;
    markRead(user: AuthenticatedUser, notificationId: string): Promise<NotificationDTO>;
    markAllRead(user: AuthenticatedUser): Promise<{
        updated: number;
    }>;
    emailQueueStats(user: AuthenticatedUser): Promise<NotificationEmailQueueStatsDTO>;
    listEmailQueue(user: AuthenticatedUser, status?: string, limit?: string): Promise<NotificationEmailJobDTO[]>;
    processEmailQueue(user: AuthenticatedUser, limit?: string): Promise<NotificationEmailQueueProcessResultDTO>;
    workerStatus(user: AuthenticatedUser): Promise<NotificationEmailWorkerStatusDTO>;
    workerRunOnce(user: AuthenticatedUser): Promise<NotificationEmailQueueProcessResultDTO>;
    private parseJobStatus;
    private ensureGlobal;
}
