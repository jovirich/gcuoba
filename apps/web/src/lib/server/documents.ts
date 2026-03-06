import type { DocumentRecordDTO } from '@gcuoba/types';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Types } from 'mongoose';
import { ApiError } from './api-error';
import { hasGlobalAccess, managedBranchIds, managedClassIds } from './authorization';
import { recordAuditLog } from './audit-logs';
import { toDocumentRecordDto } from './dto-mappers';
import {
  BranchMembershipModel,
  BranchModel,
  ClassMembershipModel,
  ClassModel,
  DocumentRecordModel,
  type DocumentRecordDoc,
} from './models';

type ScopeType = 'private' | 'global' | 'branch' | 'class';
type Visibility = 'private' | 'scope' | 'public';

type UploadInput = {
  originalName: string;
  mimeType?: string;
  sizeBytes?: number;
  buffer: Buffer;
};

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'documents');
const CLOUDINARY_PREFIX = 'cloudinary:';

type CloudinaryAssetRef = {
  resourceType: string;
  publicId: string;
};

function resolveVisibility(scopeType: ScopeType, visibility?: Visibility) {
  const resolved = visibility ?? (scopeType === 'private' ? 'private' : 'scope');
  if (scopeType === 'private' && resolved !== 'private') {
    throw new ApiError(400, 'Private scope documents must have private visibility', 'BadRequest');
  }
  return resolved;
}

function scopeFolder(scopeType: ScopeType, scopeId: string | null, actorId: string) {
  if (scopeType === 'private') {
    return path.join('private', actorId);
  }
  if (scopeType === 'global') {
    return 'global';
  }
  if (!scopeId) {
    throw new ApiError(400, 'scopeId is required', 'BadRequest');
  }
  return path.join(scopeType, scopeId);
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
    folder: (process.env.CLOUDINARY_FOLDER?.trim() || 'gcuoba/documents').replace(/^\/+|\/+$/g, ''),
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

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

function parseCloudinaryRef(storedName: string): CloudinaryAssetRef | null {
  if (!storedName.startsWith(CLOUDINARY_PREFIX)) {
    return null;
  }
  const payload = storedName.slice(CLOUDINARY_PREFIX.length);
  const [resourceType, ...publicParts] = payload.split(':');
  if (!resourceType || publicParts.length === 0) {
    return null;
  }
  const publicId = publicParts.join(':');
  return { resourceType, publicId };
}

async function uploadToCloudinary(
  actorId: string,
  file: UploadInput,
  scopeType: ScopeType,
  scopeId: string | null,
): Promise<{ storedName: string; storagePath: string; mimeType: string; sizeBytes: number }> {
  const config = ensureCloudinaryConfigured();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const scopeSegment = scopeFolder(scopeType, scopeId, actorId).replace(/\\/g, '/');
  const nameBase = path.basename(file.originalName, path.extname(file.originalName));
  const publicId = `${scopeSegment}/${Date.now()}-${sanitizePathPart(nameBase || 'document')}-${randomUUID().slice(0, 8)}`;
  const signature = cloudinarySignature(
    {
      folder: config.folder,
      public_id: publicId,
      timestamp,
    },
    config.apiSecret,
  );

  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(file.buffer)], { type: file.mimeType || 'application/octet-stream' }),
    file.originalName,
  );
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
    | { secure_url?: string; bytes?: number; resource_type?: string; public_id?: string; format?: string; error?: { message?: string } }
    | null;
  if (!response.ok || !payload?.secure_url || !payload.public_id || !payload.resource_type) {
    const reason = payload?.error?.message || response.statusText || 'Upload failed';
    throw new ApiError(502, `Cloudinary upload failed: ${reason}`, 'BadGateway');
  }

  return {
    storedName: `${CLOUDINARY_PREFIX}${payload.resource_type}:${payload.public_id}`,
    storagePath: payload.secure_url,
    mimeType: file.mimeType || 'application/octet-stream',
    sizeBytes: payload.bytes ?? file.sizeBytes ?? file.buffer.length,
  };
}

