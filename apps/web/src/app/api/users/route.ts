import type { UserDTO } from '@gcuoba/types';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireAuthTokenUser } from '@/lib/server/request-auth';
import { UserModel } from '@/lib/server/models';
import { toUserDto } from '@/lib/server/dto-mappers';

export const runtime = 'nodejs';

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    await requireAuthTokenUser(request);

    const docs = await UserModel.find().select('name email phone status').exec();
    const result: UserDTO[] = docs.map((doc) => toUserDto(doc));
    return Response.json(result);
  });

