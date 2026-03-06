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
  RoleAssignmentModel,
  RoleModel,
  UserModel,
} from '@/lib/server/models';
import { signAccessToken } from '@/lib/server/jwt';
import { assignAlumniNumberForUserIfClassed } from '@/lib/server/alumni-number';

export const runtime = 'nodejs';

const DEFAULT_FORCED_ADMIN_EMAILS = ['ejovi.ekakitie@hotmail.com'];

function forcedAdminEmails() {
  const raw = process.env.FORCED_GLOBAL_ADMIN_EMAILS;
  if (!raw) {
    return new Set(DEFAULT_FORCED_ADMIN_EMAILS);
  }
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function normalizeLegacyBcrypt(hash: string): string {
  if (hash.startsWith('$2y$')) {
    return `$2b$${hash.slice(4)}`;
  }
  return hash;
}

async function ensureGlobalAdminForUser(userId: string) {
  let role = await RoleModel.findOne({ code: 'super_admin', scope: 'global' }).exec();
  if (!role) {
    role = await RoleModel.create({
      code: 'super_admin',
      name: 'Super Admin',
      scope: 'global',
    });
  }

  const existing = await RoleAssignmentModel.findOne({
    userId,
    scopeType: 'global',
    roleCode: 'super_admin',
    $or: [{ endDate: null }, { endDate: { $exists: false } }],
  }).exec();
  if (!existing) {
    await RoleAssignmentModel.create({
      userId,
      roleId: role._id,
      roleCode: 'super_admin',
      scopeType: 'global',
      scopeId: null,
      startDate: new Date(),
      endDate: null,
    });
  }
}

async function ensureExecutiveMemberFoundation(userId: string) {
  const [classMembership, approvedBranchMembership] = await Promise.all([
    ClassMembershipModel.findOne({ userId }).exec(),
    BranchMembershipModel.findOne({ userId, status: 'approved' }).exec(),
  ]);

  if (!classMembership) {
    const classSet =
      (await ClassModel.findOne({ status: 'active' }).sort({ entryYear: -1 }).exec()) ??
      (await ClassModel.findOne().sort({ entryYear: -1 }).exec());
    if (classSet) {
      await ClassMembershipModel.findOneAndUpdate(
        { userId },
        { userId, classId: classSet._id.toString(), joinedAt: new Date() },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).exec();
    }
  }

  if (!approvedBranchMembership) {
    const branch = await BranchModel.findOne().sort({ name: 1 }).exec();
    if (branch) {
      const now = new Date();
      await BranchMembershipModel.findOneAndUpdate(
        { userId, branchId: branch._id.toString() },
        {
          userId,
          branchId: branch._id.toString(),
          status: 'approved',
          requestedAt: now,
          approvedAt: now,
          approvedBy: userId,
          endedAt: null,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).exec();
    }
  }
}

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();

    const payload = (await request.json()) as { email?: string; password?: string };
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required', 'BadRequest');
    }

    const existing = await UserModel.findOne({ email }).exec();
    if (!existing) {
      throw new ApiError(401, 'Invalid credentials', 'Unauthorized');
    }

    const passwordHash = normalizeLegacyBcrypt(existing.passwordHash);
    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
      throw new ApiError(401, 'Invalid credentials', 'Unauthorized');
    }

    if (forcedAdminEmails().has(email)) {
      await ensureGlobalAdminForUser(existing._id.toString());
      await ensureExecutiveMemberFoundation(existing._id.toString());
      await assignAlumniNumberForUserIfClassed(existing._id.toString());
      if (existing.status !== 'active') {
        existing.status = 'active';
        await existing.save();
      }
    }

    const user = toUserDto(existing);
    const token = signAccessToken(user);
    return Response.json({ user, token });
  });
