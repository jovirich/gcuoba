import type { AuditLogDTO } from '@gcuoba/types';
import { ApiError } from './api-error';
import { hasGlobalAccess, managedBranchIds, managedClassIds } from './authorization';
import { toAuditLogDto } from './dto-mappers';
import { AuditLogModel } from './models';

export type AuditScopeType = 'global' | 'branch' | 'class' | 'private';

type RecordAuditLogInput = {
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  scopeType?: AuditScopeType | null;
  scopeId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ListAuditLogFilters = {
  actorUserId?: string;
  action?: string;
  scopeType?: AuditScopeType;
  scopeId?: string;
  limit?: number;
};

export async function recordAuditLog(input: RecordAuditLogInput): Promise<AuditLogDTO> {
  const doc = await AuditLogModel.create({
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    scopeType: input.scopeType ?? null,
    scopeId: input.scopeId ?? null,
    metadata: input.metadata ?? null,
  });
  return toAuditLogDto(doc);
}

export async function listAuditLogsForActor(
  actorId: string,
  filters: ListAuditLogFilters,
): Promise<AuditLogDTO[]> {
  const query: Record<string, unknown> = {};
  const global = await hasGlobalAccess(actorId);

  if (filters.scopeType === 'global' && !global) {
    throw new ApiError(403, 'Not authorized for global audit logs', 'Forbidden');
  }

  if (filters.scopeType === 'branch') {
    if (!filters.scopeId) {
      throw new ApiError(400, 'scopeId is required for branch scope', 'BadRequest');
    }
    if (!global) {
      const managed = await managedBranchIds(actorId);
      if (!managed.includes(filters.scopeId)) {
        throw new ApiError(403, 'Not authorized for this branch scope', 'Forbidden');
      }
    }
    query.scopeType = 'branch';
    query.scopeId = filters.scopeId;
  } else if (filters.scopeType === 'class') {
    if (!filters.scopeId) {
      throw new ApiError(400, 'scopeId is required for class scope', 'BadRequest');
    }
    if (!global) {
      const managed = await managedClassIds(actorId);
      if (!managed.includes(filters.scopeId)) {
        throw new ApiError(403, 'Not authorized for this class scope', 'Forbidden');
      }
    }
    query.scopeType = 'class';
    query.scopeId = filters.scopeId;
  } else if (filters.scopeType === 'global') {
    query.scopeType = 'global';
  } else if (filters.scopeType === 'private') {
    query.scopeType = 'private';
  }

  if (filters.action) {
    query.action = filters.action;
  }

  if (global) {
    if (filters.actorUserId) {
      query.actorUserId = filters.actorUserId;
    }
  } else {
    if (filters.actorUserId && filters.actorUserId !== actorId) {
      throw new ApiError(403, 'Not authorized to inspect another user audit logs', 'Forbidden');
    }
    query.actorUserId = actorId;
  }

  const safeLimit = Math.max(1, Math.min(filters.limit ?? 100, 300));
  const docs = await AuditLogModel.find(query).sort({ createdAt: -1 }).limit(safeLimit).exec();
  return docs.map((doc) => toAuditLogDto(doc));
}

