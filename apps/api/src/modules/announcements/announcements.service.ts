import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
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

@Injectable()
export class AnnouncementsService {
    constructor(
        @InjectModel(Announcement.name)
        private readonly announcementModel: Model<Announcement>,
        private readonly roleAssignmentsService: RoleAssignmentsService,
        private readonly membershipsService: MembershipsService,
        private readonly usersService: UsersService,
        private readonly notificationsService: NotificationsService,
        private readonly auditLogsService: AuditLogsService,
    ) {}

    async findAll(
        actorId: string,
        scopeType?: 'global' | 'branch' | 'class',
        scopeId?: string,
        status?: 'draft' | 'published',
    ): Promise<AnnouncementDTO[]> {
        const filter = await this.buildReadableFilter(
            actorId,
            scopeType,
            scopeId,
        );
        if (status) {
            filter.status = status;
        }

        const docs = await this.announcementModel
            .find(filter)
            .sort({ publishedAt: -1, createdAt: -1 })
            .exec();

        return docs.map((doc) => this.toDto(doc));
    }

    async findOne(id: string): Promise<AnnouncementDTO> {
        const doc = await this.announcementModel.findById(id).exec();
        if (!doc) {
            throw new NotFoundException('Announcement not found');
        }

        return this.toDto(doc);
    }

