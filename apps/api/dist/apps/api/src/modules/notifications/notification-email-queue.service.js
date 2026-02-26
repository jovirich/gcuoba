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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var NotificationEmailQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationEmailQueueService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const nodemailer_1 = __importDefault(require("nodemailer"));
const notification_email_job_schema_1 = require("./schemas/notification-email-job.schema");
let NotificationEmailQueueService = NotificationEmailQueueService_1 = class NotificationEmailQueueService {
    jobModel;
    configService;
    logger = new common_1.Logger(NotificationEmailQueueService_1.name);
    transporter = null;
    maxAttempts = 5;
    constructor(jobModel, configService) {
        this.jobModel = jobModel;
        this.configService = configService;
    }
    async enqueue(input) {
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
    async listJobs(limit = 100, status) {
        const query = {};
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
    async getStats() {
        const [pending, failed, sent] = await Promise.all([
            this.jobModel.countDocuments({ status: 'pending' }),
            this.jobModel.countDocuments({ status: 'failed' }),
            this.jobModel.countDocuments({ status: 'sent' }),
        ]);
        return { pending, failed, sent };
    }
    async processPending(limit = 50) {
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
            this.logger.warn(`MAIL_ENABLED is false. Skipping ${jobs.length} queued email job(s).`);
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
            }
            catch (error) {
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
                }
                else {
                    const delayMinutes = attempts * 5;
                    const retryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
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
    mailEnabled() {
        return this.configService.get('mail.enabled') === true;
    }
    async sendEmail(to, subject, body) {
        const transporter = this.getTransporter();
        const from = this.configService.get('mail.from') ||
            'noreply@gcuoba.local';
        const appName = this.configService.get('mail.appName') || 'GCUOBA Portal';
        const appUrl = this.normalizeAppUrl(this.configService.get('mail.appUrl') || '');
        await transporter.sendMail({
            from,
            to,
            subject,
            text: body,
            html: this.renderHtmlTemplate(subject, body, appName, appUrl),
        });
    }
    getTransporter() {
        if (this.transporter) {
            return this.transporter;
        }
        const host = this.configService.get('mail.host') || 'localhost';
        const port = this.configService.get('mail.port') || 1025;
        const secure = this.configService.get('mail.secure') === true;
        const user = this.configService.get('mail.user') || '';
        const pass = this.configService.get('mail.pass') || '';
        const auth = user && pass ? { user, pass } : undefined;
        this.transporter = nodemailer_1.default.createTransport({
            host,
            port,
            secure,
            auth,
        });
        return this.transporter;
    }
    toDto(doc) {
        const createdAt = doc.createdAt?.toISOString();
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
    renderHtmlTemplate(subject, body, appName, appUrl) {
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
    renderBodyAsHtml(body) {
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
    escapeHtml(input) {
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    normalizeAppUrl(rawUrl) {
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
        }
        catch {
            return null;
        }
    }
};
exports.NotificationEmailQueueService = NotificationEmailQueueService;
exports.NotificationEmailQueueService = NotificationEmailQueueService = NotificationEmailQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notification_email_job_schema_1.NotificationEmailJob.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        config_1.ConfigService])
], NotificationEmailQueueService);
//# sourceMappingURL=notification-email-queue.service.js.map