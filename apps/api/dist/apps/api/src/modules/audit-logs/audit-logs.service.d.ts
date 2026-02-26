import type { AuditLogDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { AuditLog } from './schemas/audit-log.schema';
type ScopeType = 'global' | 'branch' | 'class' | 'private';
type RecordAuditLogInput = {
    actorUserId: string;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    scopeType?: ScopeType | null;
    scopeId?: string | null;
    metadata?: Record<string, unknown> | null;
};
type ListAuditLogFilters = {
    actorUserId?: string;
    action?: string;
    scopeType?: ScopeType;
    scopeId?: string;
    limit?: number;
};
export declare class AuditLogsService {
    private readonly auditLogModel;
    private readonly roleAssignmentsService;
    constructor(auditLogModel: Model<AuditLog>, roleAssignmentsService: RoleAssignmentsService);
    record(input: RecordAuditLogInput): Promise<AuditLogDTO>;
    listForActor(actorId: string, filters: ListAuditLogFilters): Promise<AuditLogDTO[]>;
    private toDto;
}
export {};
