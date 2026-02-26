import type { BranchMembershipDTO, ClassMembershipDTO } from '@gcuoba/types';
import { MembershipsService } from './memberships.service';
import { RequestBranchMembershipDto } from './dto/request-branch-membership.dto';
import { UpdateClassMembershipDto } from './dto/update-class-membership.dto';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
export declare class MembershipsController {
    private readonly membershipsService;
    constructor(membershipsService: MembershipsService);
    listBranchMemberships(userId: string, user: AuthenticatedUser): Promise<BranchMembershipDTO[]>;
    requestBranchMembership(userId: string, payload: RequestBranchMembershipDto, user: AuthenticatedUser): Promise<BranchMembershipDTO>;
    getClassMembership(userId: string, user: AuthenticatedUser): Promise<ClassMembershipDTO | null>;
    updateClassMembership(userId: string, payload: UpdateClassMembershipDto, user: AuthenticatedUser): Promise<ClassMembershipDTO>;
    private ensureSelf;
}
