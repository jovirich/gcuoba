import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class RecordHandoverDto {
    @IsMongoId()
    branchId!: string;

    @IsMongoId()
    roleId!: string;

    @IsMongoId()
    userId!: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;
}
