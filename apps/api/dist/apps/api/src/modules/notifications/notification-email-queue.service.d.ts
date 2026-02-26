import { ConfigService } from '@nestjs/config';
import type { NotificationEmailJobDTO, NotificationEmailQueueProcessResultDTO, NotificationEmailQueueStatsDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { NotificationEmailJob } from './schemas/notification-email-job.schema';
type QueueEmailInput = {
    userId: string;
    toEmail: string;
    subject: string;
    body: string;
    notificationId?: string | null;
};
export declare class NotificationEmailQueueService {
    private readonly jobModel;
    private readonly configService;
    private readonly logger;
    private transporter;
    private readonly maxAttempts;
    constructor(jobModel: Model<NotificationEmailJob>, configService: ConfigService);
    enqueue(input: QueueEmailInput): Promise<NotificationEmailJobDTO>;
    listJobs(limit?: number, status?: 'pending' | 'sent' | 'failed'): Promise<NotificationEmailJobDTO[]>;
    getStats(): Promise<NotificationEmailQueueStatsDTO>;
    processPending(limit?: number): Promise<NotificationEmailQueueProcessResultDTO>;
    private mailEnabled;
    private sendEmail;
    private getTransporter;
    private toDto;
    private renderHtmlTemplate;
    private renderBodyAsHtml;
    private escapeHtml;
    private normalizeAppUrl;
}
export {};
