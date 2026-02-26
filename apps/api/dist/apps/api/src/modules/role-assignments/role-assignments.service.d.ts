import type { RoleAssignmentDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { RoleAssignment } from './schemas/role-assignment.schema';
import { Role } from '../roles/schemas/role.schema';
import { User } from '../users/schemas/user.schema';
export declare class RoleAssignmentsService {
    private readonly assignmentModel;
    private readonly roleModel;
    private readonly userModel;
    constructor(assignmentModel: Model<RoleAssignment>, roleModel: Model<Role>, userModel: Model<User>);
    ensureGlobalAdminForUser(userId: string): Promise<void>;
    activeAssignmentsForUser(userId: string): Promise<RoleAssignmentDTO[]>;
    managedBranchIds(userId: string): Promise<string[]>;
    managedClassIds(userId: string): Promise<string[]>;
    hasGlobalAccess(userId: string): Promise<boolean>;
    hasAnyActiveAssignment(userId: string): Promise<boolean>;
    listGlobalUserIds(): Promise<string[]>;
    listBranchExecutiveUserIds(branchId: string): Promise<string[]>;
    listClassExecutiveUserIds(classId: string): Promise<string[]>;
    listActiveAssignments(): Promise<RoleAssignmentDTO[]>;
    createRoleAssignment(dto: {
        userId: string;
        roleCode: string;
        scopeType: 'global' | 'branch' | 'class';
        scopeId?: string | null;
    }): Promise<RoleAssignmentDTO>;
    private toDto;
}
