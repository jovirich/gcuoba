import type { AnnouncementDTO } from '@gcuoba/types';
import type { Model } from 'mongoose';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Announcement } from '../dashboard/schemas/announcement.schema';
import { MembershipsService } from '../memberships/memberships.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { UsersService } from '../users/users.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
export declare class AnnouncementsService {
    private readonly announcementModel;
    private readonly roleAssignmentsService;
    private readonly membershipsService;
    private readonly usersService;
    private readonly notificationsService;
    private readonly auditLogsService;
    constructor(announcementModel: Model<Announcement>, roleAssignmentsService: RoleAssignmentsService, membershipsService: MembershipsService, usersService: UsersService, notificationsService: NotificationsService, auditLogsService: AuditLogsService);
    findAll(actorId: string, scopeType?: 'global' | 'branch' | 'class', scopeId?: string, status?: 'draft' | 'published'): Promise<AnnouncementDTO[]>;
    findOne(id: string): Promise<AnnouncementDTO>;
    create(actorId: string, dto: CreateAnnouncementDto): Promise<AnnouncementDTO>;
    update(actorId: string, id: string, dto: UpdateAnnouncementDto): Promise<AnnouncementDTO>;
    remove(actorId: string, id: string): Promise<{
        success: boolean;
    }>;
    private notifyAudience;
    private resolveAudienceUserIds;
    private preparePayload;
    private toDto;
    private buildReadableFilter;
    private ensureWritableScope;
}
