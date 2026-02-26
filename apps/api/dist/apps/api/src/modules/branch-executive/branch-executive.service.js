"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchExecutiveService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const branch_schema_1 = require("../branches/schemas/branch.schema");
const branch_membership_schema_1 = require("../memberships/schemas/branch-membership.schema");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
const memberships_service_1 = require("../memberships/memberships.service");
const users_service_1 = require("../users/users.service");
const notifications_service_1 = require("../notifications/notifications.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const role_schema_1 = require("../roles/schemas/role.schema");
const role_assignment_schema_1 = require("../role-assignments/schemas/role-assignment.schema");
let BranchExecutiveService = class BranchExecutiveService {
    roleAssignmentsService;
    membershipsService;
    branchModel;
    branchMembershipModel;
    roleModel;
    roleAssignmentModel;
    usersService;
    notificationsService;
    auditLogsService;
    constructor(roleAssignmentsService, membershipsService, branchModel, branchMembershipModel, roleModel, roleAssignmentModel, usersService, notificationsService, auditLogsService) {
        this.roleAssignmentsService = roleAssignmentsService;
        this.membershipsService = membershipsService;
        this.branchModel = branchModel;
        this.branchMembershipModel = branchMembershipModel;
        this.roleModel = roleModel;
        this.roleAssignmentModel = roleAssignmentModel;
        this.usersService = usersService;
        this.notificationsService = notificationsService;
        this.auditLogsService = auditLogsService;
    }
    async getSummary(userId) {
        const hasGlobalAccess = await this.roleAssignmentsService.hasGlobalAccess(userId);
        const managedBranchIds = hasGlobalAccess
            ? (await this.branchModel
                .find()
                .select('_id')
                .lean()
                .exec()).map((branch) => branch._id.toString())
            : await this.roleAssignmentsService.managedBranchIds(userId);
        if (managedBranchIds.length === 0) {
            return { branches: [], branchRoles: [], branchMembers: [] };
        }
        const [branches, pendingMemberships, approvedMemberships, branchRoles] = await Promise.all([
            this.branchModel
                .find({ _id: { $in: managedBranchIds } })
                .lean()
                .exec(),
            this.branchMembershipModel
                .find({
                branchId: { $in: managedBranchIds },
                status: 'requested',
            })
                .lean()
                .exec(),
            this.branchMembershipModel
                .find({
                branchId: { $in: managedBranchIds },
                status: 'approved',
            })
                .select('userId branchId')
                .lean()
                .exec(),
            this.roleModel
                .find({ scope: 'branch' })
                .select('code name')
                .sort({ name: 1 })
                .lean()
                .exec(),
        ]);
        const memberIds = Array.from(new Set([...pendingMemberships, ...approvedMemberships].map((membership) => membership.userId)));
        const members = await this.usersService.findManyByIds(memberIds);
        const memberMap = new Map();
        members.forEach((member) => {
            memberMap.set(member.id, {
                name: member.name,
                email: member.email,
            });
        });
        const memberBranchMap = new Map();
        approvedMemberships.forEach((membership) => {
            if (!memberBranchMap.has(membership.userId)) {
                memberBranchMap.set(membership.userId, new Set());
            }
            memberBranchMap.get(membership.userId)?.add(membership.branchId);
        });
        const requestsByBranch = new Map();
        pendingMemberships.forEach((membership) => {
            const request = {
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
        const dtoBranches = branches.map((branch) => ({
            id: branch._id.toString(),
            name: branch.name,
            country: branch.country,
            pendingRequests: requestsByBranch.get(branch._id.toString()) ?? [],
        }));
        const dtoRoles = branchRoles.map((role) => ({
            id: role._id.toString(),
            code: role.code,
            name: role.name,
        }));
        const dtoMembers = members
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
    async approveMembership(actorId, membershipId, note) {
        const membership = await this.branchMembershipModel
            .findById(membershipId)
            .exec();
        if (!membership) {
            throw new common_1.ForbiddenException('Membership not found');
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
    async recordHandover(actorId, dto) {
        await this.ensureBranchAccess(actorId, dto.branchId);
        const role = await this.roleModel
            .findOne({ _id: dto.roleId, scope: 'branch' })
            .lean()
            .exec();
        if (!role) {
            throw new common_1.BadRequestException('Selected role is not valid for branch handover');
        }
        const branchMember = await this.branchMembershipModel
            .findOne({
            userId: dto.userId,
            branchId: dto.branchId,
            status: 'approved',
        })
            .select('_id')
            .lean()
            .exec();
        if (!branchMember) {
            throw new common_1.BadRequestException('Selected user is not an approved member of this branch');
        }
        const hasClassMembership = await this.membershipsService.hasClassMembership(dto.userId);
        if (!hasClassMembership) {
            throw new common_1.BadRequestException('Selected user must belong to a class before executive assignment');
        }
        const now = new Date();
        const startDate = dto.startDate ? new Date(dto.startDate) : now;
        const parsedStartDate = Number.isNaN(startDate.getTime())
            ? now
            : startDate;
        const activeFilter = {
            scopeType: 'branch',
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
    async rejectMembership(actorId, membershipId, note) {
        if (!note) {
            throw new common_1.ForbiddenException('Rejection note is required');
        }
        const membership = await this.branchMembershipModel
            .findById(membershipId)
            .exec();
        if (!membership) {
            throw new common_1.ForbiddenException('Membership not found');
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
    async ensureBranchAccess(actorId, branchId) {
        const hasGlobalAccess = await this.roleAssignmentsService.hasGlobalAccess(actorId);
        if (hasGlobalAccess) {
            return;
        }
        const managed = await this.roleAssignmentsService.managedBranchIds(actorId);
        if (!managed.includes(branchId)) {
            throw new common_1.ForbiddenException('Not authorized for this branch');
        }
    }
    toDto(membership) {
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
};
exports.BranchExecutiveService = BranchExecutiveService;
exports.BranchExecutiveService = BranchExecutiveService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, mongoose_1.InjectModel)(branch_schema_1.Branch.name)),
    __param(3, (0, mongoose_1.InjectModel)(branch_membership_schema_1.BranchMembership.name)),
    __param(4, (0, mongoose_1.InjectModel)(role_schema_1.Role.name)),
    __param(5, (0, mongoose_1.InjectModel)(role_assignment_schema_1.RoleAssignment.name)),
    __metadata("design:paramtypes", [role_assignments_service_1.RoleAssignmentsService,
        memberships_service_1.MembershipsService,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        notifications_service_1.NotificationsService,
        audit_logs_service_1.AuditLogsService])
], BranchExecutiveService);
//# sourceMappingURL=branch-executive.service.js.map