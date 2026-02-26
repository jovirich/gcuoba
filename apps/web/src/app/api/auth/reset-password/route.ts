import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { PasswordResetTokenModel, UserModel } from '@/lib/server/models';

export const runtime = 'nodejs';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

type ResetBody = {
  token?: string;
  email?: string;
  password?: string;
  passwordConfirmation?: string;
};

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();

    const body = (await request.json()) as ResetBody;
    const token = body.token?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';
    const passwordConfirmation = body.passwordConfirmation ?? '';

    if (!token || !email) {
      throw new ApiError(400, 'Token and email are required', 'BadRequest');
    }
    if (password.length < 8 || passwordConfirmation.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters', 'BadRequest');
    }
    if (password !== passwordConfirmation) {
      throw new ApiError(400, 'Password confirmation does not match', 'BadRequest');
    }

    const now = new Date();
    const resetToken = await PasswordResetTokenModel.findOne({
      email,
      tokenHash: hashToken(token),
      usedAt: null,
      expiresAt: { $gt: now },
    }).exec();

    if (!resetToken) {
      throw new ApiError(400, 'Reset token is invalid or expired', 'BadRequest');
    }

    const user = await UserModel.findOne({ email }).exec();
    if (!user) {
      throw new ApiError(400, 'Reset token is invalid or expired', 'BadRequest');
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    resetToken.usedAt = now;
    await resetToken.save();
    await PasswordResetTokenModel.deleteMany({ email, usedAt: null }).exec();

    return Response.json({ message: 'Password has been reset successfully.' });
  });
