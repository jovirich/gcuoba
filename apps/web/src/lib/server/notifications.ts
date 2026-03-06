import type {
  NotificationDTO,
  NotificationEmailJobDTO,
  NotificationEmailQueueProcessResultDTO,
  NotificationEmailQueueStatsDTO,
  NotificationEmailWorkerStatusDTO,
} from '@gcuoba/types';
import { Types } from 'mongoose';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { ApiError } from './api-error';
import { toNotificationDto, toNotificationEmailJobDto } from './dto-mappers';
import { NotificationEmailJobModel, NotificationModel, UserModel } from './models';

type NotificationType = 'info' | 'success' | 'warning' | 'action_required';

type CreateNotificationInput = {
  title: string;
  message: string;
  type?: NotificationType;
  metadata?: Record<string, unknown> | null;
};

type QueueEmailInput = {
  notificationId?: string | null;
  userId: string;
  toEmail: string;
  subject: string;
  body: string;
};

const EMAIL_MAX_ATTEMPTS = 5;
let transporter: Transporter | null = null;
let workerRunning = false;
let workerLastRunAt: Date | null = null;
let workerLastResult: NotificationEmailQueueProcessResultDTO | null = null;

function readBoolean(raw: string | undefined, fallback = false): boolean {
  if (!raw) {
    return fallback;
  }
  return raw === '1' || raw.toLowerCase() === 'true';
}

function readNumber(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function mailEnabled() {
  if (brevoApiKey()) {
    return true;
  }
  return readBoolean(process.env.MAIL_ENABLED, false);
}

function brevoApiKey(): string | null {
  const key = process.env.BREVO_API_KEY?.trim() || process.env.BREVO_KEY?.trim() || '';
  return key || null;
}

function queueWorkerEnabled() {
  return readBoolean(process.env.EMAIL_QUEUE_WORKER_ENABLED, false);
}

function queuePollSeconds() {
  return Math.max(10, readNumber(process.env.EMAIL_QUEUE_POLL_SECONDS, 60));
}

function queueBatchSize() {
  return Math.max(1, Math.min(200, readNumber(process.env.EMAIL_QUEUE_BATCH_SIZE, 50)));
}

function notificationType(input?: NotificationType): NotificationType {
  if (input === 'info' || input === 'success' || input === 'warning' || input === 'action_required') {
    return input;
  }
  return 'info';
}

function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const host = process.env.MAIL_HOST || 'localhost';
  const port = readNumber(process.env.MAIL_PORT, 1025);
  const secure = readBoolean(process.env.MAIL_SECURE, false);
  const user = process.env.MAIL_USER || '';
  const pass = process.env.MAIL_PASS || '';

  const auth = user && pass ? { user, pass } : undefined;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth,
  });
  return transporter;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeAppUrl(rawUrl: string | undefined): string | null {
  const candidate = (rawUrl || '').trim();
  if (!candidate) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function renderBodyAsHtml(body: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  if (paragraphs.length === 0) {
    return '<p style="margin:0;">You have a new update.</p>';
  }

  return paragraphs
    .map((paragraph) => {
      const safe = escapeHtml(paragraph).replace(/\n/g, '<br>');
      return `<p style="margin:0 0 14px;">${safe}</p>`;
    })
    .join('');
}

function renderHtmlTemplate(subject: string, body: string): string {
  const appName = process.env.MAIL_APP_NAME || 'GCUOBA Portal';
  const appUrl = normalizeAppUrl(process.env.MAIL_APP_URL || process.env.NEXT_PUBLIC_APP_URL);
  const escapedAppName = escapeHtml(appName);
  const escapedSubject = escapeHtml(subject);
  const content = renderBodyAsHtml(body);
  const cta = appUrl
    ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:10px 16px;background:#b91c1c;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Open ${escapedAppName}</a></p>`
    : '';

  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>',
    '<body style="margin:0;padding:24px;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#111827;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">',
    `<tr><td style="padding:16px 20px;background:#b91c1c;color:#fef3c7;font-size:15px;font-weight:700;">${escapedAppName}</td></tr>`,
    `<tr><td style="padding:24px 20px 8px;font-size:22px;line-height:1.3;font-weight:700;color:#111827;">${escapedSubject}</td></tr>`,
    `<tr><td style="padding:8px 20px 24px;font-size:15px;line-height:1.6;color:#374151;">${content}${cta}</td></tr>`,
    '<tr><td style="padding:14px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.5;color:#6b7280;">This message was sent by the GCUOBA notification service.</td></tr>',
    '</table>',
    '</body></html>',
  ].join('');
}

async function sendEmail(to: string, subject: string, body: string) {
  const from =
    process.env.MAIL_FROM ||
    (process.env.BREVO_SENDER_EMAIL
      ? `${process.env.BREVO_SENDER_NAME || process.env.MAIL_APP_NAME || 'GCUOBA Portal'} <${process.env.BREVO_SENDER_EMAIL}>`
      : 'noreply@gcuoba.local');

  const key = brevoApiKey();
  if (key) {
    const match = from.match(/^(.*)<([^>]+)>$/);
    const senderName = match
      ? match[1].trim().replace(/^"|"$/g, '')
      : process.env.BREVO_SENDER_NAME || process.env.MAIL_APP_NAME || 'GCUOBA Portal';
    const senderEmail = match
      ? match[2].trim()
      : process.env.BREVO_SENDER_EMAIL?.trim() || from.trim();

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': key,
      },
      body: JSON.stringify({
        sender: {
          email: senderEmail,
          name: senderName,
        },
        to: [{ email: to }],
        subject,
        textContent: body,
        htmlContent: renderHtmlTemplate(subject, body),
      }),
    });
    if (!response.ok) {
      const reason = await response.text();
      throw new ApiError(502, `Brevo send failed: ${reason || response.statusText}`, 'BadGateway');
    }
    return;
  }

  await getTransporter().sendMail({
    from,
    to,
    subject,
    text: body,
    html: renderHtmlTemplate(subject, body),
  });
}

