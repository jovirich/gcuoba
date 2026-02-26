import type { ProjectDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { deleteProject, updateProject } from '@/lib/server/finance';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ projectId: string }> };

export const PATCH = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { projectId } = await context.params;
    const body = (await request.json()) as Partial<ProjectDTO>;
    const dto = await updateProject(authUser.sub, projectId, body);
    return Response.json(dto);
  });

export const DELETE = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { projectId } = await context.params;
    await deleteProject(authUser.sub, projectId);
    return Response.json({ success: true });
  });
