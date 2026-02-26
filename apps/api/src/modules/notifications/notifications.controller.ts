import {
    BadRequestException,
    Controller,
    ForbiddenException,
    Get,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import type {
    NotificationDTO,
    NotificationEmailJobDTO,
    NotificationEmailQueueProcessResultDTO,
    NotificationEmailQueueStatsDTO,
    NotificationEmailWorkerStatusDTO,
} from '@gcuoba/types';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RequireActive } from '../../auth/require-active.decorator';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { NotificationEmailQueueService } from './notification-email-queue.service';
import { NotificationEmailWorkerService } from './notification-email-worker.service';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@RequireActive()
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly notificationEmailQueueService: NotificationEmailQueueService,
        private readonly notificationEmailWorkerService: NotificationEmailWorkerService,
        private readonly roleAssignmentsService: RoleAssignmentsService,
    ) {}

    @Get('me')
    listMine(
        @CurrentUser() user: AuthenticatedUser,
        @Query('unreadOnly') unreadOnly?: string,
        @Query('limit') limit?: string,
    ): Promise<NotificationDTO[]> {
        const parsedLimit = limit ? Number(limit) : undefined;
        if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
            throw new BadRequestException('Invalid limit');
        }
        return this.notificationsService.listForUser(
            user.id,
            unreadOnly === 'true',
            parsedLimit,
        );
    }

    @Get('me/unread-count')
    async unreadCount(@CurrentUser() user: AuthenticatedUser) {
        const count = await this.notificationsService.countUnread(user.id);
        return { count };
    }

    @Post(':notificationId/read')
    markRead(
        @CurrentUser() user: AuthenticatedUser,
        @Param('notificationId') notificationId: string,
    ): Promise<NotificationDTO> {
        return this.notificationsService.markRead(user.id, notificationId);
    }

    @Post('me/read-all')
    markAllRead(@CurrentUser() user: AuthenticatedUser) {
        return this.notificationsService.markAllRead(user.id);
    }

    @Get('admin/email-queue/stats')
    async emailQueueStats(
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<NotificationEmailQueueStatsDTO> {
        await this.ensureGlobal(user);
        return this.notificationEmailQueueService.getStats();
    }

    @Get('admin/email-queue')
    async listEmailQueue(
        @CurrentUser() user: AuthenticatedUser,
        @Query('status') status?: string,
        @Query('limit') limit?: string,
    ): Promise<NotificationEmailJobDTO[]> {
        await this.ensureGlobal(user);
        const parsedLimit = limit ? Number(limit) : undefined;
        if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
            throw new BadRequestException('Invalid limit');
        }
        const parsedStatus = this.parseJobStatus(status);
        return this.notificationEmailQueueService.listJobs(
            parsedLimit,
            parsedStatus,
        );
    }

    @Post('admin/email-queue/process')
    async processEmailQueue(
        @CurrentUser() user: AuthenticatedUser,
        @Query('limit') limit?: string,
    ): Promise<NotificationEmailQueueProcessResultDTO> {
        await this.ensureGlobal(user);
        const parsedLimit = limit ? Number(limit) : undefined;
        if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
            throw new BadRequestException('Invalid limit');
        }
        return this.notificationEmailQueueService.processPending(parsedLimit);
    }

    @Get('admin/email-queue/worker-status')
    async workerStatus(
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<NotificationEmailWorkerStatusDTO> {
        await this.ensureGlobal(user);
        return this.notificationEmailWorkerService.getStatus();
    }

    @Post('admin/email-queue/worker-run')
    async workerRunOnce(
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<NotificationEmailQueueProcessResultDTO> {
        await this.ensureGlobal(user);
        return this.notificationEmailWorkerService.runOnce();
    }

    private parseJobStatus(
        status?: string,
    ): 'pending' | 'sent' | 'failed' | undefined {
        if (!status) {
            return undefined;
        }
        if (status === 'pending' || status === 'sent' || status === 'failed') {
            return status;
        }
        throw new BadRequestException('Invalid status');
    }

    private async ensureGlobal(user?: AuthenticatedUser) {
        if (!user) {
            throw new ForbiddenException('Not authorized');
        }
        const hasAccess = await this.roleAssignmentsService.hasGlobalAccess(
            user.id,
        );
        if (!hasAccess) {
            throw new ForbiddenException('Not authorized');
        }
    }
}