    async create(
        actorId: string,
        dto: CreateAnnouncementDto,
    ): Promise<AnnouncementDTO> {
        await this.ensureWritableScope(
            actorId,
            dto.scopeType,
            dto.scopeType === 'global' ? null : (dto.scopeId ?? null),
        );
        const payload = this.preparePayload(dto);
        const doc = await this.announcementModel.create(payload);

        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'announcement.created',
            resourceType: 'announcement',
            resourceId: doc._id.toString(),
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            metadata: {
                title: doc.title,
                status: doc.status,
                publishedAt: doc.publishedAt?.toISOString() ?? null,
            },
        });

        if (doc.status === 'published') {
            await this.notifyAudience(doc, 'published');
        }

        return this.toDto(doc);
    }

    async update(
        actorId: string,
        id: string,
        dto: UpdateAnnouncementDto,
    ): Promise<AnnouncementDTO> {
        const announcement = await this.announcementModel.findById(id).exec();
        if (!announcement) {
            throw new NotFoundException('Announcement not found');
        }
        await this.ensureWritableScope(
            actorId,
            announcement.scopeType,
            announcement.scopeId ?? null,
        );

        if (dto.scopeType !== undefined || dto.scopeId !== undefined) {
            const nextScopeType = dto.scopeType ?? announcement.scopeType;
            const nextScopeId =
                nextScopeType === 'global'
                    ? null
                    : dto.scopeId !== undefined
                      ? (dto.scopeId ?? null)
                      : (announcement.scopeId ?? null);
            await this.ensureWritableScope(actorId, nextScopeType, nextScopeId);
        }

        const previousStatus = announcement.status;
        const payload = this.preparePayload(dto);
        Object.assign(announcement, payload);
        await announcement.save();

        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'announcement.updated',
            resourceType: 'announcement',
            resourceId: announcement._id.toString(),
            scopeType: announcement.scopeType,
            scopeId: announcement.scopeId ?? null,
            metadata: {
                title: announcement.title,
                previousStatus,
                status: announcement.status,
                publishedAt: announcement.publishedAt?.toISOString() ?? null,
            },
        });

        if (announcement.status === 'published') {
            await this.notifyAudience(
                announcement,
                previousStatus === 'published' ? 'updated' : 'published',
            );
        }

        return this.toDto(announcement);
    }

    async remove(actorId: string, id: string) {
        const existing = await this.announcementModel.findById(id).exec();
        if (!existing) {
            throw new NotFoundException('Announcement not found');
        }
        await this.ensureWritableScope(
            actorId,
            existing.scopeType,
            existing.scopeId ?? null,
        );
        const deleted = await this.announcementModel
            .findByIdAndDelete(id)
            .exec();
        if (!deleted) {
            throw new NotFoundException('Announcement not found');
        }

        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'announcement.deleted',
            resourceType: 'announcement',
            resourceId: deleted._id.toString(),
            scopeType: deleted.scopeType,
            scopeId: deleted.scopeId ?? null,
            metadata: {
                title: deleted.title,
                status: deleted.status,
            },
        });

        if (deleted.status === 'published') {
            await this.notifyAudience(deleted, 'deleted');
        }

        return { success: true };
    }

    private async notifyAudience(
        announcement: Announcement,
        action: 'published' | 'updated' | 'deleted',
    ) {
        const audience = await this.resolveAudienceUserIds(
            announcement.scopeType,
            announcement.scopeId ?? null,
        );
        if (audience.length === 0) {
            return;
        }

        const verb =
            action === 'published'
                ? 'published'
                : action === 'updated'
                  ? 'updated'
                  : 'removed';

        await this.notificationsService.createForUsers(audience, {
            title: `Announcement ${verb}: ${announcement.title}`,
            message:
                action === 'deleted'
                    ? `The announcement "${announcement.title}" has been removed.`
                    : `The announcement "${announcement.title}" has been ${verb}.`,
            type: action === 'deleted' ? 'warning' : 'info',
            metadata: {
                announcementId: announcement._id.toString(),
                scopeType: announcement.scopeType,
                scopeId: announcement.scopeId ?? null,
                status: announcement.status,
                publishedAt: announcement.publishedAt?.toISOString() ?? null,
            },
        });
    }

    private async resolveAudienceUserIds(
        scopeType: 'global' | 'branch' | 'class',
        scopeId: string | null,
    ): Promise<string[]> {
        const activeUserIds = await this.usersService.listActiveUserIds();
        const activeSet = new Set(activeUserIds);

        if (scopeType === 'global') {
            return activeUserIds;
        }
        if (!scopeId) {
            return [];
        }

        if (scopeType === 'branch') {
            const branchUsers =
                await this.membershipsService.listApprovedUserIdsByBranch(
                    scopeId,
                );
            return branchUsers.filter((userId) => activeSet.has(userId));
        }

        const classUsers =
            await this.membershipsService.listUserIdsByClass(scopeId);
        return classUsers.filter((userId) => activeSet.has(userId));
    }

    private preparePayload(
        dto: CreateAnnouncementDto | UpdateAnnouncementDto,
    ): Partial<Announcement> {
        const payload: Partial<Announcement> = {};

        if (dto.title !== undefined) {
            payload.title = dto.title;
        }
        if (dto.body !== undefined) {
            payload.body = dto.body;
        }
        if (dto.scopeType !== undefined) {
            payload.scopeType = dto.scopeType;
            payload.scopeId =
                dto.scopeType === 'global' ? null : (dto.scopeId ?? null);
        } else if (dto.scopeId !== undefined) {
            payload.scopeId = dto.scopeId ?? null;
        }
        if (dto.status !== undefined) {
            payload.status = dto.status;
        }
        if (dto.status === 'published') {
            payload.publishedAt = dto.publishedAt
                ? new Date(dto.publishedAt)
                : new Date();
        } else if (dto.publishedAt !== undefined) {
            payload.publishedAt = dto.publishedAt
                ? new Date(dto.publishedAt)
                : undefined;
        }

        return payload;
    }

    private toDto(doc: Announcement): AnnouncementDTO {
        return {
            id: doc._id.toString(),
            title: doc.title,
            body: doc.body,
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? undefined,
            publishedAt: doc.publishedAt?.toISOString(),
            status: doc.status ?? 'draft',
        };
    }

    private async buildReadableFilter(
        actorId: string,
        scopeType?: 'global' | 'branch' | 'class',
        scopeId?: string,
    ): Promise<Record<string, unknown>> {
        const hasGlobalAccess =
            await this.roleAssignmentsService.hasGlobalAccess(actorId);
        if (hasGlobalAccess) {
            if (!scopeType) {
                return {};
            }
            return scopeType === 'global'
                ? { scopeType: 'global' }
                : { scopeType, ...(scopeId ? { scopeId } : {}) };
        }

        const [
            managedBranchIds,
            managedClassIds,
            branchMemberships,
            classMembership,
        ] = await Promise.all([
            this.roleAssignmentsService.managedBranchIds(actorId),
            this.roleAssignmentsService.managedClassIds(actorId),
            this.membershipsService.listBranchMemberships(actorId),
            this.membershipsService.getClassMembership(actorId),
        ]);

        const readableBranches = new Set(managedBranchIds);
        branchMemberships
            .filter((membership) => membership.status === 'approved')
            .forEach((membership) => readableBranches.add(membership.branchId));
        const readableClasses = new Set(managedClassIds);
        if (classMembership?.classId) {
            readableClasses.add(classMembership.classId);
        }

        if (scopeType === 'global') {
            return { scopeType: 'global' };
        }
        if (scopeType === 'branch') {
            if (!scopeId) {
                throw new BadRequestException(
                    'scopeId is required for branch scope',
                );
            }
            if (!readableBranches.has(scopeId)) {
                throw new ForbiddenException(
                    'Not authorized for this branch scope',
                );
            }
            return { scopeType: 'branch', scopeId };
        }
        if (scopeType === 'class') {
            if (!scopeId) {
                throw new BadRequestException(
                    'scopeId is required for class scope',
                );
            }
            if (!readableClasses.has(scopeId)) {
                throw new ForbiddenException(
                    'Not authorized for this class scope',
                );
            }
            return { scopeType: 'class', scopeId };
        }

        const filterScopes: Array<Record<string, unknown>> = [
            { scopeType: 'global' },
        ];
        if (readableBranches.size > 0) {
            filterScopes.push({
                scopeType: 'branch',
                scopeId: { $in: Array.from(readableBranches) },
            });
        }
        if (readableClasses.size > 0) {
            filterScopes.push({
                scopeType: 'class',
                scopeId: { $in: Array.from(readableClasses) },
            });
        }

        return { $or: filterScopes };
    }

    private async ensureWritableScope(
        actorId: string,
        scopeType: 'global' | 'branch' | 'class',
        scopeId: string | null,
    ) {
        const hasGlobalAccess =
            await this.roleAssignmentsService.hasGlobalAccess(actorId);
        if (hasGlobalAccess) {
            return;
        }

        if (scopeType === 'global') {
            throw new ForbiddenException('Not authorized for global scope');
        }
        if (!scopeId) {
            throw new BadRequestException('scopeId is required');
        }

        if (scopeType === 'branch') {
            const managedBranches =
                await this.roleAssignmentsService.managedBranchIds(actorId);
            if (!managedBranches.includes(scopeId)) {
                throw new ForbiddenException(
                    'Not authorized for this branch scope',
                );
            }
            return;
        }

        const managedClasses =
            await this.roleAssignmentsService.managedClassIds(actorId);
        if (!managedClasses.includes(scopeId)) {
            throw new ForbiddenException('Not authorized for this class scope');
        }
    }
}
