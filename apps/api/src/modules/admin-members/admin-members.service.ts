import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import type {
    AdminMemberDTO,
    BranchMembershipDTO,
    ClassMembershipDTO,
    RoleAssignmentDTO,
    UserDTO,
} from '@gcuoba/types';
import { ProfilesService } from '../profiles/profiles.service';
import { UsersService } from '../users/users.service';
import { MembershipsService } from '../memberships/memberships.service';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';

export type AdminMemberAccessScope =
    | { kind: 'global' }
    | { kind: 'branch'; branchId: string }
    | { kind: 'class'; classId: string }
    | { kind: 'managed'; branchIds: string[]; classIds: string[] };

@Injectable()
export class AdminMembersService {
    constructor(
        private readonly usersService: UsersService,
        private readonly profilesService: ProfilesService,
        private readonly membershipsService: MembershipsService,
        private readonly roleAssignmentsService: RoleAssignmentsService,
    ) {}

    async listMembers(
        scope: AdminMemberAccessScope,
    ): Promise<AdminMemberDTO[]> {
        const [branchMemberships, classMemberships, assignments] =
            await Promise.all([
                this.membershipsService.listAllBranchMemberships(),
                this.membershipsService.listAllClassMemberships(),
                this.roleAssignmentsService.listActiveAssignments(),
            ]);

        const scopedUserIds = this.resolveScopedUserIds(
            scope,
            branchMemberships,
            classMemberships,
        );
        if (scopedUserIds && scopedUserIds.size === 0) {
            return [];
        }
        const users = scopedUserIds
            ? await this.usersService.findManyByIds(Array.from(scopedUserIds))
            : await this.usersService.findAll();

        const profileEntries = await Promise.all(
            users.map(
                async (user) =>
                    [
                        user.id,
                        await this.profilesService.findByUserId(user.id),
                    ] as const,
            ),
        );
        const profileMap = new Map(profileEntries);

        const branchMap = this.groupByUser(branchMemberships);
        const classMap = new Map(
            classMemberships.map((membership) => [
                membership.userId,
                membership,
            ]),
        );
        const assignmentMap = this.groupByUser(assignments);

        return users
            .map((user) =>
                this.applyScopeToMemberPayload(
                    this.buildMemberPayload(
                        user,
                        profileMap,
                        branchMap,
                        classMap,
                        assignmentMap,
                    ),
                    scope,
                ),
            )
            .sort((a, b) => a.user.name.localeCompare(b.user.name));
    }

    async findMember(
        userId: string,
        scope: AdminMemberAccessScope,
    ): Promise<AdminMemberDTO> {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const [profile, branchMemberships, classMembership, assignments] =
            await Promise.all([
                this.profilesService.findByUserId(userId),
                this.membershipsService.listBranchMemberships(userId),
                this.membershipsService.getClassMembership(userId),
                this.roleAssignmentsService.activeAssignmentsForUser(userId),
            ]);

        const payload: AdminMemberDTO = {
            user,
            profile,
            classMembership,
            branchMemberships,
            roleAssignments: assignments,
        };

        if (!this.isMemberInScope(payload, scope)) {
            throw new ForbiddenException('Not authorized for this member');
        }

        return this.applyScopeToMemberPayload(payload, scope);
    }

    async updateStatus(
        userId: string,
        status: 'pending' | 'active' | 'suspended',
        scope: AdminMemberAccessScope,
    ): Promise<UserDTO> {
        await this.ensureMemberInScope(userId, scope);
        return this.usersService.updateStatus(userId, status);
    }

    async changeClass(
        userId: string,
        classId: string,
        scope: AdminMemberAccessScope,
    ): Promise<ClassMembershipDTO> {
        this.ensureClassChangeAllowed(scope, classId);
        await this.ensureMemberInScope(userId, scope);
        return this.membershipsService.updateClassMembership(userId, {
            classId,
        });
    }

    private buildMemberPayload(
        user: UserDTO,
        profileMap: Map<string, null | AdminMemberDTO['profile']>,
        branchMap: Map<string, BranchMembershipDTO[]>,
        classMap: Map<string, ClassMembershipDTO>,
        assignmentMap: Map<string, RoleAssignmentDTO[]>,
    ): AdminMemberDTO {
        return {
            user,
            profile: profileMap.get(user.id) ?? null,
            classMembership: classMap.get(user.id) ?? null,
            branchMemberships: branchMap.get(user.id) ?? [],
            roleAssignments: assignmentMap.get(user.id) ?? [],
        };
    }

