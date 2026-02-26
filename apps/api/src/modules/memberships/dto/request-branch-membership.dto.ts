import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestBranchMembershipDto {
    @IsString()
    branchId!: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    note?: string;
}
