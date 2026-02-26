import type { BranchExecutiveSummaryDTO, BranchMembershipDTO } from '@gcuoba/types';
import { BranchExecutiveService } from './branch-executive.service';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RecordHandoverDto } from './dto/record-handover.dto';
declare class MembershipDecisionDto {
    note?: string;
}
export declare class BranchExecutiveController {
    private readonly branchExecutiveService;
    constructor(branchExecutiveService: BranchExecutiveService);
    summary(userId: string, user: AuthenticatedUser): Promise<BranchExecutiveSummaryDTO>;
    approve(userId: string, membershipId: string, body: MembershipDecisionDto, user: AuthenticatedUser): Promise<BranchMembershipDTO>;
    reject(userId: string, membershipId: string, body: MembershipDecisionDto, user: AuthenticatedUser): Promise<BranchMembershipDTO>;
    handover(userId: string, body: RecordHandoverDto, user: AuthenticatedUser): Promise<void>;
    private ensureActor;
}
export {};
