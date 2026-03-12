import { createHash } from 'node:crypto';
import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { toProfileDto } from '@/lib/server/dto-mappers';
import { ClassMembershipModel, ProfileModel, UserModel } from '@/lib/server/models';
import { ensureSelfAccess, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ userId: string }>;
};

type ProfileUpdateBody = {
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dobDay?: number;
  dobMonth?: number;
  dobYear?: number;
  sex?: string;
  stateOfOrigin?: string;
  lgaOfOrigin?: string;
  resHouseNo?: string;
  resStreet?: string;
  resArea?: string;
  resCity?: string;
  resCountry?: string;
  occupation?: string;
  photoUrl?: string;
  houseId?: string;
  privacyLevel?: 'public' | 'public_to_members' | 'private';
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
  const publicId = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

function normalizeName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return { firstName: '', middleName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: parts[0] };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1] };
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

export const GET = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { userId } = await context.params;
    const authUser = await requireAuthTokenUser(request);
    ensureSelfAccess(authUser, userId, 'Cannot access another profile');

    const profile = await ProfileModel.findOne({ userId }).exec();
    return Response.json(profile ? toProfileDto(profile) : null);
  });

export const PUT = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const { userId } = await context.params;
    const authUser = await requireAuthTokenUser(request);
    ensureSelfAccess(authUser, userId, 'Cannot access another profile');

    const contentType = request.headers.get('content-type')?.toLowerCase() || '';
    let title = '';
    let firstName = '';
    let middleName = '';
    let lastName = '';
    let dobDay: number | null = null;
    let dobMonth: number | null = null;
    let dobYear: number | null = null;
    let sex = '';
    let stateOfOrigin = '';
    let lgaOfOrigin = '';
    let resHouseNo = '';
    let resStreet = '';
    let resArea = '';
    let resCity = '';
    let resCountry = '';
    let occupation = '';
    let photoUrl = '';
    let houseId = '';
    let privacyLevel: 'public' | 'public_to_members' | 'private' = 'public_to_members';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = requiredString(formData.get('title')).toLowerCase();
      firstName = requiredString(formData.get('firstName'));
      middleName = requiredString(formData.get('middleName'));
      lastName = requiredString(formData.get('lastName'));
      const dobDayRaw = requiredString(formData.get('dobDay'));
      const dobMonthRaw = requiredString(formData.get('dobMonth'));
      const dobYearRaw = requiredString(formData.get('dobYear'));
      dobDay = dobDayRaw ? Number(dobDayRaw) : null;
      dobMonth = dobMonthRaw ? Number(dobMonthRaw) : null;
      dobYear = dobYearRaw ? Number(dobYearRaw) : null;
      sex = requiredString(formData.get('sex'));
      stateOfOrigin = requiredString(formData.get('stateOfOrigin'));
      lgaOfOrigin = requiredString(formData.get('lgaOfOrigin'));
      resHouseNo = requiredString(formData.get('resHouseNo'));
      resStreet = requiredString(formData.get('resStreet'));
      resArea = requiredString(formData.get('resArea'));
      resCity = requiredString(formData.get('resCity'));
      resCountry = requiredString(formData.get('resCountry'));
      occupation = requiredString(formData.get('occupation'));
      photoUrl = requiredString(formData.get('photoUrl'));
      houseId = requiredString(formData.get('houseId'));
      const privacyRaw = requiredString(formData.get('privacyLevel'));
      if (privacyRaw === 'public' || privacyRaw === 'public_to_members' || privacyRaw === 'private') {
        privacyLevel = privacyRaw;
      }
      const photoPart = formData.get('photo');
      if (photoPart instanceof File && photoPart.size > 0) {
        photoUrl = await uploadProfilePhotoToCloudinary(photoPart);
      }
    } else {
      const body = (await request.json()) as ProfileUpdateBody;
      title = requiredString(body.title).toLowerCase();
      firstName = requiredString(body.firstName);
      middleName = requiredString(body.middleName);
      lastName = requiredString(body.lastName);
      dobDay = body.dobDay ?? null;
      dobMonth = body.dobMonth ?? null;
      dobYear = body.dobYear ?? null;
      sex = requiredString(body.sex);
      stateOfOrigin = requiredString(body.stateOfOrigin);
      lgaOfOrigin = requiredString(body.lgaOfOrigin);
      resHouseNo = requiredString(body.resHouseNo);
      resStreet = requiredString(body.resStreet);
      resArea = requiredString(body.resArea);
      resCity = requiredString(body.resCity);
      resCountry = requiredString(body.resCountry);
      occupation = requiredString(body.occupation);
      photoUrl = requiredString(body.photoUrl);
      houseId = requiredString(body.houseId);
      if (body.privacyLevel === 'public' || body.privacyLevel === 'public_to_members' || body.privacyLevel === 'private') {
        privacyLevel = body.privacyLevel;
      }
    }

    if (title && !TITLES.has(title)) {
      throw new ApiError(400, 'Invalid title', 'BadRequest');
    }
    if (dobDay !== null && (!Number.isInteger(dobDay) || dobDay < 1 || dobDay > 31)) {
      throw new ApiError(400, 'Birth day must be between 1 and 31', 'BadRequest');
    }
    if (dobMonth !== null && (!Number.isInteger(dobMonth) || dobMonth < 1 || dobMonth > 12)) {
      throw new ApiError(400, 'Birth month must be between 1 and 12', 'BadRequest');
    }
    if (dobYear !== null && (!Number.isInteger(dobYear) || dobYear < 1900 || dobYear > 2100)) {
      throw new ApiError(400, 'Birth year must be between 1900 and 2100', 'BadRequest');
    }

    const normalizedFirstName = firstName.trim();
    const normalizedMiddleName = middleName.trim() || null;
    const normalizedLastName = lastName.trim();
    if (!normalizedFirstName || !normalizedLastName) {
      throw new ApiError(400, 'First and last name are required', 'BadRequest');
    }

    const [existingProfile, user, classMembership] = await Promise.all([
      ProfileModel.findOne({ userId }).exec(),
      UserModel.findById(userId).exec(),
      ClassMembershipModel.findOne({ userId }).exec(),
    ]);

    if (!user) {
      throw new ApiError(404, 'User not found', 'NotFound');
    }

    const claimStatus = user.claimStatus ?? 'claimed';
    const nameLocked =
      claimStatus === 'claimed' &&
      user.status !== 'pending' &&
      Boolean(classMembership?.classId);
    if (nameLocked) {
      const fallbackName = splitDisplayName(user.name);
      const lockedFirstName = existingProfile?.firstName ?? fallbackName.firstName;
      const lockedMiddleName = existingProfile?.middleName ?? fallbackName.middleName;
      const lockedLastName = existingProfile?.lastName ?? fallbackName.lastName;

      const attemptingNameUpdate =
        normalizeName(normalizedFirstName) !== normalizeName(lockedFirstName) ||
        normalizeName(normalizedMiddleName) !== normalizeName(lockedMiddleName) ||
        normalizeName(normalizedLastName) !== normalizeName(lockedLastName);

      if (attemptingNameUpdate) {
        throw new ApiError(
          403,
          'Name updates are locked after class approval. Contact an administrator to update your name.',
          'Forbidden',
        );
      }
    }

    const profile = await ProfileModel.findOneAndUpdate(
      { userId },
      {
        userId,
        title: title || null,
        firstName: normalizedFirstName,
        middleName: normalizedMiddleName,
        lastName: normalizedLastName,
        dobDay,
        dobMonth,
        dobYear,
        sex: sex || null,
        stateOfOrigin: stateOfOrigin || null,
        lgaOfOrigin: lgaOfOrigin || null,
        resHouseNo: resHouseNo || null,
        resStreet: resStreet || null,
        resArea: resArea || null,
        resCity: resCity || null,
        resCountry: resCountry || null,
        occupation: occupation || null,
        photoUrl: photoUrl || null,
        houseId: houseId || null,
        privacyLevel,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();

    if (!profile) {
      throw new ApiError(500, 'Unable to persist profile', 'InternalServerError');
    }

    if (!nameLocked) {
      const displayName = [normalizedFirstName, normalizedMiddleName, normalizedLastName]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (displayName && user.name !== displayName) {
        user.name = displayName;
        await user.save();
      }
    }

    return Response.json(toProfileDto(profile));
  });
