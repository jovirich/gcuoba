import type { BranchMembershipDTO } from '@gcuoba/types';
import { rejectBranchMembership } from '@/lib/server/branch-executive';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ userId: string; membershipId: string }>;
};

type Body = {
  note?: string;
};

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { userId, membershipId } = await context.params;
    const body = (await request.json()) as Body;

    const updated: BranchMembershipDTO = await rejectBranchMembership(
      authUser.sub,
      userId,
      membershipId,
      body.note ?? '',
    );
    return Response.json(updated);
  });

