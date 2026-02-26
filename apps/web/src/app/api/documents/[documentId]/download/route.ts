import { connectMongo } from '@/lib/server/mongo';
import { downloadDocument } from '@/lib/server/documents';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ documentId: string }>;
};

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { documentId } = await context.params;

    const file = await downloadDocument(authUser.sub, documentId);
    return new Response(file.content, {
      status: 200,
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
      },
    });
  });

