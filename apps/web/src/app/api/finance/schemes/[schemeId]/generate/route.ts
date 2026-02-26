import { connectMongo } from '@/lib/server/mongo';
import { generateSchemeInvoices } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ schemeId: string }> };

type Body = { year?: number };

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { schemeId } = await context.params;
    const body = (await request.json()) as Body;
    const year = Number(body.year);
    const dto = await generateSchemeInvoices(authUser.sub, schemeId, year);
    return Response.json(dto);
  });
