import { createHash, randomBytes } from 'crypto';
import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { PasswordResetTokenModel, UserModel } from '@/lib/server/models';

export const runtime = 'nodejs';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
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

      const appUrl = (process.env.MAIL_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(
        /\/$/,
        '',
      );
      resetUrl = `${appUrl}/reset-password/${token}?email=${encodeURIComponent(email)}`;
    }

    return Response.json({
      message: 'If an account exists for this email, a reset link has been generated.',
      ...(process.env.NODE_ENV !== 'production' && resetUrl ? { resetUrl } : {}),
    });
  });
