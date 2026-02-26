import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
    NotificationEmailQueueProcessResultDTO,
    NotificationEmailWorkerStatusDTO,
} from '@gcuoba/types';
import { NotificationEmailQueueService } from './notification-email-queue.service';

@Injectable()
export class NotificationEmailWorkerService
    implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(NotificationEmailWorkerService.name);
    private timer: NodeJS.Timeout | null = null;
    private running = false;
    private lastRunAt: Date | null = null;
    private lastResult: NotificationEmailQueueProcessResultDTO | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly notificationEmailQueueService: NotificationEmailQueueService,
    ) {}

    onModuleInit() {
        if (!this.enabled()) {
            this.logger.log('Email queue worker is disabled.');
            return;
        }

        const pollSeconds = this.pollSeconds();
        this.timer = setInterval(() => {
            void this.runOnce();
        }, pollSeconds * 1000);

        this.logger.log(
            `Email queue worker started (poll=${pollSeconds}s, batch=${this.batchSize()}).`,
        );
        void this.runOnce();
    }

    onModuleDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    async runOnce(): Promise<NotificationEmailQueueProcessResultDTO> {
        if (this.running) {
            return { processed: 0, sent: 0, failed: 0, skipped: 0 };
        }

        this.running = true;
        try {
            const result =
                await this.notificationEmailQueueService.processPending(
                    this.batchSize(),
                );
            this.lastResult = result;
            this.lastRunAt = new Date();
            return result;
        } catch (error) {
            this.logger.error(
                `Email queue worker run failed: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`,
            );
            this.lastResult = {
                processed: 0,
                sent: 0,
                failed: 0,
                skipped: 0,
            };
            this.lastRunAt = new Date();
            return this.lastResult;
        } finally {
            this.running = false;
        }
    }

    getStatus(): NotificationEmailWorkerStatusDTO {
        return {
            enabled: this.enabled(),
            running: this.running,
            pollSeconds: this.pollSeconds(),
            batchSize: this.batchSize(),
            lastRunAt: this.lastRunAt?.toISOString() ?? null,
            lastResult: this.lastResult,
        };
    }

    private enabled() {
        return (
            this.configService.get<boolean>('mail.queueWorkerEnabled') === true
        );
    }

    private pollSeconds() {
        const value =
            this.configService.get<number>('mail.queuePollSeconds') ?? 60;
        return Math.max(10, value);
    }

    private batchSize() {
        const value =
            this.configService.get<number>('mail.queueBatchSize') ?? 50;
        return Math.max(1, Math.min(200, value));
    }
}
