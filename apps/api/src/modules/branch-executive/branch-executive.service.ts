import {
    BadRequestException,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
    BranchExecutiveBranchDTO,
    BranchExecutiveMemberOptionDTO,
    BranchExecutiveRoleOptionDTO,
    BranchExecutiveSummaryDTO,
    BranchMembershipDTO,
} from '@gcuoba/types';
import { Model, Types } from 'mongoose';
import { Branch } from '../branches/schemas/branch.schema';
import { BranchMembership } from '../memberships/schemas/branch-membership.schema';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { MembershipsService } from '../memberships/memberships.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../roles/schemas/role.schema';
import { RoleAssignment } from '../role-assignments/schemas/role-assignment.schema';
import { RecordHandoverDto } from './dto/record-handover.dto';

@Injectable()
export class BranchExecutiveService {
    constructor(
        private readonly roleAssignmentsService: RoleAssignmentsService,
        private readonly membershipsService: MembershipsService,
        @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
        @InjectModel(BranchMembership.name)
        private readonly branchMembershipModel: Model<BranchMembership>,
        @InjectModel(Role.name)
        private readonly roleModel: Model<Role>,
        @InjectModel(RoleAssignment.name)
        private readonly roleAssignmentModel: Model<RoleAssignment>,
        private readonly usersService: UsersService,
        private readonly notificationsService: NotificationsService,
        private readonly auditLogsService: AuditLogsService,
    ) {}

