import type { RoleAssignmentDTO } from '@gcuoba/types';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { CreateRoleAssignmentDto } from './dto/create-role-assignment.dto';
import { RoleAssignmentsService } from './role-assignments.service';
import { MembershipsService } from '../memberships/memberships.service';
export declare class RoleAssignmentsController {
    private readonly roleAssignmentsService;
    private readonly membershipsService;
    constructor(roleAssignmentsService: RoleAssignmentsService, membershipsService: MembershipsService);
    me(user: AuthenticatedUser): Promise<RoleAssignmentDTO[]>;
    listAssignments(user: AuthenticatedUser, userId?: string): Promise<RoleAssignmentDTO[]>;
    assignRole(user: AuthenticatedUser, dto: CreateRoleAssignmentDto): Promise<RoleAssignmentDTO>;
    private ensureWritableScope;
    private ensureTargetMemberInScope;
}
