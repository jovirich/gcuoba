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

function isLikelyEmail(value: string) {
  return value.includes('@');
}

function phoneLookupCandidates(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  const candidates = new Set<string>();
  if (!digits) {
    return [] as string[];
  }

  if (trimmed.startsWith('+')) {
    candidates.add(`+${digits}`);
  }
  candidates.add(digits);

  if (digits.length === 11 && digits.startsWith('0')) {
    const local = digits.slice(1);
    candidates.add(`+234${local}`);
    candidates.add(`234${local}`);
  }

  if (digits.length === 13 && digits.startsWith('234')) {
    const local = digits.slice(3);
    candidates.add(`+${digits}`);
    candidates.add(`0${local}`);
  }

  return Array.from(candidates);
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

    const payload = (await request.json()) as { identifier?: string; email?: string; password?: string };
    const identifier = (payload.identifier ?? payload.email)?.trim();
    const password = payload.password;
    if (!identifier || !password) {
      throw new ApiError(400, 'Email or phone and password are required', 'BadRequest');
    }

    const lookupValue = identifier.toLowerCase();
    let existing = null as Awaited<ReturnType<typeof UserModel.findOne>>;
    if (isLikelyEmail(lookupValue)) {
      existing = await UserModel.findOne({ email: lookupValue }).exec();
    } else {
      const candidates = phoneLookupCandidates(identifier);
      if (candidates.length === 0) {
        throw new ApiError(401, 'Invalid credentials', 'Unauthorized');
      }
      const matches = await UserModel.find({ phone: { $in: candidates } })
        .limit(2)
        .exec();
      if (matches.length > 1) {
        throw new ApiError(
          400,
          'This phone number maps to multiple accounts. Please sign in with email.',
          'BadRequest',
        );
      }
      existing = matches[0] ?? null;
    }

    if (!existing) {
      throw new ApiError(401, 'Invalid credentials', 'Unauthorized');
    }

    const passwordHash = normalizeLegacyBcrypt(existing.passwordHash);
    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
      throw new ApiError(401, 'Invalid credentials', 'Unauthorized');
    }

    const normalizedEmail = existing.email.toLowerCase();
    if (forcedAdminEmails().has(normalizedEmail)) {
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