    private groupByUser<T extends { userId: string }>(
        items: T[],
    ): Map<string, T[]> {
        const map = new Map<string, T[]>();
        for (const item of items) {
            const list = map.get(item.userId) ?? [];
            list.push(item);
            map.set(item.userId, list);
        }
        return map;
    }

    private resolveScopedUserIds(
        scope: AdminMemberAccessScope,
        branchMemberships: BranchMembershipDTO[],
        classMemberships: ClassMembershipDTO[],
    ): Set<string> | null {
        if (scope.kind === 'global') {
            return null;
        }

        const userIds = new Set<string>();
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

    private async ensureMemberInScope(
        userId: string,
        scope: AdminMemberAccessScope,
    ) {
        if (scope.kind === 'global') {
            return;
        }

        const [classMembership, branchMemberships] = await Promise.all([
            this.membershipsService.getClassMembership(userId),
            this.membershipsService.listBranchMemberships(userId),
        ]);

        const member: AdminMemberDTO = {
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
            throw new ForbiddenException('Not authorized for this member');
        }
    }

    private isMemberInScope(
        member: AdminMemberDTO,
        scope: AdminMemberAccessScope,
    ): boolean {
        if (scope.kind === 'global') {
            return true;
        }
        if (scope.kind === 'class') {
            return member.classMembership?.classId === scope.classId;
        }
        if (scope.kind === 'branch') {
            return member.branchMemberships.some(
                (membership) => membership.branchId === scope.branchId,
            );
        }

        const managedBranchIds = new Set(scope.branchIds);
        const managedClassIds = new Set(scope.classIds);
        const classInScope = managedClassIds.has(
            member.classMembership?.classId ?? '',
        );
        const branchInScope = member.branchMemberships.some((membership) =>
            managedBranchIds.has(membership.branchId),
        );
        return classInScope || branchInScope;
    }

    private applyScopeToMemberPayload(
        member: AdminMemberDTO,
        scope: AdminMemberAccessScope,
    ): AdminMemberDTO {
        if (scope.kind === 'global') {
            return member;
        }

        if (scope.kind === 'branch') {
            return {
                ...member,
                branchMemberships: member.branchMemberships.filter(
                    (membership) => membership.branchId === scope.branchId,
                ),
                roleAssignments: member.roleAssignments.filter(
                    (assignment) =>
                        assignment.scopeType === 'global' ||
                        (assignment.scopeType === 'branch' &&
                            assignment.scopeId === scope.branchId),
                ),
            };
        }

        if (scope.kind === 'class') {
            return {
                ...member,
                classMembership:
                    member.classMembership?.classId === scope.classId
                        ? member.classMembership
                        : null,
                roleAssignments: member.roleAssignments.filter(
                    (assignment) =>
                        assignment.scopeType === 'global' ||
                        (assignment.scopeType === 'class' &&
                            assignment.scopeId === scope.classId),
                ),
            };
        }

        const managedBranchIds = new Set(scope.branchIds);
        const managedClassIds = new Set(scope.classIds);
        return {
            ...member,
            branchMemberships: member.branchMemberships.filter((membership) =>
                managedBranchIds.has(membership.branchId),
            ),
            classMembership: managedClassIds.has(
                member.classMembership?.classId ?? '',
            )
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

    private ensureClassChangeAllowed(
        scope: AdminMemberAccessScope,
        classId: string,
    ) {
        if (scope.kind === 'global') {
            return;
        }
        if (scope.kind === 'branch') {
            throw new ForbiddenException(
                'Class updates require class or global scope',
            );
        }
        if (scope.kind === 'class' && scope.classId !== classId) {
            throw new ForbiddenException(
                'Not authorized to assign outside your class scope',
            );
        }
        if (scope.kind === 'managed' && !scope.classIds.includes(classId)) {
            throw new ForbiddenException(
                'Not authorized to assign outside your class scope',
            );
        }
    }
}