export async function enqueueNotificationEmail(input: QueueEmailInput): Promise<NotificationEmailJobDTO> {
  const doc = await NotificationEmailJobModel.create({
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
  return toNotificationEmailJobDto(doc);
}

async function enqueueNotificationEmailForUser(
  userId: string,
  subject: string,
  body: string,
  notificationId?: string,
) {
  const user = await UserModel.findById(userId).select('email').lean<{ email?: string | null }>().exec();
  if (!user?.email) {
    return;
  }

  await enqueueNotificationEmail({
    notificationId: notificationId ?? null,
    userId,
    toEmail: user.email,
    subject,
    body,
  });
}

export async function createNotificationForUser(
  userId: string,
  input: CreateNotificationInput,
): Promise<NotificationDTO> {
  const doc = await NotificationModel.create({
    userId,
    title: input.title,
    message: input.message,
    type: notificationType(input.type),
    metadata: input.metadata ?? null,
    readAt: null,
  });

  void enqueueNotificationEmailForUser(userId, doc.title, doc.message, doc._id.toString()).catch(() => undefined);
  return toNotificationDto(doc);
}

export async function listNotificationsForUser(
  userId: string,
  unreadOnly = false,
  limit = 50,
): Promise<NotificationDTO[]> {
  const query: Record<string, unknown> = { userId };
  if (unreadOnly) {
    query.readAt = null;
  }

  const safeLimit = Math.max(1, Math.min(limit, 200));
  const docs = await NotificationModel.find(query).sort({ createdAt: -1 }).limit(safeLimit).exec();
  return docs.map((doc) => toNotificationDto(doc));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return NotificationModel.countDocuments({ userId, readAt: null }).exec();
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<NotificationDTO> {
  if (!Types.ObjectId.isValid(notificationId)) {
    throw new ApiError(404, 'Notification not found', 'NotFound');
  }

  const doc = await NotificationModel.findOne({ _id: notificationId, userId }).exec();
  if (!doc) {
    throw new ApiError(404, 'Notification not found', 'NotFound');
  }
  if (!doc.readAt) {
    doc.readAt = new Date();
    await doc.save();
  }
  return toNotificationDto(doc);
}

export async function markAllNotificationsRead(userId: string): Promise<{ updated: number }> {
  const result = await NotificationModel.updateMany(
    { userId, readAt: null },
    { $set: { readAt: new Date() } },
  ).exec();
  return { updated: result.modifiedCount ?? 0 };
}

export async function listNotificationEmailJobs(
  limit = 100,
  status?: 'pending' | 'sent' | 'failed',
): Promise<NotificationEmailJobDTO[]> {
  const query: Record<string, unknown> = {};
  if (status) {
    query.status = status;
  }

  const safeLimit = Math.max(1, Math.min(limit, 300));
  const docs = await NotificationEmailJobModel.find(query)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .exec();
  return docs.map((doc) => toNotificationEmailJobDto(doc));
}

export async function getNotificationEmailQueueStats(): Promise<NotificationEmailQueueStatsDTO> {
  const [pending, failed, sent] = await Promise.all([
    NotificationEmailJobModel.countDocuments({ status: 'pending' }),
    NotificationEmailJobModel.countDocuments({ status: 'failed' }),
    NotificationEmailJobModel.countDocuments({ status: 'sent' }),
  ]);

  return { pending, failed, sent };
}

export async function processNotificationEmailQueue(
  limit = 50,
): Promise<NotificationEmailQueueProcessResultDTO> {
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const now = new Date();

  const jobs = await NotificationEmailJobModel.find({
    status: 'pending',
    $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
  })
    .sort({ createdAt: 1 })
    .limit(safeLimit)
    .exec();

  if (jobs.length === 0) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  if (!mailEnabled()) {
    return { processed: 0, sent: 0, failed: 0, skipped: jobs.length };
  }

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await sendEmail(job.toEmail, job.subject, job.body);
      job.status = 'sent';
      job.sentAt = new Date();
      job.lastError = null;
      job.nextAttemptAt = null;
      await job.save();
      sent += 1;
    } catch (error) {
      const attempts = (job.attempts ?? 0) + 1;
      job.attempts = attempts;
      job.lastError = error instanceof Error ? error.message : 'Unknown mail error';

      if (attempts >= EMAIL_MAX_ATTEMPTS) {
        job.status = 'failed';
        job.nextAttemptAt = null;
        failed += 1;
      } else {
        const delayMinutes = attempts * 5;
        job.nextAttemptAt = new Date(Date.now() + delayMinutes * 60 * 1000);
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

export async function runNotificationEmailWorkerOnce(): Promise<NotificationEmailQueueProcessResultDTO> {
  if (workerRunning) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  workerRunning = true;
  try {
    const result = await processNotificationEmailQueue(queueBatchSize());
    workerLastResult = result;
    workerLastRunAt = new Date();
    return result;
  } catch {
    workerLastResult = { processed: 0, sent: 0, failed: 0, skipped: 0 };
    workerLastRunAt = new Date();
    return workerLastResult;
  } finally {
    workerRunning = false;
  }
}

export function getNotificationEmailWorkerStatus(): NotificationEmailWorkerStatusDTO {
  return {
    enabled: queueWorkerEnabled(),
    running: workerRunning,
    pollSeconds: queuePollSeconds(),
    batchSize: queueBatchSize(),
    lastRunAt: workerLastRunAt?.toISOString() ?? null,
    lastResult: workerLastResult,
  };
}

