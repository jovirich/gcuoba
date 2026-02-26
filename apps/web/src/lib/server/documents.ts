import type { DocumentRecordDTO } from '@gcuoba/types';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
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

  const folder = scopeFolder(normalized.scopeType, normalized.scopeId, actorId);
  const absoluteFolder = path.join(STORAGE_ROOT, folder);
  await mkdir(absoluteFolder, { recursive: true });

  const extension = path.extname(file.originalName).slice(0, 12);
  const storedName = `${Date.now()}-${randomUUID()}${extension}`;
  const relativePath = path.join(folder, storedName);
  const absolutePath = path.join(STORAGE_ROOT, relativePath);
  await writeFile(absolutePath, file.buffer);

  const doc = await DocumentRecordModel.create({
    ownerUserId: actorId,
    scopeType: normalized.scopeType,
    scopeId: normalized.scopeId,
    originalName: file.originalName,
    storedName,
    storagePath: relativePath,
    mimeType: file.mimeType || 'application/octet-stream',
    sizeBytes: file.sizeBytes ?? file.buffer.length,
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

  const absolutePath = path.join(STORAGE_ROOT, doc.storagePath);
  const content = await readFile(absolutePath);
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

  await DocumentRecordModel.deleteOne({ _id: documentId }).exec();
  const absolutePath = path.join(STORAGE_ROOT, doc.storagePath);
  try {
    await unlink(absolutePath);
  } catch {
    // no-op when file already removed
  }

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

