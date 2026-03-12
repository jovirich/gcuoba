import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { toUserDto } from '@/lib/server/dto-mappers';
import { createNotificationForUser, runNotificationEmailWorkerOnce } from '@/lib/server/notifications';
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
  dobDay?: number;
  dobMonth?: number;
  dobYear?: number;
  classId?: string;
  branchId?: string;
  houseId?: string;
  note?: string;
  photoUrl?: string;
};

const TITLES = new Set(['mr', 'mrs', 'ms', 'chief', 'dr', 'prof']);
const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

function requiredString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cloudinaryConfig() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim() || '';
  let urlCloudName = '';
  let urlApiKey = '';
  let urlApiSecret = '';
  if (cloudinaryUrl) {
    try {
      const parsed = new URL(cloudinaryUrl);
      if (parsed.protocol === 'cloudinary:') {
        urlCloudName = parsed.hostname;
        urlApiKey = decodeURIComponent(parsed.username);
        urlApiSecret = decodeURIComponent(parsed.password);
      }
    } catch {
      // Ignore malformed CLOUDINARY_URL and rely on discrete env vars.
    }
  }
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || urlCloudName,
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() || urlApiKey,
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || urlApiSecret,
    folder: (process.env.CLOUDINARY_FOLDER?.trim() || 'gcuoba/profile-photos').replace(/^\/+|\/+$/g, ''),
  };
}

function ensureCloudinaryConfigured() {
  const config = cloudinaryConfig();
  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    throw new ApiError(
      500,
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      'ServerConfigurationError',
    );
  }
  return config;
}

function cloudinarySignature(params: Record<string, string>, apiSecret: string): string {
  const base = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1')
    .update(`${base}${apiSecret}`)
    .digest('hex');
}

async function uploadProfilePhotoToCloudinary(filePart: File): Promise<string> {
  if (!filePart.type || !filePart.type.startsWith('image/')) {
    throw new ApiError(400, 'Profile picture must be an image file', 'BadRequest');
  }
  if (filePart.size > MAX_PROFILE_PHOTO_BYTES) {
    throw new ApiError(400, 'Profile picture must be 5MB or less', 'BadRequest');
  }

  const config = ensureCloudinaryConfigured();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const publicId = `register-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const signature = cloudinarySignature(
    {
      folder: config.folder,
      public_id: publicId,
      timestamp,
    },
    config.apiSecret,
  );

  const form = new FormData();
  form.append('file', filePart);
  form.append('api_key', config.apiKey);
  form.append('timestamp', timestamp);
  form.append('folder', config.folder);
  form.append('public_id', publicId);
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`, {
    method: 'POST',
    body: form,
  });
  const payload = (await response.json().catch(() => null)) as
    | { secure_url?: string; error?: { message?: string } }
    | null;
  if (!response.ok || !payload?.secure_url) {
    const reason = payload?.error?.message || response.statusText || 'Upload failed';
    throw new ApiError(502, `Cloudinary upload failed: ${reason}`, 'BadGateway');
  }
  return payload.secure_url;
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

    const contentType = request.headers.get('content-type')?.toLowerCase() || '';
    let title = '';
    let firstName = '';
    let middleName = '';
    let lastName = '';
    let phone = '';
    let email = '';
    let password = '';
    let dobDay = Number.NaN;
    let dobMonth = Number.NaN;
    let dobYear: number | null = null;
    let classId = '';
    let branchId = '';
    let houseId = '';
    let note = '';
    let photoUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = requiredString(formData.get('title')).toLowerCase();
      firstName = requiredString(formData.get('firstName'));
      middleName = requiredString(formData.get('middleName'));
      lastName = requiredString(formData.get('lastName'));
      phone = requiredString(formData.get('phone'));
      email = requiredString(formData.get('email')).toLowerCase();
      password = requiredString(formData.get('password'));
      dobDay = Number(requiredString(formData.get('dobDay')));
      dobMonth = Number(requiredString(formData.get('dobMonth')));
      const dobYearRaw = requiredString(formData.get('dobYear'));
      dobYear = dobYearRaw ? Number(dobYearRaw) : null;
      classId = requiredString(formData.get('classId'));
      branchId = requiredString(formData.get('branchId'));
      houseId = requiredString(formData.get('houseId'));
      note = requiredString(formData.get('note'));
      const photoPart = formData.get('photo');
      if (photoPart instanceof File && photoPart.size > 0) {
        photoUrl = await uploadProfilePhotoToCloudinary(photoPart);
      }
    } else {
      const body = (await request.json()) as RegisterBody;
      title = requiredString(body.title).toLowerCase();
      firstName = requiredString(body.firstName);
      middleName = requiredString(body.middleName);
      lastName = requiredString(body.lastName);
      phone = requiredString(body.phone);
      email = requiredString(body.email).toLowerCase();
      password = typeof body.password === 'string' ? body.password : '';
      dobDay = Number(body.dobDay);
      dobMonth = Number(body.dobMonth);
      dobYear = body.dobYear === undefined || body.dobYear === null ? null : Number(body.dobYear);
      classId = requiredString(body.classId);
      branchId = requiredString(body.branchId);
      houseId = requiredString(body.houseId);
      note = requiredString(body.note);
      photoUrl = requiredString(body.photoUrl);
    }

    if (!TITLES.has(title)) {
      throw new ApiError(400, 'Invalid title', 'BadRequest');
    }
    if (!firstName || !lastName || !phone || !email || !classId || !branchId || !houseId) {
      throw new ApiError(400, 'Missing required fields', 'BadRequest');
    }
    if (!Number.isInteger(dobDay) || dobDay < 1 || dobDay > 31) {
      throw new ApiError(400, 'Birth day must be between 1 and 31', 'BadRequest');
    }
    if (!Number.isInteger(dobMonth) || dobMonth < 1 || dobMonth > 12) {
      throw new ApiError(400, 'Birth month must be between 1 and 12', 'BadRequest');
    }
    if (dobYear !== null && (!Number.isInteger(dobYear) || dobYear < 1900 || dobYear > 2100)) {
      throw new ApiError(400, 'Birth year must be between 1900 and 2100', 'BadRequest');
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
          dobDay,
          dobMonth,
          dobYear,
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

    try {
      await createNotificationForUser(userId, {
        title: 'Welcome to GCUOBA Portal',
        message:
          'Your membership registration has been received. Class and branch administrators will review your request shortly.',
        type: 'success',
        metadata: { flow: 'registration_welcome' },
      });
      void runNotificationEmailWorkerOnce();
    } catch {
      // Do not block registration when outbound email/notification delivery fails.
    }

    const user = toUserDto(userDoc);
    const token = signAccessToken(user);
    return Response.json({ user, token }, { status: 201 });
  });
