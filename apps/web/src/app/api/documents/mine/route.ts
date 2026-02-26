import type { DocumentRecordDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { listMyDocuments } from '@/lib/server/documents';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const docs: DocumentRecordDTO[] = await listMyDocuments(authUser.sub);
    return Response.json(docs);
  });

