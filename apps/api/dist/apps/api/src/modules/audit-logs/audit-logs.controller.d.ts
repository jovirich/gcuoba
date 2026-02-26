import type { AuditLogDTO } from '@gcuoba/types';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { AuditLogsService } from './audit-logs.service';
export declare class AuditLogsController {
    private readonly auditLogsService;
    constructor(auditLogsService: AuditLogsService);
    list(user: AuthenticatedUser, actorUserId?: string, action?: string, scopeType?: string, scopeId?: string, limit?: string): Promise<AuditLogDTO[]>;
    private parseScopeType;
}
