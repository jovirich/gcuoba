import type { BranchMembershipDTO, ClassMembershipDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { RequestBranchMembershipDto } from './dto/request-branch-membership.dto';
import { UpdateClassMembershipDto } from './dto/update-class-membership.dto';
import { BranchMembership } from './schemas/branch-membership.schema';
import { ClassMembership } from './schemas/class-membership.schema';
export declare class MembershipsService {
    private readonly branchModel;
    private readonly classModel;
    constructor(branchModel: Model<BranchMembership>, classModel: Model<ClassMembership>);
    listBranchMemberships(userId: string): Promise<BranchMembershipDTO[]>;
    getClassMembership(userId: string): Promise<ClassMembershipDTO | null>;
    requestBranchMembership(userId: string, payload: RequestBranchMembershipDto): Promise<BranchMembershipDTO>;
    updateClassMembership(userId: string, payload: UpdateClassMembershipDto): Promise<ClassMembershipDTO>;
    private toBranchDto;
    private toClassDto;
    listUserIdsByClass(classId: string): Promise<string[]>;
    listApprovedUserIdsByBranch(branchId: string): Promise<string[]>;
    hasClassMembership(userId: string): Promise<boolean>;
    hasApprovedBranchMembership(userId: string): Promise<boolean>;
    ensureApprovedBranchMembership(userId: string, branchId: string, approvedBy?: string): Promise<BranchMembershipDTO>;
    listAllBranchMemberships(): Promise<BranchMembershipDTO[]>;
    listAllClassMemberships(): Promise<ClassMembershipDTO[]>;
}
