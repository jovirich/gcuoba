import bcrypt from 'bcryptjs';
import { ApiError } from './api-error';
import {
  BranchMembershipModel,
  BranchModel,
  ClassMembershipModel,
  ClassModel,
  HouseModel,
  ProfileModel,
  UserModel,
} from './models';
import { signClassClaimToken, verifyClassClaimToken } from './jwt';
import { assignAlumniNumberForClassMembership } from './alumni-number';
import { ensureCurrentYearDuesInvoices } from './finance';

type ClaimMember = {
  userId: string;
  name: string;
  phone: string | null;
  emailMasked: string;
  emailIsPlaceholder: boolean;
};

export type ClaimRegistrationOptions = {
  classInfo: {
    classId: string;
    entryYear: number;
    label: string;
  };
  branches: Array<{ id: string; name: string }>;
  houses: Array<{ id: string; name: string }>;
};

type ClassClaimProfileInput = {
  token: string;
  classYear: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  title?: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  dobDay: number;
  dobMonth: number;
  dobYear?: number | null;
  branchId?: string | null;
  houseId?: string | null;
  note?: string | null;
};

function requiredString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+234${digits.slice(1)}`;
  }
  return `+${digits}`;
}

function normalizeLegacyBcrypt(hash: string): string {
  if (hash.startsWith('$2y$')) {
    return `$2b$${hash.slice(4)}`;
  }
  return hash;
}

function maskEmail(email: string) {
  const lower = email.toLowerCase();
  const parts = lower.split('@');
  if (parts.length !== 2) {
    return lower;
  }
  const local = parts[0];
  if (local.length <= 2) {
    return `${local[0] ?? '*'}***@${parts[1]}`;
  }
  return `${local.slice(0, 2)}***@${parts[1]}`;
}

function isPlaceholderEmail(email: string) {
  return email.toLowerCase().endsWith('@placeholder.gcuoba.local');
}

function isClaimableUser(user: { status?: 'pending' | 'active' | 'suspended'; claimStatus?: 'unclaimed' | 'claimed' }) {
  if (user.claimStatus === 'unclaimed') {
    return true;
  }
  return user.status === 'pending' && user.claimStatus === undefined;
}

async function resolveClassByYear(classYear: number) {
  const classDoc = await ClassModel.findOne({ entryYear: classYear })
    .select('_id entryYear label')
    .lean<{ _id: { toString(): string }; entryYear: number; label: string }>()
    .exec();
  if (!classDoc) {
    throw new ApiError(404, `Class ${classYear} not found`, 'NotFound');
  }
  return {
    classId: classDoc._id.toString(),
    entryYear: classDoc.entryYear,
    label: classDoc.label,
  };
}

export async function listClassClaimMembers(classYear: number, query?: string): Promise<ClaimMember[]> {
  const classInfo = await resolveClassByYear(classYear);
  const memberships = await ClassMembershipModel.find({ classId: classInfo.classId })
    .select('userId')
    .lean<Array<{ userId: string }>>()
    .exec();

  const userIds = memberships.map((entry) => entry.userId);
  if (userIds.length === 0) {
    return [];
  }

  const users = await UserModel.find({ _id: { $in: userIds } })
    .select('name phone email status claimStatus')
    .lean<
      Array<{
        _id: { toString(): string };
        name?: string;
        phone?: string | null;
        email: string;
        status?: 'pending' | 'active' | 'suspended';
        claimStatus?: 'unclaimed' | 'claimed';
      }>
    >()
    .exec();

  const normalizedQuery = query?.trim().toLowerCase() || '';
  const rows = users
    .filter((user) => isClaimableUser(user))
    .map((user) => ({
      userId: user._id.toString(),
      name: user.name?.trim() || 'Unnamed member',
      phone: user.phone?.trim() || null,
      emailMasked: maskEmail(user.email),
      emailIsPlaceholder: isPlaceholderEmail(user.email),
    }))
    .filter((entry) => {
      if (!normalizedQuery) {
        return true;
      }
      return entry.name.toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 100);

  return rows;
}

export async function verifyClassClaim(
  classYear: number,
  userId: string,
  password: string,
): Promise<{ token: string; member: ClaimMember; classInfo: { classId: string; entryYear: number; label: string } }> {
  const classInfo = await resolveClassByYear(classYear);
  const membership = await ClassMembershipModel.findOne({ classId: classInfo.classId, userId })
    .select('userId')
    .lean<{ userId: string }>()
    .exec();
  if (!membership) {
    throw new ApiError(404, 'Member not found in this class claim list', 'NotFound');
  }

  const user = await UserModel.findById(userId).select('name phone email passwordHash status claimStatus').exec();
  if (!user) {
    throw new ApiError(404, 'Member account not found', 'NotFound');
  }
  if (!isClaimableUser(user)) {
    throw new ApiError(400, 'This account has already been claimed.', 'BadRequest');
  }

  const valid = await bcrypt.compare(password, normalizeLegacyBcrypt(user.passwordHash));
  if (!valid) {
    throw new ApiError(401, 'Default password is incorrect', 'Unauthorized');
  }

  return {
    token: signClassClaimToken(userId, classYear),
    classInfo,
    member: {
      userId: user._id.toString(),
      name: user.name,
      phone: user.phone ?? null,
      emailMasked: maskEmail(user.email),
      emailIsPlaceholder: isPlaceholderEmail(user.email),
    },
  };
}

export async function getClassClaimRegistrationOptions(classYear: number): Promise<ClaimRegistrationOptions> {
  const classInfo = await resolveClassByYear(classYear);
  const [branches, houses] = await Promise.all([
    BranchModel.find().sort({ name: 1 }).select('_id name').lean<Array<{ _id: { toString(): string }; name: string }>>().exec(),
    HouseModel.find().sort({ name: 1 }).select('_id name').lean<Array<{ _id: { toString(): string }; name: string }>>().exec(),
  ]);

  return {
    classInfo,
    branches: branches.map((entry) => ({ id: entry._id.toString(), name: entry.name })),
    houses: houses.map((entry) => ({ id: entry._id.toString(), name: entry.name })),
  };
}

export async function completeClassClaimProfile(input: ClassClaimProfileInput): Promise<{ success: true; userId: string }> {
  const payload = verifyClassClaimToken(input.token, input.classYear);
  const userId = payload.sub;
  const classInfo = await resolveClassByYear(input.classYear);
  const membership = await ClassMembershipModel.findOne({ classId: classInfo.classId, userId })
    .select('userId classId')
    .lean<{ userId: string; classId: string }>()
    .exec();
  if (!membership) {
    throw new ApiError(403, 'Member does not belong to this class claim context', 'Forbidden');
  }

  const firstName = requiredString(input.firstName);
  const lastName = requiredString(input.lastName);
  const middleName = requiredString(input.middleName);
  const title = requiredString(input.title).toLowerCase() || 'mr';
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);

  if (!firstName || !lastName) {
    throw new ApiError(400, 'First and last name are required', 'BadRequest');
  }
  if (!phone) {
    throw new ApiError(400, 'Phone number is required', 'BadRequest');
  }
  if (!email.includes('@')) {
    throw new ApiError(400, 'Valid email is required', 'BadRequest');
  }
  if (input.password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters', 'BadRequest');
  }
  if (input.password !== input.confirmPassword) {
    throw new ApiError(400, 'Password confirmation does not match', 'BadRequest');
  }
  if (!Number.isInteger(input.dobDay) || input.dobDay < 1 || input.dobDay > 31) {
    throw new ApiError(400, 'Birth day must be between 1 and 31', 'BadRequest');
  }
  if (!Number.isInteger(input.dobMonth) || input.dobMonth < 1 || input.dobMonth > 12) {
    throw new ApiError(400, 'Birth month must be between 1 and 12', 'BadRequest');
  }
  if (input.dobYear !== null && input.dobYear !== undefined) {
    if (!Number.isInteger(input.dobYear) || input.dobYear < 1900 || input.dobYear > 2100) {
      throw new ApiError(400, 'Birth year must be between 1900 and 2100', 'BadRequest');
    }
  }

  const [emailConflict, phoneConflict] = await Promise.all([
    UserModel.findOne({ email, _id: { $ne: userId } }).select('_id').lean<{ _id: unknown }>().exec(),
    UserModel.findOne({ phone, _id: { $ne: userId } }).select('_id').lean<{ _id: unknown }>().exec(),
  ]);
  if (emailConflict) {
    throw new ApiError(400, 'This email is already in use', 'BadRequest');
  }
  if (phoneConflict) {
    throw new ApiError(400, 'This phone number is already in use', 'BadRequest');
  }

  const branchId: string | null = input.branchId?.trim() || null;
  if (branchId) {
    const exists = await BranchModel.exists({ _id: branchId });
    if (!exists) {
      throw new ApiError(400, 'Selected branch does not exist', 'BadRequest');
    }
  }

  const houseId: string | null = input.houseId?.trim() || null;
  if (houseId) {
    const exists = await HouseModel.exists({ _id: houseId });
    if (!exists) {
      throw new ApiError(400, 'Selected house does not exist', 'BadRequest');
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await UserModel.findById(userId).exec();
  if (!user) {
    throw new ApiError(404, 'Member account not found', 'NotFound');
  }
  const priorEmail = user.email;
  user.name = `${firstName} ${lastName}`.trim();
  user.email = email;
  user.phone = phone;
  user.passwordHash = passwordHash;
  user.status = 'active';
  user.claimStatus = 'claimed';
  user.claimedAt = new Date();
  if (priorEmail.toLowerCase() !== email.toLowerCase()) {
    user.emailVerifiedAt = null;
  }
  await user.save();

  await ProfileModel.findOneAndUpdate(
    { userId },
    {
      userId,
      title,
      firstName,
      middleName: middleName || null,
      lastName,
      dobDay: input.dobDay,
      dobMonth: input.dobMonth,
      dobYear: input.dobYear ?? null,
      houseId,
      privacyLevel: 'public_to_members',
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).exec();

  if (branchId) {
    await BranchMembershipModel.findOneAndUpdate(
      { userId, branchId },
      {
        userId,
        branchId,
        status: 'requested',
        requestedAt: new Date(),
        approvedAt: null,
        approvedBy: null,
        endedAt: null,
        note: input.note?.trim() || 'Claimed via class onboarding',
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
  }

  await assignAlumniNumberForClassMembership(userId, classInfo.classId);
  await ensureCurrentYearDuesInvoices({ userId, scopeType: 'class', scopeId: classInfo.classId });
  if (branchId) {
    await ensureCurrentYearDuesInvoices({ userId, scopeType: 'branch', scopeId: branchId });
  }

  return { success: true, userId };
}
