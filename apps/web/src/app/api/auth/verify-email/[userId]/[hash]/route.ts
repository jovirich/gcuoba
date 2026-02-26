import { createHash } from 'crypto';
import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { UserModel } from '@/lib/server/models';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ userId: string; hash: string }>;
};

export const GET = (_request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { userId, hash } = await context.params;

    const user = await UserModel.findById(userId).exec();
    if (!user) {
      throw new ApiError(400, 'Verification link is invalid', 'BadRequest');
    }

    const expected = createHash('sha1').update(user.email.toLowerCase()).digest('hex');
    if (hash !== expected) {
      throw new ApiError(400, 'Verification link is invalid', 'BadRequest');
    }

    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date();
      await user.save();
    }

    return Response.json({ message: 'Email verified successfully.' });
  });
