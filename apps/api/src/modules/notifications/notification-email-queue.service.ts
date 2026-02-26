import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type {
    NotificationEmailJobDTO,
    NotificationEmailQueueProcessResultDTO,
    NotificationEmailQueueStatsDTO,
} from '@gcuoba/types';
import { Model } from 'mongoose';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { NotificationEmailJob } from './schemas/notification-email-job.schema';

type QueueEmailInput = {
    userId: string;
    toEmail: string;
    subject: string;
    body: string;
    notificationId?: string | null;
};

@Injectable()
export class NotificationEmailQueueService {
    private readonly logger = new Logger(NotificationEmailQueueService.name);
    private transporter: Transporter | null = null;
    private readonly maxAttempts = 5;

    constructor(
        @InjectModel(NotificationEmailJob.name)
        private readonly jobModel: Model<NotificationEmailJob>,
        private readonly configService: ConfigService,
    ) {}

    async enqueue(input: QueueEmailInput): Promise<NotificationEmailJobDTO> {
        const doc = await this.jobModel.create({
            notificationId: input.notificationId ?? null,
            userId: input.userId,
            toEmail: input.toEmail,
            subject: input.subject,
            body: input.body,
            status: 'pending',
            attempts: 0,
            lastError: null,
            sentAt: null,
            nextAttemptAt: null,
        });

        return this.toDto(doc);
    }

    async listJobs(
        limit = 100,
        status?: 'pending' | 'sent' | 'failed',
    ): Promise<NotificationEmailJobDTO[]> {
        const query: Record<string, unknown> = {};
        if (status) {
            query.status = status;
        }

        const safeLimit = Math.max(1, Math.min(limit, 300));
        const docs = await this.jobModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(safeLimit)
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }

    async getStats(): Promise<NotificationEmailQueueStatsDTO> {
        const [pending, failed, sent] = await Promise.all([
            this.jobModel.countDocuments({ status: 'pending' }),
            this.jobModel.countDocuments({ status: 'failed' }),
            this.jobModel.countDocuments({ status: 'sent' }),
        ]);
        return { pending, failed, sent };
    }

    async processPending(
        limit = 50,
    ): Promise<NotificationEmailQueueProcessResultDTO> {
        const safeLimit = Math.max(1, Math.min(limit, 200));
        const now = new Date();

        const jobs = await this.jobModel
            .find({
                status: 'pending',
                $or: [
                    { nextAttemptAt: null },
                    { nextAttemptAt: { $lte: now } },
                ],
            })
            .sort({ createdAt: 1 })
            .limit(safeLimit)
            .exec();

        if (jobs.length === 0) {
            return { processed: 0, sent: 0, failed: 0, skipped: 0 };
        }

        if (!this.mailEnabled()) {
            this.logger.warn(
                `MAIL_ENABLED is false. Skipping ${jobs.length} queued email job(s).`,
            );
            return { processed: 0, sent: 0, failed: 0, skipped: jobs.length };
        }

        let sent = 0;
        let failed = 0;

        for (const job of jobs) {
            try {
                await this.sendEmail(job.toEmail, job.subject, job.body);
                job.status = 'sent';
                job.sentAt = new Date();
                job.lastError = null;
                job.nextAttemptAt = null;
                await job.save();
                sent += 1;
            } catch (error) {
                const attempts = (job.attempts ?? 0) + 1;
                job.attempts = attempts;
                job.lastError =
                    error instanceof Error
                        ? error.message
                        : 'Unknown mail error';

                if (attempts >= this.maxAttempts) {
                    job.status = 'failed';
                    job.nextAttemptAt = null;
                    failed += 1;
                } else {
                    const delayMinutes = attempts * 5;
                    const retryAt = new Date(
                        Date.now() + delayMinutes * 60 * 1000,
                    );
                    job.nextAttemptAt = retryAt;
                }

                await job.save();
            }
        }

        return {
            processed: jobs.length,
            sent,
            failed,
            skipped: 0,
        };
    }

    private mailEnabled(): boolean {
        return this.configService.get<boolean>('mail.enabled') === true;
    }

