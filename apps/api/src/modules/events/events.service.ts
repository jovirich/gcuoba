import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
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

@Injectable()
export class EventsService {
    constructor(
        @InjectModel(DashboardEvent.name)
        private readonly eventModel: Model<DashboardEvent>,
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
        status?: 'draft' | 'published' | 'cancelled',
    ): Promise<EventDTO[]> {
        const filter = await this.buildReadableFilter(
            actorId,
            scopeType,
            scopeId,
        );
        if (status) {
            filter.status = status;
        }

        const docs = await this.eventModel
            .find(filter)
            .sort({ startAt: 1, createdAt: -1 })
            .exec();

        return docs.map((doc) => this.toDto(doc));
    }

    async findOne(id: string): Promise<EventDTO> {
        const doc = await this.eventModel.findById(id).exec();
        if (!doc) {
            throw new NotFoundException('Event not found');
        }
        return this.toDto(doc);
    }

    async create(actorId: string, dto: CreateEventDto): Promise<EventDTO> {
        await this.ensureWritableScope(
            actorId,
            dto.scopeType,
            dto.scopeType === 'global' ? null : (dto.scopeId ?? null),
        );
        const payload = this.preparePayload(dto);
        const doc = await this.eventModel.create(payload);

        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'event.created',
            resourceType: 'event',
            resourceId: doc._id.toString(),
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            metadata: {
                title: doc.title,
                status: doc.status,
                startAt: doc.startAt?.toISOString() ?? null,
            },
        });

        if (doc.status === 'published') {
            await this.notifyEventAudience(doc, 'published');
        }

        return this.toDto(doc);
    }

    async update(
        actorId: string,
        id: string,
        dto: UpdateEventDto,
    ): Promise<EventDTO> {
        const event = await this.eventModel.findById(id).exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }
        await this.ensureWritableScope(
            actorId,
            event.scopeType,
            event.scopeId ?? null,
        );

        if (dto.scopeType !== undefined || dto.scopeId !== undefined) {
            const nextScopeType = dto.scopeType ?? event.scopeType;
            const nextScopeId =
                nextScopeType === 'global'
                    ? null
                    : dto.scopeId !== undefined
                      ? (dto.scopeId ?? null)
                      : (event.scopeId ?? null);
            await this.ensureWritableScope(actorId, nextScopeType, nextScopeId);
        }

        const previousStatus = event.status;
        const payload = this.preparePayload(dto);
        Object.assign(event, payload);
        await event.save();

        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'event.updated',
            resourceType: 'event',
            resourceId: event._id.toString(),
            scopeType: event.scopeType,
            scopeId: event.scopeId ?? null,
            metadata: {
                title: event.title,
                previousStatus,
                status: event.status,
                startAt: event.startAt?.toISOString() ?? null,
            },
        });

        if (event.status === 'published') {
            await this.notifyEventAudience(
                event,
                previousStatus === 'published' ? 'updated' : 'published',
            );
        } else if (
            event.status === 'cancelled' &&
            previousStatus !== 'cancelled'
        ) {
            await this.notifyEventAudience(event, 'cancelled');
        }

        return this.toDto(event);
    }

    async remove(actorId: string, id: string) {
        const existing = await this.eventModel.findById(id).exec();
        if (!existing) {
            throw new NotFoundException('Event not found');
        }
        await this.ensureWritableScope(
            actorId,
            existing.scopeType,
            existing.scopeId ?? null,
        );
        const deleted = await this.eventModel.findByIdAndDelete(id).exec();
        if (!deleted) {
            throw new NotFoundException('Event not found');
        }

        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'event.deleted',
            resourceType: 'event',
            resourceId: deleted._id.toString(),
            scopeType: deleted.scopeType,
            scopeId: deleted.scopeId ?? null,
            metadata: {
                title: deleted.title,
                status: deleted.status,
            },
        });

        if (deleted.status === 'published') {
            await this.notifyEventAudience(deleted, 'cancelled');
        }

        return { success: true };
    }

    private async notifyEventAudience(
        event: DashboardEvent,
        action: 'published' | 'updated' | 'cancelled',
    ) {
        const audience = await this.resolveAudienceUserIds(
            event.scopeType,
            event.scopeId ?? null,
        );
        if (audience.length === 0) {
            return;
        }

        const verb =
            action === 'published'
                ? 'published'
                : action === 'updated'
                  ? 'updated'
                  : 'cancelled';

        await this.notificationsService.createForUsers(audience, {
            title: `Event ${verb}: ${event.title}`,
            message:
                action === 'cancelled'
                    ? `The event "${event.title}" has been cancelled.`
                    : `The event "${event.title}" has been ${verb}.`,
            type: action === 'cancelled' ? 'warning' : 'info',
            metadata: {
                eventId: event._id.toString(),
                scopeType: event.scopeType,
                scopeId: event.scopeId ?? null,
                status: event.status,
                startAt: event.startAt?.toISOString() ?? null,
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
        dto: CreateEventDto | UpdateEventDto,
    ): Partial<DashboardEvent> {
        const payload: Partial<DashboardEvent> = {};
        if (dto.title !== undefined) {
            payload.title = dto.title;
        }
        if (dto.description !== undefined) {
            payload.description = dto.description;
        }
        if (dto.scopeType !== undefined) {
            payload.scopeType = dto.scopeType;
            payload.scopeId =
                dto.scopeType === 'global' ? null : (dto.scopeId ?? null);
        } else if (dto.scopeId !== undefined) {
            payload.scopeId = dto.scopeId ?? null;
        }
        if (dto.location !== undefined) {
            payload.location = dto.location;
        }
        if (dto.startAt !== undefined) {
            payload.startAt = dto.startAt ? new Date(dto.startAt) : undefined;
        }
        if (dto.endAt !== undefined) {
            payload.endAt = dto.endAt ? new Date(dto.endAt) : undefined;
        }
        if (dto.status !== undefined) {
            payload.status = dto.status;
        }
        return payload;
    }

    private toDto(doc: DashboardEvent): EventDTO {
        return {
            id: doc._id.toString(),
            title: doc.title,
            description: doc.description ?? undefined,
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? undefined,
            location: doc.location ?? undefined,
            startAt: doc.startAt?.toISOString(),
            endAt: doc.endAt?.toISOString(),
            status: doc.status,
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
