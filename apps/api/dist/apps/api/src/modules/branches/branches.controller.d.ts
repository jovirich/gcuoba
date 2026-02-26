import type { BranchDTO } from '@gcuoba/types';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
export declare class BranchesController {
    private readonly branchesService;
    private readonly roleAssignmentsService;
    constructor(branchesService: BranchesService, roleAssignmentsService: RoleAssignmentsService);
    findAll(): Promise<BranchDTO[]>;
    create(dto: CreateBranchDto, user: AuthenticatedUser): Promise<BranchDTO>;
    update(id: string, dto: UpdateBranchDto, user: AuthenticatedUser): Promise<BranchDTO>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        success: boolean;
    }>;
    private ensureGlobal;
}
