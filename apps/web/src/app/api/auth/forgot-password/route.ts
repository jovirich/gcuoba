import { createHash, randomBytes } from 'crypto';
import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { PasswordResetTokenModel, UserModel } from '@/lib/server/models';
import { enqueueNotificationEmail, runNotificationEmailWorkerOnce } from '@/lib/server/notifications';

export const runtime = 'nodejs';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function normalizeHttpUrl(rawUrl: string | undefined): string | null {
  const value = (rawUrl ?? '').trim();
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.origin.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function resolveAppBaseUrl(request: Request): string {
  const requestUrl = new URL(request.url);
  const requestOrigin = requestUrl.origin.replace(/\/$/, '');

  // In local development, trust the active request origin to avoid stale
  // env values pointing to a different localhost port.
  if (isLocalHost(requestUrl.hostname)) {
    return requestOrigin;
  }

  const explicitMailUrl = normalizeHttpUrl(process.env.MAIL_APP_URL);
  if (explicitMailUrl) {
    return explicitMailUrl;
  }

  const configuredAppUrl =
    normalizeHttpUrl(process.env.NEXTAUTH_URL) ??
    normalizeHttpUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (configuredAppUrl) {
    return configuredAppUrl;
  }

  return requestOrigin;
}

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();

    const payload = (await request.json()) as { email?: string };
    const email = payload.email?.trim().toLowerCase();
    if (!email) {
      throw new ApiError(400, 'Email is required', 'BadRequest');
    }

    const user = await UserModel.findOne({ email }).exec();
    await PasswordResetTokenModel.deleteMany({ email, usedAt: null }).exec();

    let resetUrl: string | undefined;
    if (user) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await PasswordResetTokenModel.create({
        email,
        tokenHash,
        expiresAt,
        usedAt: null,
      });

      const appUrl = resolveAppBaseUrl(request);
      resetUrl = `${appUrl}/reset-password/${token}?email=${encodeURIComponent(email)}`;

      await enqueueNotificationEmail({
        userId: user._id.toString(),
        toEmail: user.email,
        subject: 'Reset your GCUOBA password',
        body: [
          'A request was received to reset your password.',
          '',
          `Reset link: ${resetUrl}`,
          '',
          'This link expires in 1 hour. If you did not request this, ignore this email.',
        ].join('\n'),
      });
      void runNotificationEmailWorkerOnce();
    }

    const exposeDevResetLink = /^(1|true)$/i.test(process.env.EXPOSE_DEV_RESET_LINK ?? '');
    return Response.json({
      message: 'If an account exists for this email, a password reset email has been sent.',
      ...(exposeDevResetLink && resetUrl ? { resetUrl } : {}),
    });
  });
