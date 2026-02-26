import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import type { AuditLogDTO } from '@gcuoba/types';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RequireActive } from '../../auth/require-active.decorator';
import { AuditLogsService } from './audit-logs.service';

type ScopeType = 'global' | 'branch' | 'class' | 'private';

@Controller('audit-logs')
@RequireActive()
export class AuditLogsController {
    constructor(private readonly auditLogsService: AuditLogsService) {}

    @Get()
    list(
        @CurrentUser() user: AuthenticatedUser,
        @Query('actorUserId') actorUserId?: string,
        @Query('action') action?: string,
        @Query('scopeType') scopeType?: string,
        @Query('scopeId') scopeId?: string,
        @Query('limit') limit?: string,
    ): Promise<AuditLogDTO[]> {
        const parsedLimit = limit ? Number(limit) : undefined;
        if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
            throw new BadRequestException('Invalid limit');
        }

        return this.auditLogsService.listForActor(user.id, {
            actorUserId,
            action,
            scopeType: this.parseScopeType(scopeType),
            scopeId,
            limit: parsedLimit,
        });
    }

    private parseScopeType(scopeType?: string): ScopeType | undefined {
        if (!scopeType) {
            return undefined;
        }
        if (
            scopeType === 'global' ||
            scopeType === 'branch' ||
            scopeType === 'class' ||
            scopeType === 'private'
        ) {
            return scopeType;
        }
        throw new BadRequestException('Invalid scopeType');
    }
}