    async getSummary(userId: string): Promise<BranchExecutiveSummaryDTO> {
        const hasGlobalAccess =
            await this.roleAssignmentsService.hasGlobalAccess(userId);
        const managedBranchIds = hasGlobalAccess
            ? (
                  await this.branchModel
                      .find()
                      .select('_id')
                      .lean<Array<{ _id: Types.ObjectId }>>()
                      .exec()
              ).map((branch) => branch._id.toString())
            : await this.roleAssignmentsService.managedBranchIds(userId);
        if (managedBranchIds.length === 0) {
            return { branches: [], branchRoles: [], branchMembers: [] };
        }

        const [branches, pendingMemberships, approvedMemberships, branchRoles] =
            await Promise.all([
                this.branchModel
                    .find({ _id: { $in: managedBranchIds } })
                    .lean<Branch[]>()
                    .exec(),
                this.branchMembershipModel
                    .find({
                        branchId: { $in: managedBranchIds },
                        status: 'requested',
                    })
                    .lean<BranchMembership[]>()
                    .exec(),
                this.branchMembershipModel
                    .find({
                        branchId: { $in: managedBranchIds },
                        status: 'approved',
                    })
                    .select('userId branchId')
                    .lean<BranchMembership[]>()
                    .exec(),
                this.roleModel
                    .find({ scope: 'branch' })
                    .select('code name')
                    .sort({ name: 1 })
                    .lean<Role[]>()
                    .exec(),
            ]);

        const memberIds = Array.from(
            new Set(
                [...pendingMemberships, ...approvedMemberships].map(
                    (membership) => membership.userId,
                ),
            ),
        );
        const members = await this.usersService.findManyByIds(memberIds);

        const memberMap = new Map<string, { name: string; email: string }>();
        members.forEach((member) => {
            memberMap.set(member.id, {
                name: member.name,
                email: member.email,
            });
        });
        const memberBranchMap = new Map<string, Set<string>>();
        approvedMemberships.forEach((membership) => {
            if (!memberBranchMap.has(membership.userId)) {
                memberBranchMap.set(membership.userId, new Set());
            }
            memberBranchMap.get(membership.userId)?.add(membership.branchId);
        });

        const requestsByBranch = new Map<string, BranchMembershipDTO[]>();
        pendingMemberships.forEach((membership) => {
            const request: BranchMembershipDTO = {
                id: membership._id.toString(),
                userId: membership.userId,
                branchId: membership.branchId,
                status: membership.status,
                requestedAt: membership.requestedAt?.toISOString(),
                approvedBy: membership.approvedBy ?? null,
                approvedAt: membership.approvedAt?.toISOString() ?? null,
                endedAt: membership.endedAt?.toISOString() ?? null,
                note: membership.note ?? null,
                memberName: memberMap.get(membership.userId)?.name,
                memberEmail: memberMap.get(membership.userId)?.email,
            };

            const current = requestsByBranch.get(membership.branchId) ?? [];
            current.push(request);
            requestsByBranch.set(membership.branchId, current);
        });

        const dtoBranches: BranchExecutiveBranchDTO[] = branches.map(
            (branch) => ({
                id: branch._id.toString(),
                name: branch.name,
                country: branch.country,
                pendingRequests:
                    requestsByBranch.get(branch._id.toString()) ?? [],
            }),
        );

        const dtoRoles: BranchExecutiveRoleOptionDTO[] = branchRoles.map(
            (role) => ({
                id: role._id.toString(),
                code: role.code,
                name: role.name,
            }),
        );

        const dtoMembers: BranchExecutiveMemberOptionDTO[] = members
            .filter((member) => memberBranchMap.has(member.id))
            .map((member) => ({
                id: member.id,
                name: member.name,
                email: member.email,
                branchIds: Array.from(memberBranchMap.get(member.id) ?? []),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return {
            branches: dtoBranches,
            branchRoles: dtoRoles,
            branchMembers: dtoMembers,
        };
    }

    async approveMembership(
        actorId: string,
        membershipId: string,
        note?: string,
    ): Promise<BranchMembershipDTO> {
        const membership = await this.branchMembershipModel
            .findById(membershipId)
            .exec();
        if (!membership) {
            throw new ForbiddenException('Membership not found');
        }

        await this.ensureBranchAccess(actorId, membership.branchId);

        membership.status = 'approved';
        membership.approvedAt = new Date();
        membership.approvedBy = actorId;
        membership.note = note ?? membership.note;

        await membership.save();
        const branch = await this.branchModel
            .findById(membership.branchId)
            .exec();
        await this.notificationsService.createForUser(membership.userId, {
            title: 'Branch membership approved',
            message: `Your membership request for ${branch?.name ?? 'the selected branch'} was approved.`,
            type: 'success',
            metadata: {
                membershipId: membership._id.toString(),
                branchId: membership.branchId,
                approvedBy: actorId,
            },
        });
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'branch_membership.approved',
            resourceType: 'branch_membership',
            resourceId: membership._id.toString(),
            scopeType: 'branch',
            scopeId: membership.branchId,
            metadata: {
                targetUserId: membership.userId,
                note: note ?? null,
            },
        });

        return this.toDto(membership);
    }

    async recordHandover(
        actorId: string,
        dto: RecordHandoverDto,
    ): Promise<void> {
        await this.ensureBranchAccess(actorId, dto.branchId);

        const role = await this.roleModel
            .findOne({ _id: dto.roleId, scope: 'branch' })
            .lean<Role>()
            .exec();
        if (!role) {
            throw new BadRequestException(
                'Selected role is not valid for branch handover',
            );
        }

        const branchMember = await this.branchMembershipModel
            .findOne({
                userId: dto.userId,
                branchId: dto.branchId,
                status: 'approved',
            })
            .select('_id')
            .lean<{ _id: Types.ObjectId }>()
            .exec();

        if (!branchMember) {
            throw new BadRequestException(
                'Selected user is not an approved member of this branch',
            );
        }
        const hasClassMembership =
            await this.membershipsService.hasClassMembership(dto.userId);
        if (!hasClassMembership) {
            throw new BadRequestException(
                'Selected user must belong to a class before executive assignment',
            );
        }

        const now = new Date();
        const startDate = dto.startDate ? new Date(dto.startDate) : now;
        const parsedStartDate = Number.isNaN(startDate.getTime())
            ? now
            : startDate;

        const activeFilter = {
            scopeType: 'branch' as const,
            scopeId: dto.branchId,
            roleCode: role.code,
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        };

        const { modifiedCount } = await this.roleAssignmentModel
            .updateMany(activeFilter, { $set: { endDate: now } })
            .exec();

        await this.roleAssignmentModel.create({
            userId: dto.userId,
            roleId: role._id,
            roleCode: role.code,
            scopeType: 'branch',
            scopeId: dto.branchId,
            startDate: parsedStartDate,
            endDate: null,
        });

        await this.notificationsService.createForUser(dto.userId, {
            title: 'Branch executive assignment updated',
            message: `You have been assigned as ${role.name}.`,
            type: 'info',
            metadata: {
                roleCode: role.code,
                branchId: dto.branchId,
                assignedBy: actorId,
                startDate: parsedStartDate.toISOString(),
            },
        });

        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'branch_executive.handover_recorded',
            resourceType: 'role_assignment',
            resourceId: `${dto.branchId}:${role.code}:${dto.userId}`,
            scopeType: 'branch',
            scopeId: dto.branchId,
            metadata: {
                roleId: role._id.toString(),
                roleCode: role.code,
                assignedUserId: dto.userId,
                replacedAssignments: modifiedCount,
                startDate: parsedStartDate.toISOString(),
            },
        });
    }

    async rejectMembership(
        actorId: string,
        membershipId: string,
        note: string,
    ): Promise<BranchMembershipDTO> {
        if (!note) {
            throw new ForbiddenException('Rejection note is required');
        }
        const membership = await this.branchMembershipModel
            .findById(membershipId)
            .exec();
        if (!membership) {
            throw new ForbiddenException('Membership not found');
        }

        await this.ensureBranchAccess(actorId, membership.branchId);

        membership.status = 'rejected';
        membership.approvedAt = new Date();
        membership.approvedBy = actorId;
        membership.note = note;

        await membership.save();
        const branch = await this.branchModel
            .findById(membership.branchId)
            .exec();
        await this.notificationsService.createForUser(membership.userId, {
            title: 'Branch membership request rejected',
            message: `Your membership request for ${branch?.name ?? 'the selected branch'} was rejected.`,
            type: 'warning',
            metadata: {
                membershipId: membership._id.toString(),
                branchId: membership.branchId,
                rejectedBy: actorId,
                note,
            },
        });
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'branch_membership.rejected',
            resourceType: 'branch_membership',
            resourceId: membership._id.toString(),
            scopeType: 'branch',
            scopeId: membership.branchId,
            metadata: {
                targetUserId: membership.userId,
                note,
            },
        });

        return this.toDto(membership);
    }

    private async ensureBranchAccess(
        actorId: string,
        branchId: string,
    ): Promise<void> {
        const hasGlobalAccess =
            await this.roleAssignmentsService.hasGlobalAccess(actorId);
        if (hasGlobalAccess) {
            return;
        }

        const managed =
            await this.roleAssignmentsService.managedBranchIds(actorId);
        if (!managed.includes(branchId)) {
            throw new ForbiddenException('Not authorized for this branch');
        }
    }

    private toDto(membership: BranchMembership): BranchMembershipDTO {
        return {
            id: membership._id.toString(),
            userId: membership.userId,
            branchId: membership.branchId,
            status: membership.status,
            requestedAt: membership.requestedAt?.toISOString(),
            approvedBy: membership.approvedBy ?? null,
            approvedAt: membership.approvedAt?.toISOString() ?? null,
            endedAt: membership.endedAt?.toISOString() ?? null,
            note: membership.note ?? null,
        };
    }
}
