import { connectMongo } from '@/lib/server/mongo';
import { deleteDocument } from '@/lib/server/documents';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ documentId: string }>;
};

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { documentId } = await context.params;

    const result = await deleteDocument(authUser.sub, documentId);
    return Response.json(result);
  });

