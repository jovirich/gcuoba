import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NotificationEmailQueueProcessResultDTO, NotificationEmailWorkerStatusDTO } from '@gcuoba/types';
import { NotificationEmailQueueService } from './notification-email-queue.service';
export declare class NotificationEmailWorkerService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly notificationEmailQueueService;
    private readonly logger;
    private timer;
    private running;
    private lastRunAt;
    private lastResult;
    constructor(configService: ConfigService, notificationEmailQueueService: NotificationEmailQueueService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    runOnce(): Promise<NotificationEmailQueueProcessResultDTO>;
    getStatus(): NotificationEmailWorkerStatusDTO;
    private enabled;
    private pollSeconds;
    private batchSize;
}