    private async sendEmail(to: string, subject: string, body: string) {
        const transporter = this.getTransporter();
        const from =
            this.configService.get<string>('mail.from') ||
            'noreply@gcuoba.local';
        const appName =
            this.configService.get<string>('mail.appName') || 'GCUOBA Portal';
        const appUrl = this.normalizeAppUrl(
            this.configService.get<string>('mail.appUrl') || '',
        );

        await transporter.sendMail({
            from,
            to,
            subject,
            text: body,
            html: this.renderHtmlTemplate(subject, body, appName, appUrl),
        });
    }

    private getTransporter(): Transporter {
        if (this.transporter) {
            return this.transporter;
        }

        const host = this.configService.get<string>('mail.host') || 'localhost';
        const port = this.configService.get<number>('mail.port') || 1025;
        const secure = this.configService.get<boolean>('mail.secure') === true;
        const user = this.configService.get<string>('mail.user') || '';
        const pass = this.configService.get<string>('mail.pass') || '';

        const auth = user && pass ? { user, pass } : undefined;
        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth,
        });
        return this.transporter;
    }

    private toDto(doc: NotificationEmailJob): NotificationEmailJobDTO {
        const createdAt = (
            doc as NotificationEmailJob & { createdAt?: Date }
        ).createdAt?.toISOString();

        return {
            id: doc._id.toString(),
            notificationId: doc.notificationId ?? null,
            userId: doc.userId,
            toEmail: doc.toEmail,
            subject: doc.subject,
            body: doc.body,
            status: doc.status,
            attempts: doc.attempts ?? 0,
            lastError: doc.lastError ?? null,
            createdAt: createdAt ?? new Date().toISOString(),
            sentAt: doc.sentAt?.toISOString() ?? null,
            nextAttemptAt: doc.nextAttemptAt?.toISOString() ?? null,
        };
    }

    private renderHtmlTemplate(
        subject: string,
        body: string,
        appName: string,
        appUrl: string | null,
    ): string {
        const escapedAppName = this.escapeHtml(appName);
        const escapedSubject = this.escapeHtml(subject);
        const content = this.renderBodyAsHtml(body);
        const cta = appUrl
            ? `<p style="margin:20px 0 0;"><a href="${this.escapeHtml(appUrl)}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Open ${escapedAppName}</a></p>`
            : '';

        return [
            '<!doctype html>',
            '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>',
            '<body style="margin:0;padding:24px;background:#f3f4f6;font-family:Segoe UI,Arial,sans-serif;color:#111827;">',
            '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">',
            `<tr><td style="padding:16px 20px;background:#0f766e;color:#ffffff;font-size:15px;font-weight:700;">${escapedAppName}</td></tr>`,
            `<tr><td style="padding:24px 20px 8px;font-size:22px;line-height:1.3;font-weight:700;color:#111827;">${escapedSubject}</td></tr>`,
            `<tr><td style="padding:8px 20px 24px;font-size:15px;line-height:1.6;color:#374151;">${content}${cta}</td></tr>`,
            '<tr><td style="padding:14px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.5;color:#6b7280;">This message was sent by the GCUOBA notification service.</td></tr>',
            '</table>',
            '</body></html>',
        ].join('');
    }

    private renderBodyAsHtml(body: string): string {
        const paragraphs = body
            .split(/\n{2,}/)
            .map((chunk) => chunk.trim())
            .filter((chunk) => chunk.length > 0);

        if (paragraphs.length === 0) {
            return '<p style="margin:0;">You have a new update.</p>';
        }

        return paragraphs
            .map((paragraph) => {
                const safe = this.escapeHtml(paragraph).replace(/\n/g, '<br>');
                return `<p style="margin:0 0 14px;">${safe}</p>`;
            })
            .join('');
    }

    private escapeHtml(input: string): string {
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private normalizeAppUrl(rawUrl: string): string | null {
        const trimmed = rawUrl.trim();
        if (!trimmed) {
            return null;
        }

        try {
            const parsed = new URL(trimmed);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return null;
            }
            return parsed.toString();
        } catch {
            return null;
        }
    }
}
