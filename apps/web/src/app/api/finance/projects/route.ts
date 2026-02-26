import type { ProjectDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { createProject, listProjects } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const dtos = await listProjects(authUser.sub);
    return Response.json(dtos);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const body = (await request.json()) as Partial<ProjectDTO>;
    const dto = await createProject(authUser.sub, body);
    return Response.json(dto, { status: 201 });
  });
