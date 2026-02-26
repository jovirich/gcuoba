import type { EventDTO } from '@gcuoba/types';
import type { Model } from 'mongoose';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { DashboardEvent } from '../dashboard/schemas/event.schema';
import { MembershipsService } from '../memberships/memberships.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { UsersService } from '../users/users.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
export declare class EventsService {
    private readonly eventModel;
    private readonly roleAssignmentsService;
    private readonly membershipsService;
    private readonly usersService;
    private readonly notificationsService;
    private readonly auditLogsService;
    constructor(eventModel: Model<DashboardEvent>, roleAssignmentsService: RoleAssignmentsService, membershipsService: MembershipsService, usersService: UsersService, notificationsService: NotificationsService, auditLogsService: AuditLogsService);
    findAll(actorId: string, scopeType?: 'global' | 'branch' | 'class', scopeId?: string, status?: 'draft' | 'published' | 'cancelled'): Promise<EventDTO[]>;
    findOne(id: string): Promise<EventDTO>;
    create(actorId: string, dto: CreateEventDto): Promise<EventDTO>;
    update(actorId: string, id: string, dto: UpdateEventDto): Promise<EventDTO>;
    remove(actorId: string, id: string): Promise<{
        success: boolean;
    }>;
    private notifyEventAudience;
    private resolveAudienceUserIds;
    private preparePayload;
    private toDto;
    private buildReadableFilter;
    private ensureWritableScope;
}
