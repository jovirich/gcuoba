import type { AdminMemberDTO, ClassMembershipDTO, UserDTO } from '@gcuoba/types';
import { ProfilesService } from '../profiles/profiles.service';
import { UsersService } from '../users/users.service';
import { MembershipsService } from '../memberships/memberships.service';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
export type AdminMemberAccessScope = {
    kind: 'global';
} | {
    kind: 'branch';
    branchId: string;
} | {
    kind: 'class';
    classId: string;
} | {
    kind: 'managed';
    branchIds: string[];
    classIds: string[];
};
export declare class AdminMembersService {
    private readonly usersService;
    private readonly profilesService;
    private readonly membershipsService;
    private readonly roleAssignmentsService;
    constructor(usersService: UsersService, profilesService: ProfilesService, membershipsService: MembershipsService, roleAssignmentsService: RoleAssignmentsService);
    listMembers(scope: AdminMemberAccessScope): Promise<AdminMemberDTO[]>;
    findMember(userId: string, scope: AdminMemberAccessScope): Promise<AdminMemberDTO>;
    updateStatus(userId: string, status: 'pending' | 'active' | 'suspended', scope: AdminMemberAccessScope): Promise<UserDTO>;
    changeClass(userId: string, classId: string, scope: AdminMemberAccessScope): Promise<ClassMembershipDTO>;
    private buildMemberPayload;
    private groupByUser;
    private resolveScopedUserIds;
    private ensureMemberInScope;
    private isMemberInScope;
    private applyScopeToMemberPayload;
    private ensureClassChangeAllowed;
}
