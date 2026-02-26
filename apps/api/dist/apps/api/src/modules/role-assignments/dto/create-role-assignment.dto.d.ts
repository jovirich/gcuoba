export declare class CreateRoleAssignmentDto {
    userId: string;
    roleCode: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
}
