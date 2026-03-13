import { createHash } from 'node:crypto';
import type { WelfareContributionDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import { recordWelfareContribution } from '@/lib/server/welfare';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ caseId: string }>;
};

type Body = {
  contributorUserId?: string;
  contributorName?: string;
  contributorEmail?: string;
  amount?: number;
  currency?: string;
  notes?: string;
  paymentEvidenceUrl?: string;
  paymentEvidenceName?: string;
  paidAt?: string;
};

const MAX_PAYMENT_EVIDENCE_BYTES = 10 * 1024 * 1024;

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
    folder: (process.env.CLOUDINARY_FOLDER?.trim() || 'gcuoba/welfare-evidence').replace(/^\/+|\/+$/g, ''),
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

async function uploadPaymentEvidenceToCloudinary(filePart: File, caseId: string, actorId: string) {
  const allowedType =
    (filePart.type && filePart.type.startsWith('image/')) ||
    filePart.type === 'application/pdf';
  if (!allowedType) {
    throw new ApiError(400, 'Payment evidence must be an image or PDF file', 'BadRequest');
  }
  if (filePart.size > MAX_PAYMENT_EVIDENCE_BYTES) {
    throw new ApiError(400, 'Payment evidence must be 10MB or less', 'BadRequest');
  }

  const config = ensureCloudinaryConfigured();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const publicId = `welfare-${caseId}-${actorId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  return {
    url: payload.secure_url,
    name: filePart.name || 'payment-evidence',
  };
}

export const POST = (request: Request, context: Context) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);
    const { caseId } = await context.params;
    const contentType = request.headers.get('content-type')?.toLowerCase() || '';
    let body: Body;
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const amountRaw = requiredString(formData.get('amount'));
      const evidencePart = formData.get('paymentEvidence');
      body = {
        contributorUserId: requiredString(formData.get('contributorUserId')) || undefined,
        contributorName: requiredString(formData.get('contributorName')) || undefined,
        contributorEmail: requiredString(formData.get('contributorEmail')) || undefined,
        amount: amountRaw ? Number(amountRaw) : undefined,
        currency: requiredString(formData.get('currency')) || undefined,
        notes: requiredString(formData.get('notes')) || undefined,
        paidAt: requiredString(formData.get('paidAt')) || undefined,
      };
      if (evidencePart instanceof File && evidencePart.size > 0) {
        const uploaded = await uploadPaymentEvidenceToCloudinary(evidencePart, caseId, authUser.sub);
        body.paymentEvidenceUrl = uploaded.url;
        body.paymentEvidenceName = uploaded.name;
      }
    } else {
      body = (await request.json()) as Body;
    }

    const created: WelfareContributionDTO = await recordWelfareContribution(authUser.sub, caseId, body);
    return Response.json(created, { status: 201 });
  });

