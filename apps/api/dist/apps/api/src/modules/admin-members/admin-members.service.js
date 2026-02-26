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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminMembersService = void 0;
const common_1 = require("@nestjs/common");
const profiles_service_1 = require("../profiles/profiles.service");
const users_service_1 = require("../users/users.service");
const memberships_service_1 = require("../memberships/memberships.service");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
let AdminMembersService = class AdminMembersService {
    usersService;
    profilesService;
    membershipsService;
    roleAssignmentsService;
    constructor(usersService, profilesService, membershipsService, roleAssignmentsService) {
        this.usersService = usersService;
        this.profilesService = profilesService;
        this.membershipsService = membershipsService;
        this.roleAssignmentsService = roleAssignmentsService;
    }
    async listMembers(scope) {
        const [branchMemberships, classMemberships, assignments] = await Promise.all([
            this.membershipsService.listAllBranchMemberships(),
            this.membershipsService.listAllClassMemberships(),
            this.roleAssignmentsService.listActiveAssignments(),
        ]);
        const scopedUserIds = this.resolveScopedUserIds(scope, branchMemberships, classMemberships);
        if (scopedUserIds && scopedUserIds.size === 0) {
            return [];
        }
        const users = scopedUserIds
            ? await this.usersService.findManyByIds(Array.from(scopedUserIds))
            : await this.usersService.findAll();
        const profileEntries = await Promise.all(users.map(async (user) => [
            user.id,
            await this.profilesService.findByUserId(user.id),
        ]));
        const profileMap = new Map(profileEntries);
        const branchMap = this.groupByUser(branchMemberships);
        const classMap = new Map(classMemberships.map((membership) => [
            membership.userId,
            membership,
        ]));
        const assignmentMap = this.groupByUser(assignments);
        return users
            .map((user) => this.applyScopeToMemberPayload(this.buildMemberPayload(user, profileMap, branchMap, classMap, assignmentMap), scope))
            .sort((a, b) => a.user.name.localeCompare(b.user.name));
    }
    async findMember(userId, scope) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const [profile, branchMemberships, classMembership, assignments] = await Promise.all([
            this.profilesService.findByUserId(userId),
            this.membershipsService.listBranchMemberships(userId),
            this.membershipsService.getClassMembership(userId),
            this.roleAssignmentsService.activeAssignmentsForUser(userId),
        ]);
        const payload = {
            user,
            profile,
            classMembership,
            branchMemberships,
            roleAssignments: assignments,
        };
        if (!this.isMemberInScope(payload, scope)) {
            throw new common_1.ForbiddenException('Not authorized for this member');
        }
        return this.applyScopeToMemberPayload(payload, scope);
    }
    async updateStatus(userId, status, scope) {
        await this.ensureMemberInScope(userId, scope);
        return this.usersService.updateStatus(userId, status);
    }
    async changeClass(userId, classId, scope) {
        this.ensureClassChangeAllowed(scope, classId);
        await this.ensureMemberInScope(userId, scope);
        return this.membershipsService.updateClassMembership(userId, {
            classId,
        });
    }
    buildMemberPayload(user, profileMap, branchMap, classMap, assignmentMap) {
        return {
            user,
            profile: profileMap.get(user.id) ?? null,
            classMembership: classMap.get(user.id) ?? null,
            branchMemberships: branchMap.get(user.id) ?? [],
            roleAssignments: assignmentMap.get(user.id) ?? [],
        };
    }
    groupByUser(items) {
        const map = new Map();
        for (const item of items) {
            const list = map.get(item.userId) ?? [];
            list.push(item);
            map.set(item.userId, list);
        }
        return map;
    }
    resolveScopedUserIds(scope, branchMemberships, classMemberships) {
        if (scope.kind === 'global') {
            return null;
        }
        const userIds = new Set();
        if (scope.kind === 'branch') {
            branchMemberships
                .filter((membership) => membership.branchId === scope.branchId)
                .forEach((membership) => userIds.add(membership.userId));
            return userIds;
        }
        if (scope.kind === 'class') {
            classMemberships
                .filter((membership) => membership.classId === scope.classId)
                .forEach((membership) => userIds.add(membership.userId));
            return userIds;
        }
        const managedBranchIds = new Set(scope.branchIds);
        const managedClassIds = new Set(scope.classIds);
        branchMemberships
            .filter((membership) => managedBranchIds.has(membership.branchId))
            .forEach((membership) => userIds.add(membership.userId));
        classMemberships
            .filter((membership) => managedClassIds.has(membership.classId))
            .forEach((membership) => userIds.add(membership.userId));
        return userIds;
    }
    async ensureMemberInScope(userId, scope) {
        if (scope.kind === 'global') {
            return;
        }
        const [classMembership, branchMemberships] = await Promise.all([
            this.membershipsService.getClassMembership(userId),
            this.membershipsService.listBranchMemberships(userId),
        ]);
        const member = {
            user: {
                id: userId,
                name: '',
                email: '',
                phone: null,
                status: 'active',
            },
            profile: null,
            classMembership,
            branchMemberships,
            roleAssignments: [],
        };
        if (!this.isMemberInScope(member, scope)) {
            throw new common_1.ForbiddenException('Not authorized for this member');
        }
    }
    isMemberInScope(member, scope) {
        if (scope.kind === 'global') {
            return true;
        }
        if (scope.kind === 'class') {
            return member.classMembership?.classId === scope.classId;
        }
        if (scope.kind === 'branch') {
            return member.branchMemberships.some((membership) => membership.branchId === scope.branchId);
        }
        const managedBranchIds = new Set(scope.branchIds);
        const managedClassIds = new Set(scope.classIds);
        const classInScope = managedClassIds.has(member.classMembership?.classId ?? '');
        const branchInScope = member.branchMemberships.some((membership) => managedBranchIds.has(membership.branchId));
        return classInScope || branchInScope;
    }
    applyScopeToMemberPayload(member, scope) {
        if (scope.kind === 'global') {
            return member;
        }
        if (scope.kind === 'branch') {
            return {
                ...member,
                branchMemberships: member.branchMemberships.filter((membership) => membership.branchId === scope.branchId),
                roleAssignments: member.roleAssignments.filter((assignment) => assignment.scopeType === 'global' ||
                    (assignment.scopeType === 'branch' &&
                        assignment.scopeId === scope.branchId)),
            };
        }
        if (scope.kind === 'class') {
            return {
                ...member,
                classMembership: member.classMembership?.classId === scope.classId
                    ? member.classMembership
                    : null,
                roleAssignments: member.roleAssignments.filter((assignment) => assignment.scopeType === 'global' ||
                    (assignment.scopeType === 'class' &&
                        assignment.scopeId === scope.classId)),
            };
        }
        const managedBranchIds = new Set(scope.branchIds);
        const managedClassIds = new Set(scope.classIds);
        return {
            ...member,
            branchMemberships: member.branchMemberships.filter((membership) => managedBranchIds.has(membership.branchId)),
            classMembership: managedClassIds.has(member.classMembership?.classId ?? '')
                ? member.classMembership
                : null,
            roleAssignments: member.roleAssignments.filter((assignment) => {
                if (assignment.scopeType === 'global') {
                    return true;
                }
                if (assignment.scopeType === 'branch') {
                    return managedBranchIds.has(assignment.scopeId ?? '');
                }
                if (assignment.scopeType === 'class') {
                    return managedClassIds.has(assignment.scopeId ?? '');
                }
                return false;
            }),
        };
    }
    ensureClassChangeAllowed(scope, classId) {
        if (scope.kind === 'global') {
            return;
        }
        if (scope.kind === 'branch') {
            throw new common_1.ForbiddenException('Class updates require class or global scope');
        }
        if (scope.kind === 'class' && scope.classId !== classId) {
            throw new common_1.ForbiddenException('Not authorized to assign outside your class scope');
        }
        if (scope.kind === 'managed' && !scope.classIds.includes(classId)) {
            throw new common_1.ForbiddenException('Not authorized to assign outside your class scope');
        }
    }
};
exports.AdminMembersService = AdminMembersService;
exports.AdminMembersService = AdminMembersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        profiles_service_1.ProfilesService,
        memberships_service_1.MembershipsService,
        role_assignments_service_1.RoleAssignmentsService])
], AdminMembersService);
//# sourceMappingURL=admin-members.service.js.map