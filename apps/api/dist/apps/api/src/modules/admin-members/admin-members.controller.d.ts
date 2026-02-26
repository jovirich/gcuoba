import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { AdminMembersService } from './admin-members.service';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';
import { UpdateMemberClassDto } from './dto/update-member-class.dto';
export declare class AdminMembersController {
    private readonly adminMembersService;
    private readonly roleAssignmentsService;
    constructor(adminMembersService: AdminMembersService, roleAssignmentsService: RoleAssignmentsService);
    list(user: AuthenticatedUser, scopeType?: 'global' | 'branch' | 'class', scopeId?: string): Promise<import("@gcuoba/types").AdminMemberDTO[]>;
    find(userId: string, user: AuthenticatedUser, scopeType?: 'global' | 'branch' | 'class', scopeId?: string): Promise<import("@gcuoba/types").AdminMemberDTO>;
    updateStatus(userId: string, payload: UpdateMemberStatusDto, user: AuthenticatedUser, scopeType?: 'global' | 'branch' | 'class', scopeId?: string): Promise<import("@gcuoba/types").UserDTO>;
    changeClass(userId: string, payload: UpdateMemberClassDto, user: AuthenticatedUser, scopeType?: 'global' | 'branch' | 'class', scopeId?: string): Promise<import("@gcuoba/types").ClassMembershipDTO>;
    private resolveAccessScope;
}
