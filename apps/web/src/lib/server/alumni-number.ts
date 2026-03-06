import { ApiError } from './api-error';
import { ClassMembershipModel, ClassModel, UserModel } from './models';

const ALUMNI_DIGITS = 4;
const MAX_ALUMNI_SEQUENCE = 10 ** ALUMNI_DIGITS - 1;

function formatAlumniNumber(entryYear: number, sequence: number) {
  return `${entryYear}${sequence.toString().padStart(ALUMNI_DIGITS, '0')}`;
}

function isAlumniPrefixMatch(alumniNumber: string | null | undefined, entryYear: number) {
  if (!alumniNumber) {
    return false;
  }
  return alumniNumber.startsWith(String(entryYear)) && alumniNumber.length === String(entryYear).length + ALUMNI_DIGITS;
}

async function nextAlumniSequence(entryYear: number) {
  const prefix = String(entryYear);
  const latest = await UserModel.findOne({
    alumniNumber: { $regex: `^${prefix}\\d{${ALUMNI_DIGITS}}$` },
  })
    .select('alumniNumber')
    .sort({ alumniNumber: -1 })
    .lean<{ alumniNumber?: string | null }>()
    .exec();

  if (!latest?.alumniNumber) {
    return 1;
  }
  const suffix = Number(latest.alumniNumber.slice(prefix.length));
  if (!Number.isFinite(suffix) || suffix < 1) {
    return 1;
  }
  return suffix + 1;
}

export async function assignAlumniNumberForClassMembership(userId: string, classId: string): Promise<string> {
  const [classRecord, userRecord] = await Promise.all([
    ClassModel.findById(classId).select('entryYear').lean<{ entryYear?: number }>().exec(),
    UserModel.findById(userId).select('alumniNumber').exec(),
  ]);

  if (!classRecord?.entryYear) {
    throw new ApiError(400, 'Class record not found for alumni numbering', 'BadRequest');
  }
  if (!userRecord) {
    throw new ApiError(404, 'User not found for alumni numbering', 'NotFound');
  }

  if (isAlumniPrefixMatch(userRecord.alumniNumber, classRecord.entryYear)) {
    return userRecord.alumniNumber as string;
  }

  let sequence = await nextAlumniSequence(classRecord.entryYear);
  while (sequence <= MAX_ALUMNI_SEQUENCE) {
    const candidate = formatAlumniNumber(classRecord.entryYear, sequence);
    try {
      userRecord.alumniNumber = candidate;
      await userRecord.save();
      return candidate;
    } catch (error) {
      const maybeMongo = error as { code?: number };
      if (maybeMongo.code !== 11000) {
        throw error;
      }
      sequence += 1;
    }
  }

  throw new ApiError(
    500,
    `Unable to allocate alumni number for class year ${classRecord.entryYear}`,
    'InternalServerError',
  );
}

export async function assignAlumniNumberForUserIfClassed(userId: string): Promise<string | null> {
  const membership = await ClassMembershipModel.findOne({ userId }).select('classId').lean<{ classId?: string }>().exec();
  if (!membership?.classId) {
    return null;
  }
  return assignAlumniNumberForClassMembership(userId, membership.classId);
}
