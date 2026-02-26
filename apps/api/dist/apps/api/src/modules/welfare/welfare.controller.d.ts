import { WelfareService } from './welfare.service';
import { CreateWelfareCaseDto } from './dto/create-welfare-case.dto';
import { RecordContributionDto } from './dto/record-contribution.dto';
import { RecordPayoutDto } from './dto/record-payout.dto';
import { ReviewWelfareEntryDto } from './dto/review-welfare-entry.dto';
import { UpdateWelfareCaseStatusDto } from './dto/update-welfare-case-status.dto';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
export declare class WelfareController {
    private readonly welfareService;
    constructor(welfareService: WelfareService);
    listCategories(user: AuthenticatedUser, scopeType?: string, scopeId?: string): Promise<import("@gcuoba/types").WelfareCategoryDTO[]>;
    listCases(user: AuthenticatedUser, scopeType?: string, scopeId?: string, includeClosed?: string): Promise<import("@gcuoba/types").WelfareCaseDTO[]>;
    createCase(dto: CreateWelfareCaseDto, user: AuthenticatedUser): Promise<import("@gcuoba/types").WelfareCaseDTO>;
    updateCaseStatus(user: AuthenticatedUser, caseId: string, dto: UpdateWelfareCaseStatusDto): Promise<import("@gcuoba/types").WelfareCaseDTO>;
    getCase(user: AuthenticatedUser, caseId: string): Promise<import("@gcuoba/types").WelfareCaseDetailDTO>;
    recordContribution(user: AuthenticatedUser, caseId: string, dto: RecordContributionDto): Promise<import("@gcuoba/types").WelfareContributionDTO>;
    recordPayout(user: AuthenticatedUser, caseId: string, dto: RecordPayoutDto): Promise<import("@gcuoba/types").WelfarePayoutDTO>;
    listQueue(user: AuthenticatedUser, scopeType?: string, scopeId?: string, status?: string): Promise<import("@gcuoba/types").WelfareQueueItemDTO[]>;
    approveContribution(user: AuthenticatedUser, contributionId: string, dto: ReviewWelfareEntryDto): Promise<import("@gcuoba/types").WelfareContributionDTO>;
    rejectContribution(user: AuthenticatedUser, contributionId: string, dto: ReviewWelfareEntryDto): Promise<import("@gcuoba/types").WelfareContributionDTO>;
    approvePayout(user: AuthenticatedUser, payoutId: string, dto: ReviewWelfareEntryDto): Promise<import("@gcuoba/types").WelfarePayoutDTO>;
    rejectPayout(user: AuthenticatedUser, payoutId: string, dto: ReviewWelfareEntryDto): Promise<import("@gcuoba/types").WelfarePayoutDTO>;
    private parseScopeType;
    private parseQueueStatus;
}
