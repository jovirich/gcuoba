import {
    BadRequestException,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
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

@Injectable()
export class AuditLogsService {
    constructor(
        @InjectModel(AuditLog.name)
        private readonly auditLogModel: Model<AuditLog>,
        private readonly roleAssignmentsService: RoleAssignmentsService,
    ) {}

    async record(input: RecordAuditLogInput): Promise<AuditLogDTO> {
        const doc = await this.auditLogModel.create({
            actorUserId: input.actorUserId,
            action: input.action,
            resourceType: input.resourceType,
            resourceId: input.resourceId ?? null,
            scopeType: input.scopeType ?? null,
            scopeId: input.scopeId ?? null,
            metadata: input.metadata ?? null,
        });
        return this.toDto(doc);
    }

    async listForActor(
        actorId: string,
        filters: ListAuditLogFilters,
    ): Promise<AuditLogDTO[]> {
        const query: Record<string, unknown> = {};
        const hasGlobalAccess =
            await this.roleAssignmentsService.hasGlobalAccess(actorId);

        if (filters.scopeType === 'global' && !hasGlobalAccess) {
            throw new ForbiddenException(
                'Not authorized for global audit logs',
            );
        }

        if (filters.scopeType === 'branch') {
            if (!filters.scopeId) {
                throw new BadRequestException(
                    'scopeId is required for branch scope',
                );
            }
            if (!hasGlobalAccess) {
                const managed =
                    await this.roleAssignmentsService.managedBranchIds(actorId);
                if (!managed.includes(filters.scopeId)) {
                    throw new ForbiddenException(
                        'Not authorized for this branch scope',
                    );
                }
            }
            query.scopeType = 'branch';
            query.scopeId = filters.scopeId;
        } else if (filters.scopeType === 'class') {
            if (!filters.scopeId) {
                throw new BadRequestException(
                    'scopeId is required for class scope',
                );
            }
            if (!hasGlobalAccess) {
                const managed =
                    await this.roleAssignmentsService.managedClassIds(actorId);
                if (!managed.includes(filters.scopeId)) {
                    throw new ForbiddenException(
                        'Not authorized for this class scope',
                    );
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

        if (hasGlobalAccess) {
            if (filters.actorUserId) {
                query.actorUserId = filters.actorUserId;
            }
        } else {
            if (filters.actorUserId && filters.actorUserId !== actorId) {
                throw new ForbiddenException(
                    'Not authorized to inspect another user audit logs',
                );
            }
            query.actorUserId = actorId;
        }

        const safeLimit = Math.max(1, Math.min(filters.limit ?? 100, 300));
        const docs = await this.auditLogModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(safeLimit)
            .exec();

        return docs.map((doc) => this.toDto(doc));
    }

    private toDto(doc: AuditLog): AuditLogDTO {
        const createdAt = (
            doc as AuditLog & { createdAt?: Date }
        ).createdAt?.toISOString();

        return {
            id: doc._id.toString(),
            actorUserId: doc.actorUserId,
            action: doc.action,
            resourceType: doc.resourceType,
            resourceId: doc.resourceId ?? null,
            scopeType: doc.scopeType ?? null,
            scopeId: doc.scopeId ?? null,
            metadata: doc.metadata ?? null,
            createdAt: createdAt ?? new Date().toISOString(),
        };
    }
}
