import { withApiHandler } from '@/lib/server/route';
import { connectMongo } from '@/lib/server/mongo';
import { toBranchDto, toClassDto, toHouseDto } from '@/lib/server/dto-mappers';
import { BranchModel, ClassModel, HouseModel } from '@/lib/server/models';

export const runtime = 'nodejs';

export const GET = () =>
  withApiHandler(async () => {
    await connectMongo();

    const [classes, branches, houses] = await Promise.all([
      ClassModel.find().sort({ entryYear: -1 }).exec(),
      BranchModel.find().sort({ name: 1 }).exec(),
      HouseModel.find().sort({ name: 1 }).exec(),
    ]);

    return Response.json({
      classes: classes.map((entry) => toClassDto(entry)),
      branches: branches.map((entry) => toBranchDto(entry)),
      houses: houses.map((entry) => toHouseDto(entry)),
    });
  });
