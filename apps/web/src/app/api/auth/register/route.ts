import bcrypt from 'bcryptjs';
import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { toUserDto } from '@/lib/server/dto-mappers';
import {
  BranchMembershipModel,
  BranchModel,
  ClassMembershipModel,
  ClassModel,
  HouseModel,
  ProfileModel,
  UserModel,
} from '@/lib/server/models';
import { signAccessToken } from '@/lib/server/jwt';

export const runtime = 'nodejs';

type RegisterBody = {
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  password?: string;
  classId?: string;
  branchId?: string;
  houseId?: string;
  note?: string;
  photoUrl?: string;
};

const TITLES = new Set(['mr', 'mrs', 'ms', 'chief', 'dr', 'prof']);

function requiredString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function assertReferenceData(classId: string, branchId: string, houseId: string) {
  const [classExists, branchExists, houseExists] = await Promise.all([
    ClassModel.exists({ _id: classId }),
    BranchModel.exists({ _id: branchId }),
    HouseModel.exists({ _id: houseId }),
  ]);
  if (!branchExists) {
    throw new ApiError(400, 'Selected branch does not exist', 'BadRequest');
  }
  if (!classExists) {
    throw new ApiError(400, 'Selected class does not exist', 'BadRequest');
  }
  if (!houseExists) {
    throw new ApiError(400, 'Selected house does not exist', 'BadRequest');
  }
}

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();

    const body = (await request.json()) as RegisterBody;
    const title = requiredString(body.title).toLowerCase();
    const firstName = requiredString(body.firstName);
    const middleName = requiredString(body.middleName);
    const lastName = requiredString(body.lastName);
    const phone = requiredString(body.phone);
    const email = requiredString(body.email).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const classId = requiredString(body.classId);
    const branchId = requiredString(body.branchId);
    const houseId = requiredString(body.houseId);
    const note = requiredString(body.note);
    const photoUrl = requiredString(body.photoUrl);

    if (!TITLES.has(title)) {
      throw new ApiError(400, 'Invalid title', 'BadRequest');
    }
    if (!firstName || !lastName || !phone || !email || !classId || !branchId || !houseId) {
      throw new ApiError(400, 'Missing required fields', 'BadRequest');
    }
    if (password.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters', 'BadRequest');
    }

    await assertReferenceData(classId, branchId, houseId);

    const existing = await UserModel.findOne({ email }).select('_id').exec();
    if (existing) {
      throw new ApiError(400, 'Unable to register member', 'BadRequest');
    }

    const name = `${firstName} ${lastName}`.trim();
    const passwordHash = await bcrypt.hash(password, 10);
    const userDoc = await UserModel.create({
      name,
      email,
      passwordHash,
      phone,
      status: 'pending',
    });
    const userId = userDoc._id.toString();

    await Promise.all([
      ProfileModel.findOneAndUpdate(
        { userId },
        {
          userId,
          title,
          firstName,
          middleName: middleName || null,
          lastName,
          houseId,
          privacyLevel: 'public_to_members',
          photoUrl: photoUrl || null,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).exec(),
      ClassMembershipModel.findOneAndUpdate(
        { userId },
        { userId, classId, joinedAt: new Date() },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).exec(),
      BranchMembershipModel.findOneAndUpdate(
        { userId, branchId },
        {
          userId,
          branchId,
          status: 'requested',
          requestedAt: new Date(),
          approvedAt: null,
          approvedBy: null,
          endedAt: null,
          note: note || 'Registration request',
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).exec(),
    ]);

    const user = toUserDto(userDoc);
    const token = signAccessToken(user);
    return Response.json({ user, token }, { status: 201 });
  });
