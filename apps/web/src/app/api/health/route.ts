import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withApiHandler(async () => {
    await connectMongo();
    return Response.json({
      ok: true,
      service: 'gcuoba-web-api',
      timestamp: new Date().toISOString(),
    });
  });
}