async function destroyCloudinaryAsset(asset: CloudinaryAssetRef): Promise<void> {
  const config = ensureCloudinaryConfigured();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = cloudinarySignature(
    {
      public_id: asset.publicId,
      timestamp,
    },
    config.apiSecret,
  );

  const form = new FormData();
  form.append('api_key', config.apiKey);
  form.append('timestamp', timestamp);
  form.append('public_id', asset.publicId);
  form.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${asset.resourceType}/destroy`,
    {
      method: 'POST',
      body: form,
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | { result?: string; error?: { message?: string } }
    | null;
  if (!response.ok) {
    const reason = payload?.error?.message || response.statusText || 'Delete failed';
    throw new ApiError(502, `Cloudinary delete failed: ${reason}`, 'BadGateway');
  }
  if (payload?.result && payload.result !== 'ok' && payload.result !== 'not found') {
    throw new ApiError(502, `Cloudinary delete failed: ${payload.result}`, 'BadGateway');
  }
}

async function ensureScopeExists(scopeType: 'branch' | 'class', scopeId: string) {
  if (scopeType === 'branch') {
    const exists = await BranchModel.exists({ _id: scopeId });
    if (!exists) {
      throw new ApiError(400, 'Branch scope not found', 'BadRequest');
    }
    return;
  }

  const exists = await ClassModel.exists({ _id: scopeId });
  if (!exists) {
    throw new ApiError(400, 'Class scope not found', 'BadRequest');
  }
}

async function hasScopeAccess(actorId: string, scopeType: 'branch' | 'class', scopeId: string): Promise<boolean> {
  const global = await hasGlobalAccess(actorId);
  if (global) {
    return true;
  }

  if (scopeType === 'branch') {
    const [managedIds, membership] = await Promise.all([
      managedBranchIds(actorId),
      BranchMembershipModel.exists({
        userId: actorId,
        branchId: scopeId,
        status: 'approved',
      }),
    ]);
    return managedIds.includes(scopeId) || Boolean(membership);
  }

  const [managedIds, classMembership] = await Promise.all([
    managedClassIds(actorId),
    ClassMembershipModel.findOne({ userId: actorId }).select('classId').lean<{ classId?: string }>().exec(),
  ]);
  return managedIds.includes(scopeId) || classMembership?.classId === scopeId;
}

async function normalizeScope(actorId: string, scopeType: ScopeType, scopeId?: string | null) {
  if (scopeType === 'private') {
    return { scopeType, scopeId: null };
  }

  if (scopeType === 'global') {
    const global = await hasGlobalAccess(actorId);
    if (!global) {
      throw new ApiError(403, 'Not authorized for global scope', 'Forbidden');
    }
    return { scopeType, scopeId: null };
  }

  const scopedId = scopeId?.trim();
  if (!scopedId) {
    throw new ApiError(400, `scopeId is required for ${scopeType} scope`, 'BadRequest');
  }

  await ensureScopeExists(scopeType, scopedId);
  const access = await hasScopeAccess(actorId, scopeType, scopedId);
  if (!access) {
    throw new ApiError(403, 'Not authorized for this scope', 'Forbidden');
  }
  return { scopeType, scopeId: scopedId };
}

async function ensureCanRead(actorId: string, doc: DocumentRecordDoc) {
  if (doc.ownerUserId === actorId) {
    return;
  }
  if (doc.visibility === 'public') {
    return;
  }
  if (doc.visibility === 'private' || doc.scopeType === 'private') {
    throw new ApiError(403, 'Not authorized to view this document', 'Forbidden');
  }

  if (doc.scopeType === 'global') {
    if (!(await hasGlobalAccess(actorId))) {
      throw new ApiError(403, 'Not authorized for this global document', 'Forbidden');
    }
    return;
  }

  const scopeId = doc.scopeId ?? '';
  const access = await hasScopeAccess(actorId, doc.scopeType, scopeId);
  if (!access) {
    throw new ApiError(403, 'Not authorized to view this document', 'Forbidden');
  }
}

async function ensureCanDelete(actorId: string, doc: DocumentRecordDoc) {
  if (doc.ownerUserId === actorId) {
    return;
  }
  if (await hasGlobalAccess(actorId)) {
    return;
  }

  if (doc.scopeType === 'branch' || doc.scopeType === 'class') {
    const scopeId = doc.scopeId ?? '';
    if (scopeId && (await hasScopeAccess(actorId, doc.scopeType, scopeId))) {
      return;
    }
  }

  throw new ApiError(403, 'Not authorized to delete document', 'Forbidden');
}

export async function uploadDocument(
  actorId: string,
  file: UploadInput,
  payload: {
    scopeType: ScopeType;
    scopeId?: string;
    visibility?: Visibility;
  },
): Promise<DocumentRecordDTO> {
  if (!file.buffer || !file.originalName) {
    throw new ApiError(400, 'File is required', 'BadRequest');
  }

  const normalized = await normalizeScope(actorId, payload.scopeType, payload.scopeId);
  const visibility = resolveVisibility(payload.scopeType, payload.visibility);

  const uploaded = await uploadToCloudinary(actorId, file, normalized.scopeType, normalized.scopeId);

  const doc = await DocumentRecordModel.create({
    ownerUserId: actorId,
    scopeType: normalized.scopeType,
    scopeId: normalized.scopeId,
    originalName: file.originalName,
    storedName: uploaded.storedName,
    storagePath: uploaded.storagePath,
    mimeType: uploaded.mimeType,
    sizeBytes: uploaded.sizeBytes,
    visibility,
  });

  await recordAuditLog({
    actorUserId: actorId,
    action: 'document.uploaded',
    resourceType: 'document',
    resourceId: doc._id.toString(),
    scopeType: normalized.scopeType,
    scopeId: normalized.scopeId,
    metadata: {
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      visibility: doc.visibility,
    },
  });

  return toDocumentRecordDto(doc);
}

export async function listMyDocuments(actorId: string): Promise<DocumentRecordDTO[]> {
  const docs = await DocumentRecordModel.find({ ownerUserId: actorId }).sort({ createdAt: -1 }).exec();
  return docs.map((doc) => toDocumentRecordDto(doc));
}

export async function listScopeDocuments(
  actorId: string,
  scopeType: 'global' | 'branch' | 'class',
  scopeId?: string,
): Promise<DocumentRecordDTO[]> {
  const normalized = await normalizeScope(actorId, scopeType, scopeId);
  const query: Record<string, unknown> = {
    scopeType: normalized.scopeType,
    scopeId: normalized.scopeId,
    $or: [{ visibility: { $in: ['scope', 'public'] } }, { ownerUserId: actorId }],
  };

  const docs = await DocumentRecordModel.find(query).sort({ createdAt: -1 }).exec();
  return docs.map((doc) => toDocumentRecordDto(doc));
}

export async function downloadDocument(actorId: string, documentId: string) {
  if (!Types.ObjectId.isValid(documentId)) {
    throw new ApiError(404, 'Document not found', 'NotFound');
  }

  const doc = await DocumentRecordModel.findById(documentId).exec();
  if (!doc) {
    throw new ApiError(404, 'Document not found', 'NotFound');
  }
  await ensureCanRead(actorId, doc);

  let content: Buffer;
  const cloudAsset = parseCloudinaryRef(doc.storedName);
  if (cloudAsset) {
    const response = await fetch(doc.storagePath);
    if (!response.ok) {
      throw new ApiError(502, 'Unable to download file from Cloudinary', 'BadGateway');
    }
    content = Buffer.from(await response.arrayBuffer());
  } else {
    const absolutePath = path.join(STORAGE_ROOT, doc.storagePath);
    content = await readFile(absolutePath);
  }
  await recordAuditLog({
    actorUserId: actorId,
    action: 'document.downloaded',
    resourceType: 'document',
    resourceId: doc._id.toString(),
    scopeType: doc.scopeType,
    scopeId: doc.scopeId ?? null,
    metadata: {
      ownerUserId: doc.ownerUserId,
    },
  });

  return {
    filename: doc.originalName,
    mimeType: doc.mimeType || 'application/octet-stream',
    content,
  };
}

export async function deleteDocument(actorId: string, documentId: string): Promise<{ deleted: boolean }> {
  if (!Types.ObjectId.isValid(documentId)) {
    throw new ApiError(404, 'Document not found', 'NotFound');
  }

  const doc = await DocumentRecordModel.findById(documentId).exec();
  if (!doc) {
    throw new ApiError(404, 'Document not found', 'NotFound');
  }
  await ensureCanDelete(actorId, doc);

  const cloudAsset = parseCloudinaryRef(doc.storedName);
  if (cloudAsset) {
    await destroyCloudinaryAsset(cloudAsset);
  } else {
    const absolutePath = path.join(STORAGE_ROOT, doc.storagePath);
    try {
      await unlink(absolutePath);
    } catch {
      // no-op when file already removed
    }
  }
  await DocumentRecordModel.deleteOne({ _id: documentId }).exec();

  await recordAuditLog({
    actorUserId: actorId,
    action: 'document.deleted',
    resourceType: 'document',
    resourceId: doc._id.toString(),
    scopeType: doc.scopeType,
    scopeId: doc.scopeId ?? null,
    metadata: {
      originalName: doc.originalName,
      ownerUserId: doc.ownerUserId,
    },
  });

  return { deleted: true };
}

